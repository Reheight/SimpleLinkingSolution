const config = require('../../config.json');
const MongoStore = require('connect-mongo');
const session = require('express-session');

module.exports = {
    setupSessions(app) {
        app.use(
            session({
                secret: config.ENCRYPTION_KEY,
                cookie: {
                    maxAge: 60000 * 60 * 24 * 14
                },
                resave: false,
                saveUninitialized: false,
                store: MongoStore.create( { mongoUrl: config.MONGOSTRING } )
            })
        );
    }
}