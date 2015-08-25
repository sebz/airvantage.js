var AirVantage = require("../lib/airvantage");
var config = require("./config.js");
var _ = require("lodash");

var applicationUid = "";
// Used to label the resources created for this simulation
var label = "airvantage.js";

var airvantage = new AirVantage(config);
var airvantage2 = new AirVantage({
    serverUrl: config.serverUrl
});
var firstToken = "";

airvantage.authenticate()
    .then(function(token) {
        console.log("Got token:", token);
        firstToken = token;
    })
    .then(createApplication)
    .then(editCommunication)
    .then(editData)
    .then(createSystem)
    .then(cleanResources)
    .then(testBypassAuthentication)
    .catch(function(error) {
        console.error("# ERROR:", error.response.body);
    });

/**
 * Use a second AirVantage instance using first one's token
 */
function testBypassAuthentication() {
    return airvantage2.authenticate(firstToken)
        .then(function(token) {
            console.log("Is first token used? ", token === firstToken ? true : false);
        })
        .then(function() {
            return airvantage2.querySystems();
        })
        .then(function(systems) {
            console.log("Found", systems.length, "systems with AirVantage client 2:");
        });
}


// Helpers

function createApplication() {
    return airvantage.createApplication({
            "name": "FakeApp",
            "revision": "0.3",
            "type": "SBZ1",
            "labels": [label]
        })
        .then(function(application) {
            console.log("Created application:", application.name);
            applicationUid = application.uid;
            return application;
        });
}

function editCommunication() {
    return airvantage.editApplicationCommunication(applicationUid, [{
        type: "MQTT",
        commIdType: "SERIAL",
        parameters: {
            password: "1234"
        }
    }]);
}

function editData() {
    var applicationData = [];
    applicationData.push({
        "id": "stuff.data.temperature",
        "label": "Temperature (°C)",
        "description": "Temperature of the Stuff",
        "elementType": "variable",
        "type": "double"
    });

    applicationData.push({
        "id": "longitude",
        "label": "Longitude",
        "description": "Longitude of the Stuff",
        "elementType": "variable",
        "type": "string"
    });

    var applicationDataDescription = [{
        id: "stuff",
        label: "Stuff",
        description: "Connected stuff",
        elementType: "node",
        encoding: "MQTT",
        data: applicationData
    }];

    return airvantage.editApplicationData(applicationUid, applicationDataDescription);
}

function createSystem() {
    var serialNumber = _.uniqueId("SN");

    var system = {
        name: "System " + serialNumber,
        state: "READY",
        gateway: {
            serialNumber: serialNumber,
            labels: [label]
        },
        labels: [label],
        applications: [{
            uid: applicationUid
        }],
        communication: {
            mqtt: {
                password: "1234"
            }
        }
    };

    return airvantage.createSystem(system)
        .then(function(system) {
            console.log("Created System:", system.name);
            return system;
        });
}

function cleanResources() {
    console.log("Clean resources");
    return airvantage.deleteSystems({
            selection: {
                label: label
            },
            deleteGateways: true,
            deleteSubscriptions: true
        })
        .then(function() {
            console.log("Systems deleted");
            return airvantage.deleteApplications({
                selection: {
                    label: label
                }
            });
        })
        .then(function(application) {
            console.log("Applications deleted");
        });
}
