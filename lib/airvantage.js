"use strict";

const fs = require("fs");
const Bromise = require("bluebird");
const got = require("got");
const _ = require("lodash");

const TOKEN_URL = "api/oauth/token";
const EXPIRE_TOKEN_URL = "api/oauth/expire";
const BASE_API_URL = "api/v1";
const BASE_API_V2_URL = "api/v2";
const RESOURCES = ["systems", "gateways", "subscriptions", "applications", "datasets", "settings", "operations"];
const EDITABLE_RESOURCES = _.without(RESOURCES, "operations", "connections");
const SUB_RESOURCES = {
    applications: ["communication", "data"]
};
const SUBSCRIPTION_OPERATIONS = ["activate", "synchronize", "suspend", "restore", "terminate"];
const SYSTEM_LIFECYCLE_OPERATIONS = ["activate", "suspend", "resume", "terminate"];

/**
 * AirVantage API class
 *
 * @param {String} setup.serverUrl
 * @param {String} setup.companyUid (optional)
 *  @param  {String} setup.credentials.clientId
 *  @param  {String} setup.credentials.secretKey
 *  @param  {String} setup.credentials.username
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

/**
 * Authenticate this instance of AirVantage
 *
 * @param  {Object} options,
 *         may contain different parameters to perform the authentication:
 *          - token: if you already have an access_token
 *          - username & password: to get authenticate different user
 *              These will override the one you may already have set at
 *              global level.
 *
 * @return {Promise} with the token
 */
AirVantage.prototype.authenticate = function(options) {
    //  Token is directly provided, by-pass  default authentication
    if (options && options.token) {
        this.token = options.token;
        return Bromise.resolve(this.token);
    }

    const authUrl = [this.serverUrl, TOKEN_URL].join("/");

    const creds = _.extend({}, this.credentials);
    if (options && options.username && options.password) {
        creds.username = options.username;
        creds.password = options.password;
    }

    this._debug("Authenticate with creds:", creds);
    return got(authUrl, {
            query: creds,
            json: true,
            headers: {
                "user-agent": "airvantage.js"
            }
        })
        .then(res => {
            this.token = res.body.access_token;
            return this.token;
        });
};

/**
 * Logoout this instance of AirVantage or a given token
 *
 * @param  {Object} options
 *           - token: a token to expire instead of the default instance one
 *
 * @return {Promise}
 */
AirVantage.prototype.logout = function(options) {
    const expireUrl = [this.serverUrl, EXPIRE_TOKEN_URL].join("/");

    // Check if we want to expire a specific token
    let tokenToExpire = options && options.token;
    // Otherwise use the default one
    if (!tokenToExpire) {
        tokenToExpire = this.token;
    }

    this._debug("Logout, expiring token:", tokenToExpire);

    return got(expireUrl, {
            query: {
                access_token: tokenToExpire
            },
            json: true,
            headers: this._buildHeaders()
        })
        .then(() => this.token = null);
};


/////////////////////////////////////////
//           ALERTS                    //
/////////////////////////////////////////

AirVantage.prototype.getDetailsAlert = function(id) {
    var url = this.serverUrl + "/" + BASE_API_V2_URL + "/alerts";
    var query = {
        query: this._buildQuery({
            alertId: id
        }),
        headers: this._buildHeaders(),
        json: true
    };
    return got(url, query)
        .then(function(res) {
            return res.body ? res.body[0] : res.body;
        });
};


/////////////////////////////////////////
//           ALERTS RULES              //
/////////////////////////////////////////
AirVantage.prototype.createAlertRule = function(data) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules";
    const query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(),
        json: true
    };
    return got.post(url, query).then(res => res.body);
};

AirVantage.prototype.editAlertRule = function(uid, data) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + uid;
    const query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(),
        json: true
    };
    return got.put(url, query).then(res => res.body);
};

AirVantage.prototype.deleteAlertRule = function(uid) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + uid;
    const query = {
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(),
        json: true
    };
    return got.delete(url, query);
};

AirVantage.prototype.deleteAlertRules = function(params) {
    return this.queryAlertRules(params, true)
        .then(items => {
            return items.items.map(item => this.deleteAlertRule(item.uid));
        });
};

AirVantage.prototype.queryAlertRules = function(params) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules";
    const query = {
        query: this._buildQuery(params),
        headers: {
            "Content-type": "application/json"
        },
        json: true
    };
    return got(url, query).then(res => res.body);
};

AirVantage.prototype.getDetailsAlertRule = function(id) {
    var url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + id;
    var query = {
        query: this._buildQuery(),
        headers: {
            "Content-type": "application/json"
        },
        json: true
    };
    return got(url, query).then(res => res.body);
};

//////////////////////////////////////////
//              SYSTEMS                 //
//////////////////////////////////////////

// Generates all lifecycle operation methods for systems
// e.g. AirVantage.prototype.suspendSystems = function(data)
_.each(SYSTEM_LIFECYCLE_OPERATIONS, operationName => {
    const methodName = operationName + "Systems";
    AirVantage.prototype[methodName] = function(data) {
        return this._post("operations/systems/" + operationName, data);
    };
});

AirVantage.prototype.queryMultiRawDataPoints = function(params) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/systems/data/raw";
    var query = {
        query: this._buildQuery(params),
        headers: {
            "Content-type": "application/json"
        },
        json: true
    };

    return got(url, query)
        .then(function(res) {
            return res.body;
        });
};

AirVantage.prototype.importUsage = function(data) {
    var resource = [this.serverUrl, BASE_API_URL, "operations/systems/usages/import"].join("/");

    return got(resource, {
            query: this._buildQuery(),
            headers: _.extend(this._buildHeaders(), {
                "Content-Type": "application/octet-stream"
            }),
            json: true,
            body: data
        })
        .then(function(res) {
            return res.body;
        }).catch(function(error) {
            console.error(error.response.body);
        });
};

//////////////////////////////////////////
//     OPERATOR CONNECTIONS             //
//////////////////////////////////////////

AirVantage.prototype.queryOperatorConnections = function(params) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operatorconnections";
    const query = {
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(params),
        json: true
    };
    return got(url, query)
        .then(res => res.body);
};

AirVantage.prototype.createOperatorAccounts = function(data) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operatoraccounts";
    const query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(),
        json: true
    };
    return got(url, query)
        .then(res => res.body);
};

//////////////////////////////////////////
//            SUBSCRIPTIONS             //
//////////////////////////////////////////

// Generates all operation methods for subscriptions
// e.g. AirVantage.prototype.suspendSubscriptions = function(data)
_.each(SUBSCRIPTION_OPERATIONS, operationName => {
    const methodName = operationName + "Subscriptions";
    AirVantage.prototype[methodName] = function(data) {
        return this._post("operations/subscriptions/" + operationName, data)
            .catch(error => console.error("# ERROR:", error.response.body));
    };
});

//////////////////////////////////////////
//            APPLICATIONS              //
//////////////////////////////////////////
AirVantage.prototype.releaseApplication = function(filePath) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operations/applications/release";
    const readStream = fs.createReadStream(filePath);

    var query = {
        body: readStream,
        headers: {
            "Content-type": "application/zip"
        },
        json: true,
        query: this._buildQuery()
    };
    return got(url, query)
        .then(res => res.body);
};

AirVantage.prototype.publishApplication = function(uid) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operations/applications/publish";
    const query = {
        body: JSON.stringify({
            application: uid
        }),
        headers: {
            "Content-type": "application/json"
        },
        json: true,
        query: this._buildQuery()
    };
    return got.post(url, query)
        .then(res => res.body);
};

AirVantage.prototype.currentUser = function() {
    const url = this.serverUrl + "/" + BASE_API_URL + "/users/current";
    const query = {
        headers: {
            "Content-type": "application/json"
        },
        json: true,
        query: this._buildQuery()
    };

    return got(url, query)
        .then(res => res.body);
};

//////////////////////////////////////////
//           GENERATED METHODS          //
//////////////////////////////////////////

// Generates all queryResource methods
// e.g. AirVantage.prototype.querySystems = function(params, fullResponse)
_.each(RESOURCES, resource => {
    AirVantage.prototype["query" + _.capitalize(resource)] = function(params, fullResponse) {
        return this._query(resource, params, fullResponse);
    };
});

// Generates all createResource methods
// e.g. AirVantage.prototype.createSystem = function(data)
_.each(RESOURCES, resource => {
    const methodName = "create" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(data) {
        return this._post(resource, data);
    };
});

// Generates all editResource methods
// e.g. AirVantage.prototype.editSystem = function(uid, data)
_.each(EDITABLE_RESOURCES, resource => {
    const methodName = "edit" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid, data) {
        return this._edit(resource, uid, data);
    };
});

// Generates all getDetailsRessource methods
// e.g. AirVantage.prototype.getDetailsSystem = function(uid)
_.each(RESOURCES, resource => {
    const methodName = "getDetails" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid) {
        return this._get(resource, uid);
    };
});

// Generates all deleteResource methods
// e.g. AirVantage.prototype.deleteSystem = function(uid |  query)
_.each(RESOURCES, resource => {
    const methodName = "delete" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid) {
        return this._deleteSingle(resource, uid);
    };
});

// Generates all deleteResources methods
// e.g. AirVantage.prototype.deleteSystems = function(options)
_.each(RESOURCES, resource => {
    const methodName = "delete" + _.capitalize(resource);
    AirVantage.prototype[methodName] = function(options) {
        return this._deleteMultiple(resource, options);
    };
});

// Generates all editSubResource methods
// e.g. AirVantage.prototype.editApplicationCommunication = function(uid, properties)
_.each(SUB_RESOURCES, (subResources, resource) => {
    _.each(subResources, subResource => {
        const methodName = "edit" + _.capitalize(resource).substring(0, resource.length - 1) + _.capitalize(subResource);
        AirVantage.prototype[methodName] = function(uid, properties) {
            return this._editSubResource(resource, subResource, uid, properties);
        };
    });
});


//////////////////////////////////////////
//                UTILS                 //
//////////////////////////////////////////

AirVantage.prototype._buildQuery = function(params) {
    let query = _.extend({
        access_token: this.token
    }, params || {});

    if (this.companyUid) {
        query.company = this.companyUid;
    }

    return query;
};

AirVantage.prototype._buildHeaders = function(headers) {
    return _.extend({
        "user-agent": "airvantage.js"
    }, headers || {});
};

AirVantage.prototype._buildPostHeaders = function(headers) {
    return _.extend(this._buildHeaders(headers), {
        "Content-Type": "application/json"
    });
};

AirVantage.prototype._query = function(resource, params, fullResponse) {
    const queryUrl = [this.serverUrl, BASE_API_URL, resource].join("/");

    return got(queryUrl, {
            query: this._buildQuery(params),
            json: true,
            headers: this._buildHeaders()
        })
        .then(res => fullResponse ? res.body : res.body.items);
};

AirVantage.prototype._post = function(resource, data) {
    const createUrl = [this.serverUrl, BASE_API_URL, resource].join("/");
    return got(createUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            json: true,
            body: JSON.stringify(data)
        })
        .then(res => res.body);
};

AirVantage.prototype._get = function(resource, uid) {
    const createUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");
    return got(createUrl, {
            query: this._buildQuery(),
            headers: this._buildHeaders(),
            json: true
        })
        .then(res => res.body);
};

AirVantage.prototype._deleteMultiple = function(resource, options) {
    if (!options && !options.selection) {
        throw new Error("Can't delete without options");
    }

    if (resource === "applications") {
        return this._deleteMultipleManually(resource, options);
    }
    return this._deleteMultipleOperation(resource, options);
};

AirVantage.prototype._deleteMultipleManually = function(resource, options) {
    return this._query(resource, {
            labels: [options.selection.label]
        })
        .then(items => {
            let multipleDeletes = items.map(item => this._deleteSingle(resource, item.uid));
            return Bromise.all(multipleDeletes);
        });
};

AirVantage.prototype._deleteMultipleOperation = function(resource, options) {
    const deleteUrl = [this.serverUrl, BASE_API_URL, "operations", resource, "delete"].join("/");

    // We want something like :
    // {
    //     systems: {
    //         label : "label",
    //             or
    //         uids:  [uid1, ...]
    //     },
    //     deleteGateway: true
    // }
    let deleteOptions = _.extend({}, _.omit(options, "selection"));
    deleteOptions[resource] = options.selection;

    return got.post(deleteUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            body: JSON.stringify(deleteOptions)
        })
        .catch(error => {
            let errorBody = error.response.body;
            // Catch
            if (!errorBody || errorBody.indexOf("selection.empty") === -1) {
                throw error;
            }
        });
};

AirVantage.prototype._deleteSingle = function(resource, uid) {
    const deleteUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");

    return got.delete(deleteUrl, {
        query: this._buildQuery(),
        headers: this._buildHeaders()
    });
};

AirVantage.prototype._edit = function(resource, uid, properties) {
    this._debug(`Edit ${resource} with uid '${uid} and properties ${properties}`);
    const editUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");
    this._debug(`Edit url: ${editUrl}`);

    return got.put(editUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            body: JSON.stringify(properties),
            json: true
        })
        .then(res => res.body);
};

AirVantage.prototype._editSubResource = function(resource, subResource, uid, properties) {
    const editUrl = [this.serverUrl, BASE_API_URL, resource, uid, subResource].join("/");

    return got.put(editUrl, {
        query: this._buildQuery(),
        headers: this._buildPostHeaders(),
        body: JSON.stringify(properties)
    });
};

AirVantage.prototype._debug = function() {
    if (this.debug) {
        console.log("[DEBUG]", getArgumentsAsString(arguments));
    }
};


/**
 * Transform a list of arguments to string (object are stringified)
 *
 * @param  {object} args, the list of arguments
 *
 * @return {String}       the generated string
 */
function getArgumentsAsString(args) {
    let response = [];

    _.each(args, arg => {
        if (typeof arg === "object") {
            response.push(JSON.stringify(arg));
        } else {
            response.push(arg);
        }
    });
    return response.join(" ");
}
