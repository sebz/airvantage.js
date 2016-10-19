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
    const options = _.assign({
        body: JSON.stringify(data)
    }, this._buildJSONQueryOptions());
    return got.post(url, options).then(res => res.body);
};

AirVantage.prototype.editAlertRule = function(id, data) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + id;
    const options = _.assign({
        body: JSON.stringify(data)
    }, this._buildJSONQueryOptions());
    return got.put(url, options).then(res => res.body);
};

AirVantage.prototype.deleteAlertRule = function(id) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + id;
    const options = {
        query: this._buildQuery()
    };
    return got.delete(url, options).then(res => res.body);
};

AirVantage.prototype.deleteAlertRules = function(params) {
    return this.queryAlertRules(params, true)
        .then(items => {
            return items.items.map(item => this.deleteAlertRule(item.uid));
        });
};

AirVantage.prototype.queryAlertRules = function(params) {
    const url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules";
    return got(url, this._buildJSONQueryOptions(params)).then(res => res.body);
};

AirVantage.prototype.getDetailsAlertRule = function(id) {
    var url = this.serverUrl + "/" + BASE_API_V2_URL + "/alertrules/" + id;
    return got(url, this._buildJSONQueryOptions()).then(res => res.body);
};


AirVantage.prototype.createNotificationHook = function(id, data) {
    const url = `${this.serverUrl}/${BASE_API_URL}/alerts/rules/${id}/hooks`;
    const options = _.assign({
        body: JSON.stringify(data)
    }, this._buildJSONQueryOptions());
    return got.post(url, options).then(res => res.body);
};

AirVantage.prototype.getNotificationHooks = function(id) {
    const url = `${this.serverUrl}/${BASE_API_URL}/alerts/rules/${id}/hooks`;
    return got(url, this._buildJSONQueryOptions()).then(res => res.body);
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
    return got(url, this._buildJSONQueryOptions(params)).then(res => res.body);
};

AirVantage.prototype.createOperatorAccounts = function(data) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operatoraccounts";
    const options = _.assign({
        body: JSON.stringify(data)
    }, this._buildJSONQueryOptions());
    return got(url, options).then(res => res.body);
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
    const options = _.assign({
        body: JSON.stringify({
            application: uid
        })
    }, this._buildJSONQueryOptions());
    return got.post(url, options).then(res => res.body);
};

AirVantage.prototype.addApplication = function(uid) {
    const url = this.serverUrl + "/" + BASE_API_URL + "/operations/applications/public/" + uid;
    return got(url, this._buildJSONQueryOptions()).then(res => res.body);
};

AirVantage.prototype.currentUser = function() {
    const url = this.serverUrl + "/" + BASE_API_URL + "/users/current";
    return got(url, this._buildJSONQueryOptions()).then(res => res.body);
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
    AirVantage.prototype["queryAll" + _.capitalize(resource)] = function(params, fullResponse) {
        return this._queryAll(resource, params, fullResponse);
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

AirVantage.prototype.waitUntilOperationIsFinished = function(operationUid) {
    return this.getDetailsOperation(operationUid)
        .then(detail => {
            console.log("2:", this);
            if (detail.state != "FINISHED") {
                // Not finished yet ? Try again in 3 seconds
                return new Promise((resolve, reject) => {
                    console.log("3:", this);
                    setTimeout(() => {
                        console.log("4:", this);
                        this.waitUntilOperationIsFinished(operationUid)
                            .then(() => resolve());
                    }, 3000);
                });
            }
        });
}


//////////////////////////////////////////
//                UTILS                 //
//////////////////////////////////////////

AirVantage.prototype._buildJSONQueryOptions = function(params) {
    return {
        query: this._buildQuery(params),
        headers: {
            "Content-type": "application/json"
        },
        json: true
    };
};

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

AirVantage.prototype._queryAll = function(resource, params) {
    const queryUrl = [this.serverUrl, BASE_API_URL, resource].join("/");
    let allEntities = [];

    function getEntities(queryOptions) {
        return got(queryUrl, queryOptions).then(res => {
            // Populate 'allEntities' with the new entities that have been retrieved
            allEntities = _.concat(allEntities, res.body.items);
            if (queryOptions.query.offset + res.body.size < res.body.count) {
                // Check whether there are more entities to retrieve...
                queryOptions.query.offset += res.body.size;
                // Recursive call... only the 'offset' property needs to be updated
                return getEntities(queryOptions);
            } else {
                // All entities have been retrieved, we can return all the entities
                return allEntities;
            }
        });
    }

    return getEntities({
        query: this._buildQuery(_.defaults(params, {
            // When none 'offset' / 'size' is specified, we initialize them
            offset: 0,
            size: 100
        })),
        json: true,
        headers: this._buildHeaders()
    });
};

AirVantage.prototype._post = function(resource, data) {
    const createUrl = [this.serverUrl, BASE_API_URL, resource].join("/");
    this._debug(`Post url: ${createUrl}`);
    return got(createUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            json: true,
            body: JSON.stringify(data)
        })
        .then(res => res.body);
};

AirVantage.prototype._get = function(resource, uid) {
    const getUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");
    this._debug(`get url: ${getUrl}`);
    return got(getUrl, {
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
