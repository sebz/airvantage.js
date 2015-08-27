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
    airvantage.authenticate(accessToken)
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

## Available methods

### querySystems
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### queryGateways
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### querySusbscriptions
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### queryApplications
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createSystems
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createGateways
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createSusbscriptions
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### createApplications
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

### editApplicationCommunication
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### editApplicationData
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.


