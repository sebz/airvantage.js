AirVantage.js
========

> Nodejs AirVantage API client

Full AirVantage API documentation: https://doc.airvantage.net/av/reference/cloud/API/

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
    .then(function(){
        return airvantage.querySystems({
                labels : ["demo"]
            })
    })
    .then(function(systems){
        console.log("All demo systems:", systems);
    });

```

## Available methods
> See https://doc.airvantage.net/av/reference/cloud/API/ for the methods arguments.

### querySystems
### queryGateways
### querySusbscriptions
### queryApplications
### createSystems
### createGateways
### createSusbscriptions
### createApplications
### deleteSystem
### deleteGateway
### deleteSusbscription
### deleteApplication
### editApplicationCommunication
### editApplicationData


