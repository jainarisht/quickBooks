/**
 *  Xooa QuickBooks app
 *
 *  Copyright 2018 Xooa
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 * 
 *  Author: Arisht Jain
 *  Last Modified: 25/09/2018
 */

var tools = require('../tools/tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
// get id of user logged in.

router.get('/', async (req, res) => {
    // function to get all chaincodes of user


    return res.json({
        chaincodes: ["a","b","c"]
    })


    if (!req.session.realmId) return res.json({
        error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
    })
    var token = await tools.getToken(req.session.realmId)
    console.log(token)
    if (!token) return res.json({ error: 'Not authorized' })
    // Set up API call (with OAuth2 accessToken)
    var url = config.api_uri + req.session.realmId + '/companyinfo/' + req.session.realmId
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
        tools.checkForUnauthorized(req, requestObj, err, response).then(function ({ err, response }) {
            if (err || response.statusCode != 200) {
                return res.json({ error: err, statusCode: response.statusCode })
            }

            // API Call was a success!
            res.json(JSON.parse(response.body))
        }, function (err) {
            console.log(err)
            return res.json(err)
        })
    })
})


router.get('/identities/:chaincode', async (req, res) => {
    // function to get identities of selected chaincode from Xooa platform


    console.log(req.params.chaincode)
    return res.json({
        identities: ["APIToken1","APIToken2","APIToken3"]
    })


    var token = await tools.getToken(req.session.realmId)
    if (!token) return res.json({ error: 'Not authorized' })

    var url = tools.revoke_uri
    request({
        url: url,
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + tools.basicAuth,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': token.accessToken
        })
    }, function (err, response, body) {
        if (err || response.statusCode != 200) {
            return res.json({ error: err, statusCode: response.statusCode })
        }
        tools.clearToken(req.session)
        res.json({ response: "Revoke successful" })
    })
})

module.exports = router
