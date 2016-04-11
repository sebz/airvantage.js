var Bromise = require("bluebird");
var got = require("got");
var _ = require("lodash");
var fs = require("fs");

var TOKEN_URL = "api/oauth/token";
var EXPIRE_TOKEN_URL = "api/oauth/expire";
var BASE_API_URL = "api/v1";
var RESOURCES = ["systems", "gateways", "subscriptions", "applications", "datasets", "settings", "operations"];
var EDITABLE_RESOURCES = _.without(RESOURCES, "operations");
var SUB_RESOURCES = {
    applications: ["communication", "data"]
};
var SUBS_OPERATIONS = ["activate", "synchronize", "suspend", "restore", "terminate"];

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

    var self = this;
    var authUrl = [this.serverUrl, TOKEN_URL].join("/");

    var creds = _.extend({}, this.credentials);
    if (options && options.username && options.password) {
        creds.username = options.username;
        creds.password = options.password;
    }

    this._debug("Authenticate with creds:", creds);
    return got(authUrl, {
            query: creds,
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

/**
 * Logoout this instance of AirVantage or a given token
 * 
 * @param  {Object} options
 *           - token: a token to expire instead of the default instance one
 * 
 * @return {Promise} 
 */
AirVantage.prototype.logout = function(options) {
    var expireUrl = [this.serverUrl, EXPIRE_TOKEN_URL].join("/");

    // Check if we want to expire a specific token
    var tokenToExpire = options && options.token;
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
        headers: {
            'user-agent': 'airvantage.js'
        }
    });
};

/////////////////////////////////////////
//           ALERTS RULES              //
/////////////////////////////////////////
AirVantage.prototype.createAlertRule = function(data) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/alerts/rules";
    var query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: {
            access_token: this.token
        },
        json: true
    };
    return got.post(url, query)
        .then(function(res) {
            return res.body;
        });
};

AirVantage.prototype.editAlertRule = function(uid, data) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/alerts/rules/" + uid;
    var query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: {
            access_token: this.token
        },
        json: true
    };
    return got.put(url, query)
        .then(function(res) {
            return res.body;
        });
};

AirVantage.prototype.deleteAlertRule = function(uid) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/alerts/rules/" + uid;
    var query = {
        headers: {
            "Content-type": "application/json"
        },
        query: {
            access_token: this.token
        },
        json: true
    };
    return got.delete(url, query);
};

AirVantage.prototype.deleteAlertRules = function(params) {
    var self = this;
    return self.queryAlertRules(params, true)
        .then(function(items) {
            _.map(items.items, function(item) {
                return self.deleteAlertRule(item.uid);
            });
        });
};

AirVantage.prototype.queryAlertRules = function(params, fullResponse) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/alerts/rules";
    var query = {
        query: this._buildQuery(params),
        headers: {
            "Content-type": "application/json"
        },
        json: true
    };
    return got(url, query)
        .then(function(res) {
            return fullResponse ? res.body : res.body.items;
        });
};

//////////////////////////////////////////
//              SYSTEMS                 //
//////////////////////////////////////////

AirVantage.prototype.activateSystem = function(data) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/operations/systems/activate";
    var query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: {
            access_token: this.token
        },
        json: true
    };
    return got(url, query);
};
//////////////////////////////////////////
//     OPERATOR CONNECTIONS             //
//////////////////////////////////////////

AirVantage.prototype.queryOperatorConnections = function(params) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/operatorconnections";
    var query = {
        headers: {
            "Content-type": "application/json"
        },
        query: this._buildQuery(params),
        json: true
    };
    return got(url, query)
        .then(function(res) {
            return res.body;
        }).catch(function(e) {
            console.error(e);
        });
};

AirVantage.prototype.createOperatorAccounts = function(data) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/operatoraccounts";
    var query = {
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json"
        },
        query: {
            access_token: this.token
        },
        json: true
    };
    return got(url, query)
        .then(function(res) {
            return res.body;
        }).catch(function(e) {
            console.error(e.response.body);
        });
};

//////////////////////////////////////////
//            SUBSCRIPTIONS             //
//////////////////////////////////////////

// Generates all operation methods for subscriptions
// e.g. AirVantage.prototype.suspendSubscriptions = function(data)
_.each(SUBS_OPERATIONS, function(operationName) {
    var methodName = operationName + "Subscriptions";
    AirVantage.prototype[methodName] = function(data) {
        return this._post("operations/subscriptions/" + operationName, data)
            .catch(function(error) {
                console.error("# ERROR:", error.response.body);
            })
    };
});

//////////////////////////////////////////
//            APPLICATIONS              //
//////////////////////////////////////////
AirVantage.prototype.releaseApplication = function(filePath) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/operations/applications/release";
    var readStream = fs.createReadStream(filePath);

    var query = {
        body: readStream,
        headers: {
            "Content-type": "application/zip"
        },
        json: true,
        query: {
            access_token: this.token
        }
    };
    return got(url, query)
        .then(function(res) {
            return res.body;
        })
        .catch(function(e) {
            console.error(e);
        });
};

AirVantage.prototype.publishApplication = function(uid) {
    var url = this.serverUrl + "/" + BASE_API_URL + "/operations/applications/publish";
    var query = {
        body: JSON.stringify({
            application: uid
        }),
        headers: {
            "Content-type": "application/json"
        },
        json: true,
        query: {
            access_token: this.token
        }
    };
    return got.post(url, query)
        .then(function(res) {
            return res.body;
        })
        .catch(function(e) {
            console.error(e);
        });
};

AirVantage.prototype.currentUser = function() {
    var url = this.serverUrl + "/" + BASE_API_URL + "/users/current";
    var query = {
        headers: {
            "Content-type": "application/json"
        },
        json: true,
        query: {
            access_token: this.token
        }
    };

    return got(url, query)
        .then(function(res) {
            return res.body;
        })
        .catch(function(e) {
            console.error(e);
        });
};

//////////////////////////////////////////
//           GENERATED METHODS          //
//////////////////////////////////////////

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

// Generates all editResource methods
// e.g. AirVantage.prototype.editSystem = function(uid, data)
_.each(EDITABLE_RESOURCES, function(resource) {
    var methodName = "edit" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid, data) {
        return this._edit(resource, uid, data);
    };
});

// Generates all getDetailsRessource methods
// e.g. AirVantage.prototype.getDetailsSystem = function(uid)
_.each(RESOURCES, function(resource) {
    var methodName = "getDetails" + _.capitalize(resource).substring(0, resource.length - 1);
    AirVantage.prototype[methodName] = function(uid) {
        return this._get(resource, uid);
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
            return this._editSubResource(resource, subResource, uid, properties);
        };
    });
});


//////////////////////////////////////////
//                UTILS                 //
//////////////////////////////////////////

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

AirVantage.prototype._get = function(resource, uid) {
    var createUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");
    return got(createUrl, {
            query: this._buildQuery(),
            headers: this._buildHeaders(),
            json: true
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

AirVantage.prototype._edit = function(resource, uid, properties) {
    var editUrl = [this.serverUrl, BASE_API_URL, resource, uid].join("/");

    return got.put(editUrl, {
            query: this._buildQuery(),
            headers: this._buildPostHeaders(),
            body: JSON.stringify(properties),
            json: true
        })
        .then(function(res) {
            return res.body;
        });
};

AirVantage.prototype._editSubResource = function(resource, subResource, uid, properties) {
    var editUrl = [this.serverUrl, BASE_API_URL, resource, uid, subResource].join("/");

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
}


/**
 * Transform a list of arguments to string (object are stringified)
 *
 * @param  {object} args, the list of arguments
 *
 * @return {String}       the generated string
 */
function getArgumentsAsString(args) {
    var response = [];

    _.each(args, function(arg) {
        if (typeof arg === "object") {
            response.push(JSON.stringify(arg));
        } else {
            response.push(arg);
        }
    });
    return response.join(" ");
}