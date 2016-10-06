import test from "ava";
import config from "./config";
import AirVantage from "../lib/airvantage";
import nock from "nock";
import querystring from "querystring";

const authUser1Request = `/api/oauth/token?grant_type=password&${querystring.stringify(config.credentials)}`;
const authUser1Response = {
    access_token: "fe47d528-7414-4962-a7e6-ee6b82491f7a",
    refresh_token: "9b465388-c9e2-45d3-98d0-1a44a503ec40",
    expires_in: 43199,
};
const authUser2Request = `/api/oauth/token?grant_type=password&${querystring.stringify(config.user2)}`;
const authUser2Response = {
    access_token: "zzzzzz-7414-4962-a7e6-ee6b82491f7a",
    refresh_token: "zzzzzzz-c9e2-45d3-98d0-1a44a503ec40",
    expires_in: 43199,
};

test("login", async t => {
    t.plan(3);
    const scope = nock(config.serverUrl)
        .get(authUser1Request)
        .reply(200, authUser1Response);

    let airvantage = new AirVantage(config);
    const token = await airvantage.authenticate();
    t.truthy(token);
    t.truthy(airvantage.token);
    t.is(authUser1Response.access_token, airvantage.token);
});

test("bypass authentication token", async t => {
    const scope = nock(config.serverUrl)
        .get(authUser1Request)
        .reply(200, authUser1Response);

    let airvantage = new AirVantage(config);
    const firstToken = await airvantage.authenticate();
    t.truthy(firstToken);

    let airvantage2 = new AirVantage({
        serverUrl: config.serverUrl
    });
    let secondToken = await airvantage2.authenticate({
        token: firstToken
    });
    t.is(firstToken, secondToken);
});

test("single instance for multiple users", async t => {

    const user1Response = {
        "company": {
            "uid": "1",
            "name": "Sierra Wireless"
        },
        "uid": "1",
        "email": "john@doe.com",
        "name": "John Doe",
        "profile": "dsffdfds"
    };

    const user2Response = {
        "company": {
            "uid": "1",
            "name": "Sierra Wireless"
        },
        "uid": "2",
        "email": "jane@doe.com",
        "name": "Jane Doe",
        "profile": "dsffdfds"
    };

    nock(config.serverUrl)
        .get(authUser1Request)
        .reply(200, authUser1Response);

    let airvantage = new AirVantage(config);
    const token1 = await airvantage.authenticate();


    nock(config.serverUrl)
        .get(`/api/v1/users/current?access_token=${token1}`)
        .times(2)
        .reply(200, user1Response);
    const user1 = await airvantage.currentUser();


    nock(config.serverUrl)
        .get(authUser2Request)
        .reply(200, authUser2Response);

    const token2 = await airvantage.authenticate({
        username: config.user2.username,
        password: config.user2.password
    });
    t.not(token1, token2)


    nock(config.serverUrl)
        .get(`/api/v1/users/current?access_token=${token2}`)
        .times(2)
        .reply(200, user2Response);
    const user2 = await airvantage.currentUser();
    t.not(user1.uid, user2.uid);

    const sameUser1 = await airvantage.authenticate({
            token: token1
        })
        .then(() => airvantage.currentUser());

    t.is(user1.uid, sameUser1.uid);


    const sameUser2 = await airvantage.authenticate({
            token: token2
        })
        .then(() => airvantage.currentUser());

    t.is(user2.uid, sameUser2.uid);
});
