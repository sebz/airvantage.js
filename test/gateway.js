import _ from "lodash";
import config from "./config";
import AirVantage from "../lib/airvantage";
import nock from "nock";
import test from "ava";

const airvantage = new AirVantage(config);
const FAKE_UID = "fakeUid";

test("create gateway", async t => {
    const newGateway = {
        "uid": "082ff307d428461a9eb24f3c8b68f756",
        "imei": "353270041012745",
        "serialNumber": null
    };

    const scope = nock('https://tests.airvantage.io')
        .post('/api/v1/gateways?access_token=', newGateway)
        .reply(200, (req, gateway) => _.set(gateway, "uid", FAKE_UID));
    let gateway = await airvantage.createGateway(newGateway);
    t.truthy(gateway);
    t.is(gateway.uid, FAKE_UID);
    t.is(gateway.imei, newGateway.imei);
});

test('edit gateway', async t => {
    const gateway = {
            "uid": FAKE_UID,
            "imei": "353270041012745",
            "serialNumber": null
        },
        newImei = _.uniqueId("IMEI"),
        newImeiBody = {
            imei: newImei
        };

    const scope = nock('https://tests.airvantage.io')
        .put(`/api/v1/gateways/${FAKE_UID}?access_token=`, newImeiBody)
        .reply(200, (req, gateway) => _.set(gateway, "imei", newImei));

    const editedGateway = await airvantage.editGateway(FAKE_UID, newImeiBody)
        .catch(e => {
            console.error("edit gateway:", e);
            return Promise.reject(e);
        });
    t.is(editedGateway.imei, newImei);
});
