import test from "ava";
import config from "./config";
import AirVantage from "../lib/airvantage";


// Used to label the resources created for these tests
const LABEL = "airvantage.js";
let fakeApplication = {
    "name": "FakeApp",
    "revision": "0.3",
    "type": "SBZ1",
    "labels": [LABEL]
};
const COMMUNICATION_DETAILS = {
    type: "MQTT",
    commIdType: "SERIAL",
    parameters: {
        password: "1234"
    }
};
const airvantage = new AirVantage(config);

test.before("clean resources", async() => {
    await airvantage.authenticate()
        .then(() => airvantage.deleteApplications({
            selection: {
                label: LABEL
            }
        }));
});

test.serial("create application", async t => {
    let application = await airvantage.createApplication(fakeApplication);
    // Store uid for later use
    fakeApplication.uid = application.uid;
    t.is(application.name, fakeApplication.name);
});

test("edit communication", async t => {
    let editCom = airvantage.editApplicationCommunication(fakeApplication.uid, [COMMUNICATION_DETAILS]);
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
    let editData = airvantage.editApplicationData(fakeApplication.uid, applicationDataDescription);
    t.notThrows(editData);
});
