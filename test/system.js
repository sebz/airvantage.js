import _ from "lodash";
import config from "./config";
import AirVantage from "../lib/airvantage";
import test from "ava";


// Used to label the resources created for these tests
const LABEL = "airvantage.js";
const airvantage = new AirVantage(config);

function buildSystem(serialNumber) {
    let systemTemplate = {
        name: "System " + serialNumber,
        gateway: {
            serialNumber: serialNumber,
            labels: [LABEL]
        },
        subscription: {
            identifier: _.uniqueId("SID"),
            operator: "UNKNOWN",
            networkIdentifier: _.uniqueId("SNI"),
            labels: [LABEL]
        },
        labels: [LABEL]
    };

    return systemTemplate;
}

function waitUntilOperationIsFinished(operationUid) {
    return airvantage
        .getDetailsOperation(operationUid)
        .then(detail => {
            if (detail.state != "FINISHED") {
                // Not finished yet ? Try again in 3 seconds
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        waitUntilOperationIsFinished(operationUid)
                            .then(() => resolve());
                    }, 3000);
                });
            }
        });
}

test.before("clean resources", async() => {
    const selection = {
        selection: {
            label: LABEL
        },
        deleteGateways: true,
        deleteSubscriptions: true
    };

    await airvantage.authenticate()
        .then(() => airvantage.deleteSystems(selection))
        .then(() => airvantage.deleteSubscriptions(selection));
});

test("create system", async t => {
    const systemTemplate = buildSystem(_.uniqueId("SN"));
    let system = await airvantage.createSystem(systemTemplate);
    t.truthy(system);
    t.is(system.name, systemTemplate.name);
});

test("edit system", async t => {
    const systemTemplate = buildSystem(_.uniqueId("SN"));
    const newName = systemTemplate.name + " - EDITED";
    let system = await airvantage.createSystem(systemTemplate);
    system = await airvantage.editSystem(system.uid, {
        name: newName
    });
    t.is(system.name, newName);
});

test("activate system", async t => {
    const systemTemplate = buildSystem(_.uniqueId("SN"));
    let system = await airvantage.createSystem(systemTemplate);

    system = await airvantage
        .activateSystems({
            systems: {
                uids: [system.uid]
            }
        })
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "ACTIVE");
});

test("suspend system", async t => {
    const systemTemplate = buildSystem(_.uniqueId("SN"));
    let system = await airvantage.createSystem(systemTemplate);
    const selection = {
        systems: {
            uids: [system.uid]
        }
    };

    system = await airvantage
        .activateSystems(selection)
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.suspendSystems(selection))
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "SUSPENDED");
});


test("resume system", async t => {
    t.plan(2);

    const systemTemplate = buildSystem(_.uniqueId("SN"));
    let system = await airvantage.createSystem(systemTemplate);
    const selection = {
        systems: {
            uids: [system.uid]
        }
    };

    system = await airvantage
        .activateSystems(selection)
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.suspendSystems(selection))
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "SUSPENDED");

    system = await airvantage
        .resumeSystems(selection)
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "ACTIVE");
});

test("terminate system", async t => {
    t.plan(2);

    const systemTemplate = buildSystem(_.uniqueId("SN"));
    let system = await airvantage.createSystem(systemTemplate);
    const selection = {
        systems: {
            uids: [system.uid]
        }
    };

    system = await airvantage
        .activateSystems(selection)
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "ACTIVE");

    system = await airvantage
        .terminateSystems(selection)
        .then(result => waitUntilOperationIsFinished(result.operation))
        .then(() => airvantage.getDetailsSystem(system.uid));

    t.is(system.lifeCycleState, "RETIRED");
});
