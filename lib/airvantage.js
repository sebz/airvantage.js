var Bromise = require("bluebird");
var got = require("got");
var _ = require("lodash");

var TOKEN_URL = "api/oauth/token";
var BASE_API_URL = "api/v1";
var RESOURCES = ["systems", "gateways", "subscriptions", "applications"];
var SUB_RESOURCES = {
    applications: ["communication", "data"]
};

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
module.exports = AirVantage;

AirVantage.prototype.authenticate = function(token) {
    //  Token is directly provided, by-pass  default authentication
    if (token) {
        this.token = token;
        return Bromise.resolve(token);
    }

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

// Generates all queryResource methods
// e.g. AirVantage.prototype.querySystems = function(params, fullResponse)
_.each(RESOURCES, function(resource) {
    AirVantage.prototype["query" + _.capitalize(resource)] = function(params, fullResponse) {
        return this._query(resource, params, fullResponse);
    };
});

// Generates all createResource methods
// e.g. AirVantage.prototype.createSystem = function(data)
_.each(RESOURCES, function(resource) {
    var methodName = "create" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(data) {
        return this._post(resource, data);
    };
});

// Generates all deleteResource methods
// e.g. AirVantage.prototype.deleteSystem = function(uid |  query)
_.each(RESOURCES, function(resource) {
    var methodName = "delete" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid) {
        return this._deleteSingle(resource, uid);
    };
});

// Generates all deleteResources methods
// e.g. AirVantage.prototype.deleteSystems = function(options)
_.each(RESOURCES, function(resource) {
    var methodName = "delete" + _.capitalize(resource);
    AirVantage.prototype[methodName] = function(options) {
        return this._deleteMultiple(resource, options);
    };
});

// Generates all editSubResource methods
// e.g. AirVantage.prototype.editApplicationCommunication = function(uid, properties)
_.forEach(SUB_RESOURCES, function(subResources, resource) {
    _.each(subResources, function(subResource) {
        var methodName = "edit" + _.capitalize(resource).substring(0, resource.length - 1) + _.capitalize(subResource);
        AirVantage.prototype[methodName] = function(uid, properties) {
            return this._edit(resource, subResource, uid, properties);
        };
    });
});


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

AirVantage.prototype._query = function(resource, params, fullResponse) {
    var queryUrl = [this.serverUrl, BASE_API_URL, resource].join("/");

    return got(queryUrl, {
            query: this._buildQuery(params),
            json: true,
            headers: this._buildHeaders()
        })
        .then(function(res) {
            return fullResponse ? res.body : res.body.items;
        });
};

AirVantage.prototype._post = function(resource, data) {
    var createUrl = [this.serverUrl, BASE_API_URL, resource].join("/");

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

AirVantage.prototype._deleteMultiple = function(resource, options) {
    if (!options && !options.selection) {
        throw new Error("Can't delete without options");
    }
    var self = this;

    if (resource === "applications") {
        return this._deleteMultipleManually(resource, options);
    }
    return self._deleteMultipleOperation(resource, options);
};

AirVantage.prototype._deleteMultipleManually = function(resource, options) {
    var self = this;

    return this._query(resource, {
            labels: [options.selection.label]
        })
        .then(function(items) {
            var multipleDeletes = _.map(items, function(item) {
                return self._deleteSingle(resource, item.uid);
            });

            return Bromise.all(multipleDeletes);
        })
};

AirVantage.prototype._deleteMultipleOperation = function(resource, options) {
    var deleteUrl = [this.serverUrl, BASE_API_URL, "operations", resource, "delete"].join("/");

    // We want something like :
    // {
    //     systems: {
    //         label : "label",
    //             or
    //         uids:  [uid1, ...]
    //     },
    //     deleteGateway: true
    // }
    var deleteOptions = _.extend({}, _.omit(options, "selection"));
    deleteOptions[resource] = options.selection;

    return got.post(deleteUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            body: JSON.stringify(deleteOptions)
        })
        .catch(function(error) {
            var errorBody = error.response.body;
            // Catch
            if (!errorBody || errorBody.indexOf("selection.empty") === -1) {
                throw error;
            }
        });
};

AirVantage.prototype._deleteSingle = function(resource, uid) {
    var deleteUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");

    return got.delete(deleteUrl, {
        query: this._buildQuery(),
        headers: this._buildHeaders()
    });
};

AirVantage.prototype._edit = function(resource, subResource, uid, properties) {
    var editUrl = [this.serverUrl, BASE_API_URL, resource, uid, subResource].join("/");

    return got.put(editUrl, {
        query: this._buildQuery(),
        headers: this._buildPostHeaders(),
        body: JSON.stringify(properties)
    });
};
