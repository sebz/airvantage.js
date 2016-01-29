AirVantage.js
========

> Nodejs AirVantage API client

Full AirVantage API documentation: https://doc.airvantage.net/av/reference/cloud/API/


## Install

```
$ npm install --save airvantage
```


## Usage

```javascript

var AirVantage = require("airvantage");

var config = {
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
    credentials: {
        client_id: "YOUR_CLIENT_ID",
        client_secret: "YOUR_CLIENT_SECRET",
        username: "you@domain.com",
        password: "yOuRs3cR3t!"
    }
};

var airvantage = new AirVantage(config);

airvantage.authenticate()
    .then(function() {
        return airvantage.querySystems({
            labels: ["demo"]
        })
    })
    .then(function(systems) {
        console.log("All demo systems:", systems);
    });

```

You may already have an `access_token` and want to use it:

```javascript

var AirVantage = require("airvantage");
var airvantage = new AirVantage({
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
});

function querySystems(accessToken) {
    airvantage.authenticate({token: accessToken})
        .then(function() {
            return airvantage.querySystems({
                labels: ["demo"]
            })
        })
        .then(function(systems) {
            console.log("All demo systems:", systems);
        });
}
```

OR you may want to authentication multiple users with a single AirVantage instance

```javascript

var AirVantage = require("airvantage");
var airvantage = new AirVantage({
    serverUrl: "https://eu.airvantage.net", // or https://na.airvantage.net
});

function authenticate(username, password) {
    airvantage.authenticate({username: username, password: password})
        .then(function(token) {
            storeToken(username, token);
        });
}
```

## Available methods

### querySystems
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### queryGateways
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### querySusbscriptions
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### queryApplications
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### queryOperations
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createSystem
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createGateway
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createSusbscription
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editSystem
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editGateway
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editSusbscription
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### getDetailsSystem
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### getDetailsGateway
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### getDetailsSubscription
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### getDetailsApplication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### getDetailsOperation
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### deleteSystem(uid)
#### uid
* *Required*
* Type: `string`

### deleteSystems(options)
#### options
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

### deleteGateway(uid)
#### uid
* *Required*
* Type: `string`

### deleteGateways(options)
#### options
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

### deleteSusbscription(uid)
#### uid
* *Required*
* Type: `string`

### deleteSusbscription(options)
#### options
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

### deleteApplication(uid)
#### uid
* *Required*
* Type: `string`

### deleteApplications(options)
#### options
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

### editApplicationCommunication(uid, data)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editApplicationData(uid, data)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### activateSystem
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### releaseApplication(filePath)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### publishApplication(uid)
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### currentUser
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.
