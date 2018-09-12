var path = require('path')
var config = require('./config.json')
var express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser');
var app = express()
var util = require('./util/util');
var request = require('request')
var http = require('http');
var https = require('https');
var tools = require('./tools/tools.js')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({secret: 'secret', resave: 'false', saveUninitialized: 'false'}))

// Initial view - loads Connect To QuickBooks Button
app.get('/', function (req, res) {
  res.render('home', config)
})
app.get('/postreq', function (req, res) {
  var url = "https://api.xooa.com/api/" + config.xooaAppId + "/invoke/saveNewEvent"
  console.log('Making API call to: ' + url)
  var jsonObj = { 'args': ['24124214', 'Customer', url, 'hjkj'] }
  var requestObj1 = {
    url: url,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.xooaAccessToken,
      'Accept': 'application/json'
    },
    body: jsonObj,
    json: true
  }
  request.post(requestObj1, function (err, response) {
    if (err || response.statusCode != 200) {
      return res.json({ error: err, statusCode: response.statusCode })
    }
    res.json(response.body)
  });
});

app.get('/getDetails', async (req, res) => {
  realmId = "123146090863369"
  var token = await tools.getToken(realmId);

  if (!token) return res.json({ error: 'Not authorized' })
  // Set up API call (with OAuth2 accessToken)
  var url = config.api_uri + realmId + '/customer/1'
  console.log('Making API call to: ' + url)
  var requestObj = {
    url: url,
    headers: {
      'Authorization': 'Bearer ' + token.accessToken,
      'Accept': 'application/json'
    }
  }

  // Make API call to fetch entity details
  request(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, requestObj, err, response).then(function ({ err, response }) {
      if (err || response.statusCode != 200) {
        return res.json({ error: err, statusCode: response.statusCode })
      }

      // API Call was a success!
      var event = JSON.parse(response.body)
      res.json(event)
    }, function (err) {
      console.log(err)
      return res.json(err)
    })
  })
})

app.post('/webhooks', async (req, res) => {
  console.log("Post request received in webhooks");

  var payload = JSON.stringify(req.body);
  var signature = req.get('intuit-signature')

  // if signature is empty return 401
  if (!signature) {
    return res.status(401).send('FORBIDDEN');
  }
  console.log(req.body);
  // if payload is empty, don't do anything
  if (!payload) {
    return res.status(200).send('Empty payload is received');
  }

  // validate signature
  if (util.isValidPayload(signature, payload)) {
    event = req.body
    var realmId = event.eventNotifications[0].realmId
    req.session.realmId = realmId
    var token = await tools.getToken(realmId)
    if (!token)
      return res.json({ error: 'Not authorized' })
    event.eventNotifications[0].dataChangeEvent.entities.forEach(entity => {

      var url = config.api_uri + realmId + '/' + entity.name.toLowerCase() + '/' + entity.id
      console.log('Making API call to: ' + url)
      var requestObj = {
        url: url,
        headers: {
          'Authorization': 'Bearer ' + token.accessToken,
          'Accept': 'application/json'
        }
      }

      // Make API call
      request(requestObj, function (err, response) {
        // Check if 401 response was returned - refresh tokens if so!
        // console.log("data to log1: ", response)
        tools.checkForUnauthorized(req, requestObj, err, response).then(function ({ err, response }) {
          if (err || response.statusCode != 200) {
            console.log("Error occured while checking for unauthorized: "+ err)
          } else {
            // Make API call to Xooa to log event
            var url = "https://api.xooa.com/api/" + config.xooaAppId + "/invoke/saveNewEvent"
            console.log('Making API call to: ', url)
            console.log("data to log: ",response.body)

            var jsonObj = { 'args': [realmId, entity.name, entity.id, response.body] }
            var requestObj = {
              url: url,
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + config.xooaAccessToken,
                'Accept': 'application/json'
              },
              body: jsonObj,
              json: true
            }
            request.post(requestObj, function (err, response1) {
              if (err || response1.statusCode != 200) {
                console.log("Error occured while logging to Xooa: " + err)
              } else {
                console.log(response1.body)
                console.log("Successfully logged in Xooa for realmid: " + realmId + ", entity: " + entity.name + " and id: " + entity.id)
              }
            });
          }
        });
      });
    });
    return res.status(200).send('success');
  } else {
    console.log("FORBIDDEN");
    return res.status(401).send('FORBIDDEN');
  }

});
// Sign In With Intuit, Connect To QuickBooks, or Get App Now
// These calls will redirect to Intuit's authorization flow
app.use('/sign_in_with_intuit', require('./routes/sign_in_with_intuit.js'))
app.use('/connect_to_quickbooks', require('./routes/connect_to_quickbooks.js'))
app.use('/connect_handler', require('./routes/connect_handler.js'))

// Callback - called via redirect_uri after authorization
app.use('/callback', require('./routes/callback.js'))

// Connected - call OpenID and render connected view
app.use('/connected', require('./routes/connected.js'))

// Call an example API over OAuth2
app.use('/api_call', require('./routes/api_call.js'))


// Start server on HTTP (will use ngrok for HTTPS forwarding)
var httpServer = http.createServer(app);
var httpsServer = https.createServer(app);
httpServer.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!')
})
