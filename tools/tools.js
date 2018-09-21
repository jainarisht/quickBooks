var Tokens = require('csrf')
var csrf = new Tokens()
var ClientOAuth2 = require('client-oauth2')
var request = require('request')
var config = require('../config.json')
var fs = require('fs');
var aws = require('aws-sdk');
const s3 = new aws.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  // region: 'us-east-1'
});

var Tools = function () {
  var tools = this;

  var authConfig = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri
  }

  this.basicAuth = require('btoa')(authConfig.clientId + ':' + authConfig.clientSecret)

  // Use a local copy for startup.  This will be updated in refreshEndpoints() to call:
  // https://developer.api.intuit.com/.well-known/openid_configuration/
  this.openid_configuration = require('./openid_configuration.json')

  // Should be called at app start & scheduled to run once a day
  // Get the latest OAuth/OpenID endpoints from Intuit
  this.refreshEndpoints = function () {
    request({
      // Change this to Sandbox or non-sandbox in `config.json`
      // Non-sandbox: https://developer.api.intuit.com/.well-known/openid_configuration/
      // Sandbox: https://developer.api.intuit.com/.well-known/openid_sandbox_configuration/
      url: config.configurationEndpoint,
      headers: {
        'Accept': 'application/json'
      }

    }, function (err, response) {
      if (err) {
        console.log(err)
        return err
      }

      // Update endpoints
      var json = JSON.parse(response.body)
      tools.openid_configuration = json
      tools.openid_uri = json.userinfo_endpoint
      tools.revoke_uri = json.revocation_endpoint

      // Re-create OAuth2 Client
      authConfig.authorizationUri = json.authorization_endpoint
      authConfig.accessTokenUri = json.token_endpoint
      tools.intuitAuth = new ClientOAuth2(authConfig)
    })
  }

  // Should be used to check for 401 response when making an API call.  If a 401
  // response is received, refresh tokens should be used to get a new access token,
  // and the API call should be tried again.
  this.checkForUnauthorized = function (req, requestObj, err, response) {
    return new Promise(function (resolve, reject) {
      if (response.statusCode == 401) {
        console.log('Received a 401 response!  Trying to refresh tokens.')

        // Refresh the tokens
        tools.refreshTokens(req.session).then(function (newToken) {
          // Try API call again, with new accessToken
          requestObj.headers.Authorization = 'Bearer ' + newToken.accessToken
          console.log('Trying again, making API call to: ' + requestObj.url)
          request(requestObj, function (err, response) {
            // Logic (including error checking) should be continued with new
            // err/response objects.
            resolve({ err, response })
          })
        }, function (err) {
          // Error refreshing the tokens
          reject(err)
        })
          .catch(function (err) {
            reject(err)
          });
      } else {
        // No 401, continue!
        resolve({ err, response })
      }
    })
  }

  // Refresh Token should be called if access token expires, or if Intuit
  // returns a 401 Unauthorized.
  this.refreshTokens = async (session) => {
    var token = await this.getToken(session.realmId)

    // Call refresh API
    return token.refresh().then(function (newToken) {
      // Store the new tokens
      tools.saveToken(session, newToken)
      return newToken
    })
  }

  this.setScopes = function (flowName) {
    authConfig.scopes = config.scopes[flowName]
    tools.intuitAuth = new ClientOAuth2(authConfig)
  }

  this.containsOpenId = function () {
    if (!authConfig.scopes) return false;
    return authConfig.scopes.includes('openid')
  }

  // Setup OAuth2 Client with values from config.json
  this.intuitAuth = new ClientOAuth2(authConfig)

  // Get anti-forgery token to use for state
  this.generateAntiForgery = function (session) {
    session.secret = csrf.secretSync()
    return csrf.create(session.secret)
  }

  this.verifyAntiForgery = function (session, token) {
    return csrf.verify(session.secret, token)
  }

  this.clearToken = function (session) {
    session.accessToken = null
    session.refreshToken = null
    session.tokenType = null
    session.data = null
  }

  // Save token into session storage
  // In a real use-case, this is where tokens would have to be persisted (to a
  // a SQL DB, for example).  Both access tokens and refresh tokens need to be
  // persisted.  This should typically be stored against a user / realm ID, as well.
  this.saveToken = function (session, token) {
    const params = {
      Bucket: 'quickbooks-heroku',
      Key: session.realmId + '.txt',
      Body: JSON.stringify(token.data)
    };
    s3.upload(params, function (err, data) {
      console.log(err, data);
    });
    // fs.writeFile('token/' + session.realmId + '.txt', JSON.stringify(token.data), function (err) {
    //   if (err) throw err;
    //   console.log('Saved!');
    // });
  }

  // Get the token object from session storage
  this.getToken = (realmId) => new Promise((resolve, reject) => {
    const params = {
      Bucket: 'quickbooks-heroku',
      Key: realmId + '.txt'
    }
    s3.getObject(params, function(err, content){
      const data = JSON.parse(content.Body.toString('utf-8'));
      const token = tools.intuitAuth.createToken(
        data.access_token, data.refresh_token, data.token_type, data.token_data
      );
      resolve(token);
    })
    // fs.readFile('token/' + realmId + '.txt', (err, content) => {
    //   const data = JSON.parse(content);
    //   const token = tools.intuitAuth.createToken(
    //     data.access_token, data.refresh_token, data.token_type, data.token_data
    //   );
    //   resolve(token);
    // })
  })


  this.refreshEndpoints();
}

module.exports = new Tools();
