var Tokens = require('csrf')
var csrf = new Tokens()
var ClientOAuth2 = require('client-oauth2')
var request = require('request')
var config = require('../config.json')
var rp = require('request-promise');

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

  // Save token into Xooa blockchain to be persisted for later use.
  this.saveToken = async (session, token) => {
    try {
      // Make API invoke call to Xooa chaincode to log event
      var uri = "https://api.xooa.com/api/" + config.xooaAppId + "/invoke/saveNewOauth2"
      console.log('Making API call to: ', uri)
      
      var jsonObj = { 'args': [session.realmId, token.data] }
      var requestObj1 = {
        uri: uri,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + config.xooaAccessToken,
          'Accept': 'application/json'
        },
        body: jsonObj,
        json: true,
        resolveWithFullResponse: true
      }
      console.log("data to log: ", requestObj1)
      const response = await rp(requestObj1)
      if (response.statusCode < 200 || response.statusCode >= 300) {
        console.log("Error occured while logging to Xooa")
      } else if (response.statusCode == 202) {
        let requestCount = 5
        let sleepTime = 3000
        let i = 0
        let statusCode = 404
        while (i < requestCount && statusCode == 404) {
          await sleep(sleepTime);
          try {
            // Making a get request to results api to get the latest status of transaction
            let options = {
              uri: `https://api.xooa.com/api/${config.xooaAppId}/results/${response.body.resultId}`,
              method: 'GET',
              headers: {
                'Authorization': 'Bearer ' + config.xooaAccessToken,
                'Accept': 'application/json'
              },
              json: true,
              resolveWithFullResponse: true
            }

            const response2 = await rp(options)
            statusCode = response2.statusCode
            if (response2.statusCode == 200) {
              // Successfully logged to xooa blockchain after returning 202 initially
              console.log(response2.body)
              console.log("Oauth2 successfully logged in Xooa for realmid: " + session.realmId)
            } else {
              console.log("Failed to log Oauth2 into Xooa chaincode.")
            }
          } catch (err) {
            if (err.statusCode == 404) {
              i++
              console.log("Going to call results API again to check for transaction status")
              continue;
            } else {
              // Unable to log to Xooa blockchain
              console.log("Logging Oauth2 failed for Xooa blockchain")
              break;
            }
          }
        }
      } else {
        // Smoothly logged to xooa blockchain
        console.log(response.body)
        console.log("Oauth2 successfully logged in Xooa effortlessly for realmid: " + session.realmId)
      }
    } catch (err) {
      // Unable to log to Xooa blockchain
      console.log("Error occured while logging Oauth2 to xooa: " + err)
    }
  }

  // Get the token object from session storage
  this.getToken = async (realmId) => {
    try {
      // Make API invoke call to Xooa chaincode to log event
      var uri = "https://api.xooa.com/api/" + config.xooaAppId + "/query/getOauth2?args=%5B%22" + realmId + "%22%5D"
      console.log('Making API call to: ', uri)
      var requestObj1 = {
        uri: uri,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + config.xooaAccessToken,
          'Accept': 'application/json'
        },
        json: true,
        resolveWithFullResponse: true
      }
      const response = await rp(requestObj1)
      if (response.statusCode < 200 || response.statusCode >= 300) {
        console.log("Error occured while accessing Ouath2 from Xooa")
        // reject("Error occured while logging to Xooa")
      } else {
        console.log(response.body)
        const data = response.body;
        const token = tools.intuitAuth.createToken(
          data.access_token, data.refresh_token, data.token_type, data.token_data
          );
        return token;
      }
    } catch (err) {
      // Unable to log to Xooa blockchain
      console.log("Error occured while accessing Ouath2 from xooa: " + err)
    }
  }


  this.refreshEndpoints();
}

module.exports = new Tools();
