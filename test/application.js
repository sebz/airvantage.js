import _ from "lodash";
import test from "ava";
import config from "./config";
import AirVantage from "../lib/airvantage";
import nock from "nock";

const NEW_APPLICATION = {
    "name": "FakeApp",
    "revision": "0.3",
    "type": "SBZ1",
};
const FAKE_UID = "fakeUid";
const COMMUNICATION_DETAILS = {
    type: "MQTT",
    commIdType: "SERIAL",
    parameters: {
        password: "1234"
    }
};
const airvantage = new AirVantage(config);

test("create application", async t => {
    nock('https://tests.airvantage.io')
        .post('/api/v1/applications?access_token=', NEW_APPLICATION)
        .reply(200, (req, application) => _.set(application, "uid", FAKE_UID));

    let application = await airvantage.createApplication(NEW_APPLICATION);
    t.truthy(application.uid);
    t.is(application.name, NEW_APPLICATION.name);
});

test("edit communication", async t => {
    nock('https://tests.airvantage.io')
        .put(`/api/v1/applications/${FAKE_UID}/communication?access_token=`, [COMMUNICATION_DETAILS])
        .reply(200);
    const editCom = airvantage.editApplicationCommunication(FAKE_UID, [COMMUNICATION_DETAILS]);
    t.notThrows(editCom);
});

test("edit data", async t => {
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

    nock('https://tests.airvantage.io')
        .put(`/api/v1/applications/${FAKE_UID}/data?access_token=`, applicationDataDescription)
        .reply(200);

    let editData = airvantage.editApplicationData(FAKE_UID, applicationDataDescription);
    t.notThrows(editData);
});

test("add application", async t => {
    nock('https://tests.airvantage.io')
        .get(`/api/v1/operations/applications/public/${FAKE_UID}?access_token=`)
        .reply(200, {
            operation: "operationUid"
        });

    const operationResult = await airvantage.addApplication(FAKE_UID);
    t.truthy(operationResult && operationResult.operation);
});
