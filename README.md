
This page provides a step-by-step tutorial to deploy a sample app with Xooa's blockchain-as-a-service (BaaS).

# Overview

This repository contains the blockchain smart contract (henceforth smart contract). You will deploy the smart contract via the Xooa dashboard.

Using Xooa, you can provide a permanent cloud end-point for a smart contract, enabling cloud-to-cloud integration while maintaining the peer-to-peer capabilities of blockchain.

## Deploy the smart contract

 
1. Log in to Xooa.

2. Navigate to **Apps**, then **Deploy New**.

3. Search for the Github repository you want to use for deployment. For example, type **Xooa/samples** to deploy one of the sample provided by Xooa, and click **Select**, and then **Next**.

4. Select the Smart Contract you want to deploy, and then click **Deploy**.

5. Relax:  Xooa is doing the blockchain heavy lifting. You will be redirected to app dashboard when the deployment completes.

6.  Navigate to **Identities** tab, click **Show API Token**.

7. Copy and store the **API Token** values. You need this to authorize API requests.

___


## Navigate through the Xooa dashboard 

1. Navigate to **Details** tab. You can find the details about your app here.

2.  Navigate to **Identities** tab. You can manage identities in this tab. You can create or delete an identity. You can specify access rights to different identities controlling the access of endpoints for your smart contract.

3. Navigate to **Activities** tab. You can see the history of your activities regarding your app deployed on Xooa dashboard.

4. Navigate to **Logs** tab. You can view logs from your smart contract happened in the last 10 minutes.

5. Navigate to **Manage** tab. You can delete your app or upgrade to new code in the github repo from here.

___

## Explore the end-points for the smart Contract

1. Navigate to **Details** tab, click **Explore API's**.

2. Enter **API Token** in the field in navigation pane.

3. Navigate to **Smart Contract > Invoke Smart Contract Function** from the navigation pane.

4. In the **body** field, enter the data in the format expected by the smart contract. 
For example, if using this repo **get-set** smart contract to store data in blockchain ledger using the **set** function, the body should be entered as: 

    `{ "args": [ "<key>", "<value>" ] }`

5. Click on **try**.
 * A response code of **200** indicates successful function call of the smart contract.
 * A response code of **202** indicates that your request is queued for processing. Final processing outcome may be obtained through **Result** end point by using **resultId** obtained in **response body**.
 * A response code of **400** indicates that you have a malformed request. Check the **body** field again.
 * A response code of **401** indicates that either you forgot to enter API token you have entered invalid API token.

6. Congrats! You have saved the first data in the blockchain using **XOOA**.

7. To view your transaction as part of the blockchain, navigate to **Ledger** from your Xooa dashboard.

8. Navigate to **Transactions** tab.

9. You can expand the data field to see your transactions.