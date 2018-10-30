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
// get id of user logged in


router.get('/getApps/:appId', async (req, res) => {

    console.log("type: ", req.params.type);

    // function to get already deployed apps from Xooa blockchain
    await tools.xooaGet("accessApps", args, "admin");

    return res.json({
        apps: [
            {
                id: 1,
                name: "App1",
                identity: "iden1",
                Oauth: "kjfbdsjhdnkldsm"
            },
            {
                id: 2,
                name: "App2",
                identity: "iden2",
                Oauth: "ldopwkdondbjskn"
            }
        ]
    })
});

router.post('/create', async (req,res) => {
    // function to create entry of new app in Xooa blockchain


    console.log(req.params.chaincode);
    console.log(req.params.identity);
    var id = 1;
    return res.json({
        id: id
    })
})

router.post('/addOauth', async (req, res) => {

    console.log("realmId: ",req.params.id)
    var args = new Array(req.params.id);
    // function to update entry of app in Xooa blockchain to enter Oauth token w.r.t realm ID
    // var message = await tools.xooaPost("saveNewApp", args, "admin");
    var message = "Success";
    return res.send(message)
})

router.get('/delete', async (req, res) =>{

    console.log("realmId: ",req.params.id)
    var args = new Array(req.params.id);
    // function to delete entry of app in Xooa blockchain
    // var message = await tools.xooaPost("deleteApp", args, "admin");
    var message = "Success";
    return res.send(message);
})

module.exports = router