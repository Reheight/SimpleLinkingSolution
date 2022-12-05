const config = require("../../config.json");
const passport = require('passport');
const SteamStrategy = require('passport-steam');
const User = require('../models/User');

passport.serializeUser((user, done) => { done(null, user) });
passport.deserializeUser((user, done) => { done(null, user) });

passport.use(new SteamStrategy({
    returnURL: `${config.API_DOMAIN}:${config.PORT}/api/authentication/steam/passback`,
    realm: `${config.API_DOMAIN}:${config.PORT}`,
    apiKey: config.STEAM_API_KEY,
    passReqToCallback: true
}, async function(req, identifier, profile, done) {
    process.nextTick(async function() {
        profile.identifer = identifier;

        var IP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (IP && IP.substr(0, 7) == "::ffff:") {
          IP = IP.substr(7);
        }

        const userDataExists = await User.exists({ steamID: profile._json.steamid });

        if (!userDataExists) {
            await User.create({ steamID: profile._json.steamid, IPAddress: IP });
        }

        done(null, profile);
    });
}));
