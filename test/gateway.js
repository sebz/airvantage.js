import _ from "lodash";
import config from "./config";
import AirVantage from "../lib/airvantage";
import test from "ava";


// Used to label the resources created for these tests
const LABEL = "airvantage.js";
const airvantage = new AirVantage(config);

function buildGateway(imei) {
    return {
        imei: imei,
        type: "TEST",
        labels: [LABEL]
    };;
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
        }
    };

    await airvantage.authenticate()
        .then(() => airvantage.deleteGateways(selection));
});

test("create gateway", async t => {
    const gatewayTemplate = buildGateway(_.uniqueId("IMEI"));
    let gateway = await airvantage.createGateway(gatewayTemplate);
    t.truthy(gateway);
    t.is(gateway.imei, gatewayTemplate.imei);
});

test('edit gateway', async t => {
    const gatewayTemplate = buildGateway(_.uniqueId("IMEI"));
    const newImei = _.uniqueId("IMEI");
    let gateway = await airvantage.createGateway(gatewayTemplate);

    gateway = await airvantage.editGateway(gateway.uid, {
            imei: newImei
        })
        .catch(e => {
            console.error("edit gateway:", e);
            return Promise.reject(e);
        });
    t.is(gateway.imei, newImei);
});
