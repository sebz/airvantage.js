// First check for env vars
var config = {
    serverUrl: process.env.SERVER_URL,
    credentials: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        username: process.env.USERNAME,
        password: process.env.PASSWORD
    },
    user2: {
        username: process.env.USERNAME2,
        password: process.env.PASSWORD2
    }
};

if (!config.serverUrl) {
    try {
        config = require('./setupConfig');
    } catch (err) {
        throw new Error("Missing configuration, see setupConfig.js.template");
    }
}


module.exports = config;
