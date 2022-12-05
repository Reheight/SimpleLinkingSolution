const config = require('../../config.json');
const express = require("express");
const routes = require("../routes");
const cors = require('cors');
const SessionHandler = require('./SessionHandler');
const passport = require('passport');
require("../strategies/steam");

function initSessions(app) {
    SessionHandler.setupSessions(app);
}

function initCors(app) {
    app.use(
        cors({
            origin: config.ORIGIN,
            credentials: true
        })
    )
}

function initPassport(app) {
    app.use(passport.initialize());
    app.use(passport.session());
}

module.exports = {
    initalize() {
        const app = express();

        initSessions(app);
        initCors(app);
        initPassport(app);

        app.use("/api", routes);

        return app;
    }
}