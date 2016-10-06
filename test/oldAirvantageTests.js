"use strict";

const AirVantage = require("../lib/airvantage");
const BPromise = require("bluebird");
const config = require("./config.js");
const _ = require("lodash");
let applicationUid = "";
// Used to label the resources created for this simulation
const label = "airvantage.js";
let subscriptionUid = "";
let systemUid = "";
const mqttPassword = "1234";
const airvantage = new AirVantage(config);
airvantage.debug = true;
const airvantage2 = new AirVantage({
    serverUrl: config.serverUrl
});
airvantage2.debug = true;
let firstToken = "";
let operatorAccount;
const serialNumber = _.uniqueId("SN");

airvantage.authenticate()
    .then(testLogout)
    .then(() => airvantage.authenticate())
    .then(token => {
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
    .catch((error) => console.error("# ERROR:", error.response.body));

function testLogout() {
    var tokenToExpire;
    return airvantage
        .logout()
        .then(() => airvantage.querySystems()
            .catch(err => console.log("Token has been expired:", err.message))
        )
        .then(() => airvantage.authenticate())
        .then(token => tokenToExpire = token)
        .then(() => airvantage
            .querySystems()
            .then(systems => console.log("New Token, found systems: ", systems.length))
        )
        .then(() => airvantage2
            .logout({
                token: tokenToExpire
            }))
        .then(() => airvantage
            .querySystems()
            .catch(err => console.log("Token has been expired:", err.message))
        );
}

/**
 * Use a second AirVantage instance using first one's token
 */
function testBypassAuthenticationToken() {
    return airvantage2
        .authenticate({
            token: firstToken
        })
        .then(token => console.log("Is first token used? ", token === firstToken ? true : false))
        .then(() => airvantage2.querySystems())
        .then(systems => console.log("Found", systems.length, "systems with AirVantage client 2:"));
}

/**
 * Use an AirVantage instance for different users
 */
function testMultiUserAuthentication() {
    var user1;
    return airvantage
        .currentUser()
        .then(user => {
            user1 = user;
            return airvantage.authenticate({
                username: config.user2.username,
                password: config.user2.password
            });
        })
        .then(token => {
            return airvantage.currentUser();
        })
        .then(user2 => {
            console.log("user1:", user1.email);
            console.log("user2:", user2.email);
            console.log("Different users ? ", user2.uid !== user1.uid);
        });
}


// Helpers

function createApplication() {
    return airvantage
        .createApplication({
            "name": "FakeApp",
            "revision": "0.3",
            "type": "SBZ1",
            "labels": [label]
        })
        .then(application => {
            console.log("Created application:", application.name);
            applicationUid = application.uid;
            return application;
        });
}

function editCommunication() {
    return airvantage
        .editApplicationCommunication(applicationUid, [{
            type: "MQTT",
            commIdType: "SERIAL",
            parameters: {
                password: mqttPassword
            }
        }])
        .catch(error => console.log("##### ERR:", error));
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
    return airvantage
        .createSystem(system)
        .then(system => {
            console.log("Created System:", system.name);
            systemUid = system.uid;
            return system;
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
    return airvantage
        .editSystem(system.uid, {
            name: system.name + " - EDITED"
        })
        .then(editedSystem => console.log("Edited editedSystem:", editedSystem.name));
}

function queryOperations() {
    return airvantage
        .queryOperations()
        .then(operations => {
            console.log("Found", operations.length, "operations");
            return operations;
        });
}

function getOperationDetails(operations) {
    return airvantage
        .getDetailsOperation(operations[0].uid)
        .then(opDetails => console.log("OP details:", opDetails));
}

function cleanResources() {
    console.log("Clean resources");
    return airvantage
        .deleteSystems({
            selection: {
                label: label
            },
            deleteGateways: true,
            deleteSubscriptions: true
        })
        .then(() => {
            console.log("Systems deleted");
            return airvantage.deleteApplications({
                selection: {
                    label: label
                }
            });
        })
        .then(() => {
            console.log("Applications deleted");
            return airvantage.deleteAlertRules({
                fields: "uid"
            });
        })
        .then(() => {
            console.log("Alerts deleted");
            return airvantage.deleteGateways({
                selection: {
                    label: label
                }
            });
        })
        .then(() => {
            console.log("Gateways deleted");
            return airvantage.deleteSubscriptions({
                selection: {
                    label: label
                }
            });
        })
        .then(() => console.log("Subscriptions deleted"));
}

function createGateway() {
    var gateway = {
        imei: _.uniqueId("IMEI"),
        type: "TEST",
        labels: [label]
    };

    return airvantage
        .createGateway(gateway)
        .then(gateway => {
            console.log("Created gateway:", gateway.imei);
            return gateway;
        });
}

function editGateway(gateway) {
    var data = {
        imei: gateway.imei + " - Edited",
    };

    return airvantage
        .editGateway(gateway.uid, data)
        .then(gatewayEdited => {
            console.log("Edited gateway:", gatewayEdited.imei);
            return gatewayEdited;
        });
}

function createOperatorAccounts() {

    var opConnections;
    var retrieveOpConnection = () => {
        return airvantage
            .queryOperatorConnections({
                name: "Cubic (stub)"
            })
            .then(result => opConnections = result);
    };

    var createOpAccount = () => {
        return airvantage
            .createOperatorAccounts({
                name: "Op Acc test",
                connection: {
                    uid: opConnections[0].uid
                }
            })
            .catch(err => console.error(err));
    };

    return retrieveOpConnection()
        .then(createOpAccount)
        .then(opAcc => operatorAccount = opAcc);
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
    return airvantage
        .createSubscription(subscription)
        .then(subscription => {
            subscriptionUid = subscription.uid;
            return subscription;
        });
}

function editSubscription(subscription) {
    var data = {
        networkIdentifier: subscription.networkIdentifier + " - Edited",
    };

    return airvantage
        .editSubscription(subscription.uid, data)
        .then(subscriptionEdited => {
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

    return airvantage
        .createAlertRule(alertRule)
        .then(alertRule => {
            console.log("Created alert rule:", alertRule.name);
            return alertRule;
        });
}

function editAlertRule(alertRule) {
    alertRule.name = alertRule.name + " - EDITED";
    return airvantage.editAlertRule(alertRule.id, alertRule)
        .then(alertRuleEdited => {
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
    return airvantage
        .queryAlertRules({})
        .then(alertRules => {
            console.log("Found ", alertRules.length, "alert rules");
            return alertRules;
        });
}

function activateSubscriptions() {
    return airvantage
        .activateSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("Subscription(s) activated", subscriptionUid));
}

function synchronizeSubscriptions() {
    return airvantage
        .synchronizeSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("Subscription(s) synchronized", subscriptionUid));
}

function suspendSubscriptions() {
    return airvantage
        .suspendSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("Subscription(s) suspended", subscriptionUid));
}

function restoreSubscriptions() {
    return airvantage
        .restoreSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("Subscription(s) restored", subscriptionUid));
}

function terminateSubscriptions() {
    return airvantage
        .terminateSubscriptions({
            subscriptions: {
                uids: [subscriptionUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("Subscription(s) terminated", subscriptionUid));
}

function activateSystems() {
    return airvantage
        .activateSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("System activated", systemUid));
}

function suspendSystems() {
    return airvantage
        .suspendSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("System suspended", systemUid));
}

function resumeSystems() {
    return airvantage
        .resumeSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("System resumed", systemUid));
}

function terminateSystems() {
    return airvantage
        .terminateSystems({
            systems: {
                uids: [systemUid]
            }
        })
        .then(result => airvantage.waitUntilOperationIsFinished(result.operation))
        .then(() => console.log("System terminated", systemUid));
}
