var AirVantage = require("../lib/airvantage");
var config = require("./config.js");
var _ = require("lodash");

var applicationUid = "";
// Used to label the resources created for this simulation
var label = "airvantage.js";

var airvantage = new AirVantage(config);
airvantage.debug = true;
var airvantage2 = new AirVantage({
    serverUrl: config.serverUrl
});
airvantage2.debug = true;
var firstToken = "";

airvantage.authenticate()
    .then(testLogout)
    .then(function() {
        return airvantage.authenticate();
    })
    .then(function(token) {
        console.log("Got token:", token);
        firstToken = token;
    })
    .then(cleanResources)
    .then(createApplication)
    .then(editCommunication)
    .then(editData)
    .then(createSystem)
    .then(editSystem)
    .then(cleanResources)
    .then(testBypassAuthenticationToken)
    .then(testMultiUserAuthentication)
    .then(queryOperations)
    .then(getOperationDetails)
    .catch(function(error) {
        console.error("# ERROR:", error.response.body);
    });

function testLogout() {
    var tokenToExpire;
    return airvantage.logout()
        .then(function() {
            return airvantage.querySystems()
                .catch(function(err) {
                    console.log("Token has been expired:", err.message);
                });
        })
        .then(function() {
            return airvantage.authenticate();
        })
        .then(function(token) {
            tokenToExpire = token;
        })
        .then(function() {
            return airvantage.querySystems()
                .then(function(systems) {
                    console.log("New Token, found systems: ", systems.length);
                });
        })
        .then(function() {
            return airvantage2.logout({
                token: tokenToExpire
            });
        })
        .then(function() {
            return airvantage.querySystems()
                .catch(function(err) {
                    console.log("Token has been expired:", err.message);
                });
        });
}

/**
 * Use a second AirVantage instance using first one's token
 */
function testBypassAuthenticationToken() {
    return airvantage2.authenticate({
            token: firstToken
        })
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

/**
 * Use an AirVantage instance for different users
 */
function testMultiUserAuthentication() {
    var user1;
    return airvantage.currentUser()
        .then(function(user) {
            user1 = user;
            return airvantage.authenticate({
                username: config.user2.username,
                password: config.user2.password
            });
        })
        .then(function(token) {
            return airvantage.currentUser();
        })
        .then(function(user2) {
            console.log("user1:", user1.email);
            console.log("user2:", user2.email);
            console.log("Different users ? ", user2.uid !== user1.uid);
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
        }])
        .catch(function(error) {
            console.log("##### ERR:", error);
        });
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

function editSystem(system) {
    return airvantage.editSystem(system.uid, {
            name: system.name + " - EDITED"
        })
        .then(function(editedSystem) {
            console.log("Edited editedSystem:", editedSystem.name);
        });
}

function queryOperations() {
    return airvantage.queryOperations()
        .then(function(operations) {
            console.log("Found", operations.length, "operations");
            return operations;
        });
}

function getOperationDetails(operations) {
    return airvantage.getDetailsOperation(operations[0].uid)
        .then(function(opDetails) {
            console.log("OP details:", opDetails);
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
