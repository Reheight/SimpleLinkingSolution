const config = require('../../../config.json');
const router = require("express").Router();
const passport = require("passport");
const User = require("../../models/User");
const DiscordBotCheck = require("../../utilities/DiscordBotCheck");

router.get('/steam', passport.authenticate('steam', { failureRedirect: `${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=steamLoginAuthenticationFailed` }), function (req, res) {
    return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`);
});

router.get('/steam/passback', passport.authenticate('steam', { failureRedirect: `${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=steamLoginAuthenticationFailed` }), function(req, res) {
    return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`);
});

router.get('/discord', (req, res) => {
    const authorize_url = "https://discord.com/api/oauth2/authorize";

    const params = {
        client_id: config.DISCORD_OAUTH2_CLIENT_ID,
        redirect_uri: `${config.API_DOMAIN}:${config.PORT}/api/authentication/discord/passback`,
        response_type: "code",
        scope: "identify guilds.join"
    };
    const query = Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');

    return res.redirect(`${authorize_url}?${query}`);
})

router.get('/discord/passback', async (req, res) => {
    if (!req.query.code) return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=InvalidSteamAuth`);

    if (!req.user || !req.user.id) return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=SteamNotLoggedIn`);

    const userDataExists = await User.exists({ steamID: req.user.id });

    if (!userDataExists) return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=UserAccountDoesNotExist`);

    const userData = await User.findOne({ steamID: req.user.id });

    if (userData.discordID != null || userData.discordID) return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=AccountAlreadyLinkedToDiscord`);

    const discordID = await DiscordBotCheck.resolveCodeToData(req.query.code);

    const DiscordAlreadyLinked = await User.exists({ discordID });

    if (DiscordAlreadyLinked) return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}?error=DiscordAlreadyInUse`);

    await User.findOneAndUpdate({ steamID: req.user.id }, { discordID });

    await DiscordBotCheck.sendLinkedMessage(discordID, req.user.id);

    return res.redirect(`${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`);
});

router.get("/steam/unlink/:id/:apikey", async (req, res) => {
    if (req.params.apikey != config.API_KEY) return res.sendStatus(403);

    const accountExits = await User.exists({ steamID: req.params.id });

    if (!accountExits) return res.json({ error: true, reason: "There is no steam accounts that use the Steam ID provided!" });

    const userData = await User.findOne({ steamID: req.params.id });

    if (userData.discordID != null || userData.discordID && await DiscordBotCheck.isInDiscord(userData.discordID)) await DiscordBotCheck.removeVerifiedRole(userData.discordID);
    
    await User.findOneAndDelete({ steamID: req.params.id });

    res.json({ error: false, reason: "The player has now been unlinked!" });
});

router.get("/discord/unlink/:id/:apikey", async (req, res) => {
    if (req.params.apikey != config.API_KEY) return res.sendStatus(403);

    const accountExits = await User.exists({ discordID: req.params.id });

    if (!accountExits) return res.json({ error: true, reason: "There is no discord accounts that use the Discord ID provided!" });

    if (await DiscordBotCheck.isInDiscord(userData.discordID)) await DiscordBotCheck.removeVerifiedRole(userData.discordID);

    await User.findOneAndDelete({ discordID: req.params.id });

    res.json({ error: false, reason: "The player has now been unlinked!" });
});

module.exports = router;
