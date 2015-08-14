var AirVantage = require("../lib/airvantage");
var config = require("./config.js");
var _ = require("lodash");

var airvantage = new AirVantage(config);

airvantage.authenticate()
    .then(function(token) {
        console.log("token:", token);
    })
    .then(getSystems)
    .then(function(systems) {
        console.log("systems:", _.pluck(systems, "name"));
    })
    .then(createApplication)
    .then(editCommunication)
    .then(function() {
        return getApplications({
            name: "FakeApp"
        });
    })
    .then(function(application) {
        console.log("application:", application);
        return airvantage.deleteApplication(application[0].uid);
    })
    .catch(function(error) {
        console.error("# ERROR:", error);
    });


// Helpers
function getSystems() {
    return airvantage.querySystems();
}

function createApplication() {
    return airvantage.createApplication({
        "name": "FakeApp",
        "revision": "0.3",
        "type": "SBZ1"
    });
}

function getApplications(query) {
    return airvantage.queryApplications(query);
}

function editCommunication(application) {
    return airvantage.editApplicationCommunication(application.uid, [{
        type: "MQTT",
        commIdType: "SERIAL",
        parameters: {
            password: "1234"
        }
    }]);
}
