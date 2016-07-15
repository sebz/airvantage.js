AirVantage.js
========

> Nodejs AirVantage API client

Full AirVantage API documentation: https://doc.airvantage.net/av/reference/cloud/API/


## Install

:warning: **Node.js 4 or higher is required for airvantage@3 and above.** For older Node.js versions use airvantage@2.

```
$ npm install --save airvantage
```


## Usage

```javascript

const AirVantage = require("airvantage");

const config = {
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
    credentials: {
        client_id: "YOUR_CLIENT_ID",
        client_secret: "YOUR_CLIENT_SECRET",
        username: "you@domain.com",
        password: "yOuRs3cR3t!"
    }
};

const airvantage = new AirVantage(config);

airvantage
    .authenticate()
    .then(() => airvantage.querySystems({ labels: ["demo"] }))
    .then(systems => console.log("All demo systems:", systems));
```

You may already have an `access_token` and want to use it:

```javascript

const AirVantage = require("airvantage");
const airvantage = new AirVantage({
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
});

function querySystems(accessToken) {
    airvantage
        .authenticate({token: accessToken})
        .then(() => airvantage.querySystems({ labels: ["demo"] }))
        .then(systems => console.log("All demo systems:", systems));
}
```

OR you may want to authentication multiple users with a single AirVantage instance

```javascript

const AirVantage = require("airvantage");
const airvantage = new AirVantage({
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
});

function authenticate(username, password) {
    airvantage
        .authenticate({username: username, password: password})
        .then(token => storeToken(username, token));
}
```

## Available methods
## Systems

* *querySystems*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *getDetailsSystem*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *createSystem*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *editSystem*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *deleteSystem(uid)*
    * uid
        * *Required*
        * Type: `string`

* *deleteSystems(options)*
    * options
        * Type: `object`
        ```javascript
        {
            "selection" : {
                "label": "aLabel",
                // Or
                "uids" : ["uid1", ...]
            },
            "deleteGateway": false | true,
            "deleteSubscriptions": false | true
        }
        ```

* *activateSystems*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *suspendSystems*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *resumeSystems*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *terminateSystems*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *queryMultiRawDataPoints*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

## Gateways
* *queryGateways*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *getDetailsGateway*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *createGateway*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *editGateway*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *deleteGateway(uid)*
    * uid
        * *Required*
        * Type: `string`

* *deleteGateways(options)*
    * options
        * Type: `object`
        ```javascript
        {
            "selection" : {
                "label": "aLabel",
                // Or
                "uids" : ["uid1", ...]
            }
        }
        ```

## Subscriptions
* *querySusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *getDetailsSubscription*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *createSusbscription*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *editSusbscription*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *deleteSusbscription(uid)*
    * uid
        * *Required*
        * Type: `string`

* *deleteSusbscription(options)*
    * options
        * Type: `object`
        ```javascript
        {
            "selection" : {
                "label": "aLabel",
                // Or
                "uids" : ["uid1", ...]
            }
        }
        ```

* *activateSusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *synchronizeSusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *suspendSusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *restoreSusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* *terminateSusbscriptions*
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.


## Applications

* queryApplications
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* getDetailsApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* createApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* editApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* editApplicationCommunication(uid, data)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* editApplicationData(uid, data)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* releaseApplication(filePath)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* publishApplication(uid)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* deleteApplication(uid)
    * uid
        * *Required*
        * Type: `string`

* deleteApplications(options)
    * options
        * Type: `object`
        ```javascript
        {
            "selection" : {
                "label": "aLabel",
                // Or
                "uids" : ["uid1", ...]
            }
        }
        ```

## Operations
* queryOperations
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

* getDetailsOperation
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

## Misc

* currentUser
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.
