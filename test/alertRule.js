import _ from "lodash";
import config from "./config";
import AirVantage from "../lib/airvantage";
import nock from "nock";
import test from "ava";

const airvantage = new AirVantage(config);
const FAKE_UID = "fakeUid";

const ALERT_RULE_1_ID = "3ed6cd7426604ee0bca9fe01f2521230";
const ALERT_RULE_1 = {
    id: ALERT_RULE_1_ID,
    name: "MyAlertRule"
};
const sampleQueryAlertRulesResp = [
    ALERT_RULE_1, {
        id: "d2cbc9d8e7b8491ea3433e6c78f984e4",
        name: "MyOtherAlertRule"
    }
];

test("query alertRules", async t => {
    nock("https://tests.airvantage.io")
        .get("/api/v2/alertrules?access_token=")
        .reply(200, sampleQueryAlertRulesResp);

    let alertRules = await airvantage.queryAlertRules();
    t.truthy(_.isArray(alertRules));
});

test("get alertRule details", async t => {
    nock("https://tests.airvantage.io")
        .get(`/api/v2/alertrules/${ALERT_RULE_1_ID}?access_token=`)
        .reply(200, ALERT_RULE_1);

    let alertRule = await airvantage.getDetailsAlertRule(ALERT_RULE_1_ID);
    t.truthy(_.isObject(alertRule));
});

test("create alertRule", async t => {
    const newAlertRule = {
        name: "New AlertRule"
    };
    nock("https://tests.airvantage.io")
        .post("/api/v2/alertrules?access_token=", newAlertRule)
        .reply(200, (req, alertRule) => _.set(alertRule, "id", FAKE_UID));

    let alertRule = await airvantage.createAlertRule(newAlertRule);
    t.truthy(alertRule);
    t.truthy(alertRule.id);
    t.is(alertRule.name, newAlertRule.name);
});

test("edit alertRule", async t => {
    const newName = "AlertRule Name edited",
        newNameBody = {
            name: newName
        };

    nock("https://tests.airvantage.io")
        .put(`/api/v2/alertrules/${FAKE_UID}?access_token=`, newNameBody)
        .reply(200, (req, alertRule) => _.set(alertRule, "name", newName));

    const alertRule = await airvantage.editAlertRule(FAKE_UID, newNameBody);
    t.is(alertRule.name, newName);
});

test("delete alertRule", async t => {
    nock("https://tests.airvantage.io")
        .delete(`/api/v2/alertrules/${ALERT_RULE_1_ID}?access_token=`)
        .reply(200, "success");

    let response = await airvantage.deleteAlertRule(ALERT_RULE_1_ID);
    t.truthy(response === "success");
});

/**
 * Notification hooks API
 */

const sampleGetHooksResp = [{
    callback: "http://www.mysite.com/callback",
    uid: "b88c03b43db74cacaab266e5c4481559"
}, {
    callback: "http://www.myothersite.com/callback",
    uid: "68c2bf58c6ee4484a92927c7afa9aaf5"
}];

test("create notification hook", async t => {
    const newHook = _.set({}, "callback", "http://www.test.com/callback");
    nock("https://tests.airvantage.io")
        .post(`/api/v1/alerts/rules/${ALERT_RULE_1_ID}/hooks?access_token=`, newHook)
        .reply(200, (req, hook) => _.set(hook, "uid", FAKE_UID));

    let hook = await airvantage.createNotificationHook(ALERT_RULE_1_ID, newHook);
    t.truthy(hook);
    t.truthy(hook.uid);
    t.is(hook.callback, newHook.callback);
});

test("get notification hooks", async t => {
    nock("https://tests.airvantage.io")
        .get(`/api/v1/alerts/rules/${ALERT_RULE_1_ID}/hooks?access_token=`)
        .reply(200, sampleGetHooksResp);

    let hooks = await airvantage.getNotificationHooks(ALERT_RULE_1_ID);
    t.truthy(_.isArray(hooks));
});
