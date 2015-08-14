var got = require("got");
var _ = require("lodash");

var TOKEN_URL = "api/oauth/token";
var BASE_API_URL = "api/v1";
var ENTITIES = ["systems", "gateways", "subscriptions", "applications"];

/**
 * AirVantage API class
 * 
 * @param {String} setup.serverUrl
 * @param {String} setup.companyUid (optional)
 *  @param  {String} setup.credentials.clientId
 *  @param  {String} setup.credentials.secretKey
 *  @param  {String} setup.credentials.email
 *  @param  {String} setup.credentials.password
 */
function AirVantage(setup) {
    this.serverUrl = setup.serverUrl;
    this.companyUid = setup.companyUid;
    this.credentials = _.extend({
        grant_type: "password"
    }, setup.credentials);
    this.token = null;
}

AirVantage.prototype.authenticate = function() {
    var self = this;
    var authUrl = [this.serverUrl, TOKEN_URL].join("/");

    return got(authUrl, {
            query: this.credentials,
            json: true,
            headers: {
                'user-agent': 'airvantage.js'
            }
        })
        .then(function(res) {
            self.token = res.body.access_token;
            return self.token;
        });
};

// Generates all queryEntity methods
// e.g. AirVantage.prototype.querySystems = function(params, fullResponse) {
//     return this._query("systems", params, fullResponse);
// };
_.each(ENTITIES, function(entity) {
    AirVantage.prototype["query" + _.capitalize(entity)] = function(params, fullResponse) {
        return this._query(entity, params, fullResponse);
    };
});

// Generates all createEntity methods
// e.g. AirVantage.prototype.createSystem = function(data) {
//     return this._post("systems", data);
// };
_.each(ENTITIES, function(entity) {
    var methodName = "create" + _.capitalize(entity).substring(0, entity.length - 1);
    AirVantage.prototype[methodName] = function(data) {
        return this._post(entity, data);
    };
});

// Generates all deleteEntity methods
// e.g. AirVantage.prototype.deleteSystem = function(uid) {
//     return this._delete("systems", uid);
// };
_.each(ENTITIES, function(entity) {
    var methodName = "delete" + _.capitalize(entity).substring(0, entity.length - 1);
    AirVantage.prototype[methodName] = function(uid) {
        return this._delete(entity, uid);
    };
});

AirVantage.prototype.editApplicationCommunication = function(uid, communication) {
    var editUrl = [this.serverUrl, BASE_API_URL, "applications", uid, "communication"].join("/");

    return got.put(editUrl, {
        query: this._buildQuery(),
        headers: this._buildPostHeaders(),
        body: JSON.stringify(communication)
    });
};


module.exports = AirVantage;

// UTILS

AirVantage.prototype._buildQuery = function(params) {
    var query = _.extend({
        access_token: this.token
    }, params || {});

    if (this.companyUid) {
        query.company = this.companyUid;
    }

    return query;
};

AirVantage.prototype._buildHeaders = function(headers) {
    return _.extend({
        'user-agent': 'airvantage.js'
    }, headers || {});
};

AirVantage.prototype._buildPostHeaders = function(headers) {
    return _.extend(this._buildHeaders(headers), {
        "Content-Type": "application/json"
    });
};

AirVantage.prototype._query = function(entity, params, fullResponse) {
    var queryUrl = [this.serverUrl, BASE_API_URL, entity].join("/");

    return got(queryUrl, {
            query: this._buildQuery(params),
            json: true,
            headers: this._buildHeaders()
        })
        .then(function(res) {
            return fullResponse ? res.body : res.body.items;
        });
};

AirVantage.prototype._post = function(entity, data) {
    var createUrl = [this.serverUrl, BASE_API_URL, entity].join("/");

    return got(createUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            json: true,
            body: JSON.stringify(data)
        })
        .then(function(res) {
            return res.body;
        });
};

AirVantage.prototype._delete = function(entity, uid) {
    var deleteUrl = [this.serverUrl, BASE_API_URL, entity, uid].join("/");

    return got.delete(deleteUrl, {
        query: this._buildQuery(),
        headers: this._buildHeaders()
    });
};
