
This page provides a step-by-step tutorial to integrate a Quickbooks app with xooa's blockchain-as-a-service (BaaS).

The repository used in this example is <https://github.com/Xooa/integrations>

# Overview

This repository contains the blockchain chaincode (henceforth chaincode) and the QuickBooks app. You will deploy the chaincode via the xooa console.

Using xooa, you can provide a permanent cloud end-point for QuickBooks, enabling cloud-to-cloud integration while maintaining the peer-to-peer capabilities of blockchain.

## Deploy the QuickBooks chaincode 

 
1. Log in or create a xooa account at <https://xooa.com/blockchain>

2. Click **apps**, then **Deploy New**. 
If this is your first time deploying a chaincode app with xooa, you will need to authorize xooa with your GitHub account.

    a. Click **Connect to GitHub**.

    b. Follow the onscreen instructions to complete the authorization process.

1. Search for the **integrations** repo (or your fork).

2. Select the repo, and then click **Next**. 

3. Enter a name and description for your app.

4. Select the branch (usually **master**) and **quickBooks** as the chaincode, and then click **Deploy**.

5. Relax:  xooa is doing the blockchain heavy lifting. You will be redirected to app dashboard when the deployment completes.

6.  On the **Identities** tab, click **Show API Token**.

7. Copy and store the **App ID** and **API Token** values. You need these to authorize API requests in your **Zap**.

___

## Set up the QuickBooks app

1. [Log in](https://developer.intuit.com/) to developer portal of quickbooks with your quickBooks credentials or sign up for a new account if you are a new user.

2. Go to **My Apps** section from the menu bar.

3. Click **Create new app**. Click **Select APIs**.

4. Select **Accounting**. Click **Create app**.

5. Go to **Keys** tab. Copy and store the Client ID and Client Secret values of your app. You will need these while configuring your application.

6. Click **Add URI** in the **Redirect URIs** section. Enter the URL where you are going to host your quickBooks app followed by `/callback`. Click **Save**.

7. Go to **Webhooks** tab. In the **Development Webhooks** section, in the **Endpoint URL** field, enter the URL where you are going to host your quickBooks app followed by `/webhooks`. Click **Save**.

8. Click on **show token**. Copy it and store its value. You will need this while configuring your application.

1. Clone the sample application, deploy it to a server and load its node project modules, execute the following commands in your terminal:
	`git clone https://github.com/Xooa/integrations.git`

    `cd integrations/quickbooks`
    
	`npm install`

2. Open config.json to change the following values:
	* **clientID**: Use the value from **Keys** section of QuickBooks developer dashboard
	* **clientSecret**: Use the value from **Keys** section of QuickBooks developer dashboard
	* **redirectUri**: Use the value from **Keys** section of QuickBooks developer dashboard
	* **xooaAppId**: Use the value from **Identities** section of Xooa dashboard
	* **xooaAccessToken**: Use the value from **Identities** section of Xooa dashboard
	* **config.webhooksverifier**: Use the value from **Webhooks** section of QuickBooks developer dashboard

3. Run `npm start` in the console to start the node app.

___

## Generate auth2 token

1. Go to the homepage of your app. Click **Connect to QuickBooks**.

2. Select the company you want to configure and invoke updates to *Xooa chaincode*.

3. Click **Connect**.

4. The app is now configured and ready to receive any CRUD operation and logs to *Xooa blockchain*.