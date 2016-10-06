import _ from "lodash";
import config from "./config";
import AirVantage from "../lib/airvantage";
import nock from "nock";
import test from "ava";

const airvantage = new AirVantage(config);
const FAKE_UID = "fakeUid";

const SYSTEM_1_UID = "3ed6cd7426604ee0bca9fe01f2521230";
const SYSTEM_1 = {
    "uid": SYSTEM_1_UID,
    "name": "MySystem"
};
const sampleQuerySystemsResp = {
    "items": [SYSTEM_1, {
        "uid": "d2cbc9d8e7b8491ea3433e6c78f984e4",
        "name": "MyOtherSystem"
    }],
    "count": 2,
    "size": 2,
    "offset": 0
};

test("query systems", async t => {
    const scope = nock('https://tests.airvantage.io')
        .get('/api/v1/systems?access_token=')
        .reply(200, sampleQuerySystemsResp);

    let systems = await airvantage.querySystems();
    t.truthy(_.isArray(systems));
});

test("query systems full", async t => {
    const scope = nock('https://tests.airvantage.io')
        .get('/api/v1/systems?access_token=')
        .reply(200, sampleQuerySystemsResp);

    let systems = await airvantage.querySystems(null, true);
    t.truthy(_.isObject(systems));
});

test("get systems details", async t => {
    const scope = nock('https://tests.airvantage.io')
        .get(`/api/v1/systems/${SYSTEM_1_UID}?access_token=`)
        .reply(200, SYSTEM_1);

    let system = await airvantage.getDetailsSystem(SYSTEM_1_UID);
    t.truthy(_.isObject(system));
});

test("create system", async t => {
    const newSystem = {
        name: "New System "
    };
    const scope = nock('https://tests.airvantage.io')
        .post('/api/v1/systems?access_token=', newSystem)
        .reply(200, (req, system) => _.set(system, "uid", FAKE_UID));

    let system = await airvantage.createSystem(newSystem);
    t.truthy(system);
    t.truthy(system.uid);
    t.is(system.name, newSystem.name);
});

test("edit system", async t => {
    const newName = " System Name edited",
        newNameBody = {
            name: newName
        };

    const scope = nock('https://tests.airvantage.io')
        .put(`/api/v1/systems/${FAKE_UID}?access_token=`, newNameBody)
        .reply(200, (req, system) => _.set(system, "name", newName));

    const system = await airvantage.editSystem(FAKE_UID, newNameBody);
    t.is(system.name, newName);
});

async function testSystemOperations(t, operationName) {
    const selection = {
        systems: {
            uids: [FAKE_UID]
        }
    };
    const scope = nock('https://tests.airvantage.io')
        .post(`/api/v1/operations/systems/${operationName}?access_token=`, selection)
        .reply(200, {
            operation: "operationUid"
        });

    const operationResult = await airvantage[`${operationName}Systems`](selection);
    t.truthy(operationResult && operationResult.operation);
}
testSystemOperations.title = (providedTitle, operationName, expected) => `${operationName} system`;

test(testSystemOperations, "activate");
test(testSystemOperations, "suspend");
test(testSystemOperations, "resume");
test(testSystemOperations, "terminate");

test.todo('Add missing test for queryMultiRawDataPoints');
