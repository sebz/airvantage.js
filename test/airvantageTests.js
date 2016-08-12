var AirVantage = require("../lib/airvantage");
var BPromise = require("bluebird");
var config = require("./config.js");
var _ = require("lodash");
var sleep = require("sleep");
var mqtt = require('mqtt');
var applicationUid = "";
// Used to label the resources created for this simulation
var label = "airvantage.js";
var subscriptionUid = "";
var systemUid = "";
var mqttPassword = "1234";
var airvantage = new AirVantage(config);
airvantage.debug = true;
var airvantage2 = new AirVantage({
    serverUrl: config.serverUrl
});
airvantage2.debug = true;
var firstToken = "";
var operatorAccount;
var serialNumber = _.uniqueId("SN");

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
    .then(createOperatorAccounts)
    .then(createSystem)
    .then(editSystem)
    .then(sendMQTTData)
    .then(queryDataPoints)
    .then(activateSystems)
    .then(suspendSystems)
    .then(resumeSystems)
    .then(terminateSystems)
    .then(createGateway)
    .then(editGateway)
    .then(createSubscription)
    .then(editSubscription)
    .then(activateSubscriptions)
    .then(synchronizeSubscriptions)
    .then(suspendSubscriptions)
    .then(restoreSubscriptions)
    .then(terminateSubscriptions)
    .then(createAlertRule)
    .then(editAlertRule)
    .then(getAlertRule)
    .then(queryAlertRules)
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
                password: mqttPassword
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

    var system = {
        name: "System " + serialNumber,
        state: "READY",
        gateway: {
            serialNumber: serialNumber,
            labels: [label]
        },
        subscription: {
            identifier: _.uniqueId("SID"),
            operator: "UNKNOWN",
            networkIdentifier: _.uniqueId("SNI"),
            labels: [label],
            operatorAccount: {
                uid: operatorAccount.uid
            }
        },
        labels: [label],
        applications: [{
            uid: applicationUid
        }],
        communication: {
            mqtt: {
                password: mqttPassword
            }
        }
    };
    return airvantage.createSystem(system)
        .then(function(system) {
            console.log("Created System:", system.name);
            systemUid = system.uid;
            return system;
        });
}

function sendMQTTData() {
    return new BPromise(function(resolve, reject) {
        var mqttOptions = {
            host: config.mqttHost,
            port: "1883",
            clientId: serialNumber,
            username: serialNumber,
            password: mqttPassword
        };
        var client = mqtt.connect(mqttOptions);
        var current = new Date().getTime().toString();
        var payload = "{\"" + current + "\":{\"stuff.data.temperature\":20,\"longitude\":\"1.433333\"}}";
        client.on('connect', function() {
            client.publish(serialNumber + '/messages/json', payload, function() {
                client.end();
                console.log('Published MQTT data on', serialNumber);
                sleep.sleep(3);
                resolve();
            });
        });
    });
}

function queryDataPoints() {
    return airvantage.queryMultiRawDataPoints({
        targetIds: systemUid,
        dataIds: "stuff.data.temperature,longitude"
    }).then(function(datapoints) {
        console.log("Retrieved datapoints:", JSON.stringify(datapoints));
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
        .then(function() {
            console.log("Applications deleted");
            return airvantage.deleteAlertRules({
                fields: "uid"
            });
        })
        .then(function() {
            console.log("Alerts deleted");
            return airvantage.deleteGateways({
                selection: {
                    label: label
                }
            });
        })
        .then(function() {
            console.log("Gateways deleted");
            return airvantage.deleteSubscriptions({
                selection: {
                    label: label
                }
            });
        })
        .then(function() {
            console.log("Subscriptions deleted");
        })

}

function createGateway() {
    var gateway = {
        imei: _.uniqueId("IMEI"),
        type: "TEST",
        labels: [label]
    };

    return airvantage.createGateway(gateway)
        .then(function(gateway) {
            console.log("Created gateway:", gateway.imei);
            return gateway;
        });
}

function editGateway(gateway) {
    var data = {
        imei: gateway.imei + " - Edited",
    };

    return airvantage.editGateway(gateway.uid, data)
        .then(function(gatewayEdited) {
            console.log("Edited gateway:", gatewayEdited.imei);
            return gatewayEdited;
        });
}

function createOperatorAccounts() {

    var opConnections;
    var retrieveOpConnection = function() {
        return airvantage.queryOperatorConnections({
                name: "Cubic (stub)"
            })
            .then(function(result) {
                opConnections = result;
            });
    };

    var createOpAccount = function() {
        return airvantage.createOperatorAccounts({
                name: "Op Acc test",
                connection: {
                    uid: opConnections[0].uid
                }
            })
            .then(function(opAcc) {
                return opAcc;
            }).catch(function(e) {
                console.error(e);
            });
    };

    return retrieveOpConnection()
        .then(createOpAccount)
        .then(function(opAcc) {
            operatorAccount = opAcc;
        })

}

function createSubscription() {
    var subscription = {
        identifier: _.uniqueId("ID"),
        operator: "UNKNOWN",
        networkIdentifier: _.uniqueId("NI"),
        labels: [label],
        operatorAccount: {
            uid: operatorAccount.uid
        }
    };
    return airvantage.createSubscription(subscription)
        .then(function(subscription) {
            subscriptionUid = subscription.uid;
            return subscription;
        });
}

function editSubscription(subscription) {
    var data = {
        networkIdentifier: subscription.networkIdentifier + " - Edited",
    };

    return airvantage.editSubscription(subscription.uid, data)
        .then(function(subscriptionEdited) {
            console.log("Edited subscription:", subscriptionEdited.networkIdentifier);
            return subscriptionEdited;
        });
}

function createAlertRule() {
    var alertRule = {
        targetType: "SYSTEM",
        name: "MyAlertRule3Yj",
        message: "rule number 1",
        conditions: [{
            operator: "EQUALS",
            operands: [{
                attributeId: {
                    name: "system.comm.protocol"
                }
            }, {
                valueStr: "MSCI"
            }]
        }],
        emails: ["user@airvantage.net"]
    };

    return airvantage.createAlertRule(alertRule)
        .then(function(alertRule) {
            console.log("Created alert rule:", alertRule.name);
            return alertRule;
        });
}

function editAlertRule(alertRule) {
    alertRule.name = alertRule.name + " - EDITED";
    return airvantage.editAlertRule(alertRule.id, alertRule)
        .then(function(alertRuleEdited) {
            console.log("Edited alert rule:", alertRuleEdited.name);
            return alertRuleEdited;
        });
}

function getAlertRule(alertRule) {
    console.log("get alert rule:", alertRule);
    return airvantage.getDetailsAlertRule(alertRule.id)
        .then(function(alertRule) {
            console.log("Found alertRule:", alertRule.name);
            return alertRule;
        });
}

function queryAlertRules() {
    return airvantage.queryAlertRules({})
        .then(function(alertRules) {
            console.log("Found ", alertRules.length, "alert rules");
            return alertRules;
        });
}


function waitUntilOperationIsFinished(operationUid) {
    return airvantage.getDetailsOperation(operationUid)
        .then(function(detail) {
            if (detail.state != "FINISHED") {
                console.log("### operation not finished ", detail.state);
                sleep.sleep(3);
                return waitUntilOperationIsFinished(operationUid);
            } else {
                console.log("### operation finished");
                return;
            }
        });
}

function activateSubscriptions() {
    return airvantage.activateSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        }).then(function() {
            console.log("Subscription(s) activated", subscriptionUid);
        });
}

function synchronizeSubscriptions() {
    return airvantage.synchronizeSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        })
        .then(function() {
            console.log("Subscription(s) synchronized", subscriptionUid);
        });
}

function suspendSubscriptions() {
    return airvantage.suspendSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        })
        .then(function() {
            console.log("Subscription(s) suspended", subscriptionUid);
        });
}

function restoreSubscriptions() {
    return airvantage.restoreSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        })
        .then(function() {
            console.log("Subscription(s) restored", subscriptionUid);
        });
}

function terminateSubscriptions() {
    return airvantage.terminateSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        })
        .then(function() {
            console.log("Subscription(s) terminated", subscriptionUid);
        });
}

function activateSystems() {
    return airvantage.activateSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        }).then(function() {
            console.log("System activated", systemUid);
        });
}

function suspendSystems() {
    return airvantage.suspendSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        }).then(function() {
            console.log("System suspended", systemUid);
        });
}

function resumeSystems() {
    return airvantage.resumeSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        }).then(function() {
            console.log("System resumed", systemUid);
        });
}

function terminateSystems() {
    return airvantage.terminateSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(function(result) {
            return waitUntilOperationIsFinished(result.operation);

        }).then(function() {
            console.log("System terminated", systemUid);
        });
}
