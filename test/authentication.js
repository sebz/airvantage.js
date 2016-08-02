import test from "ava";
import config from "./config";
import AirVantage from "../lib/airvantage";

test("login", async t => {
    let airvantage = new AirVantage(config);
    t.plan(4);
    const token = await airvantage.authenticate();
    t.truthy(token);
    t.truthy(airvantage.token);
    const getMe = airvantage.currentUser();
    t.notThrows(getMe);
    var me = await getMe;
    t.truthy(me.uid);
});

test("bypass authentication token", async t => {
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
    let airvantage = new AirVantage(config);

    const token1 = await airvantage.authenticate();
    const user1 = await airvantage.currentUser();

    const token2 = await airvantage.authenticate({
        username: config.user2.username,
        password: config.user2.password
    });
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
