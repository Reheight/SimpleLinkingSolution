const router = require("express").Router();
const User = require("../../models/User");
const SteamGroupCheck = require("../../utilities/SteamGroupCheck");
const DiscordBotCheck = require("../../utilities/DiscordBotCheck");
const config = require("../../../config.json");

async function checkByID({ discordID, steamID }) {
    let userData = {
        Exists: false,
        SteamAssociated: false,
        DiscordAssociated: false,
        SteamID: "",
        DiscordID: "",
        DiscordRateLimited: false
    };

    if (config.ENABLE_DISCORD_SERVER_CHECKING) {
        userData.InDiscordServer = false;
        userData.IsBoostingDiscord = false;
    }

    if (config.ENABLE_STEAM_GROUP_CHECKING) userData.InSteamGroup = false;

    if (!discordID && !steamID) return userData;

    const UserExists = steamID == null ? await User.exists({ discordID }) : await User.exists({ steamID });

    if (!UserExists) return userData;
    else {
        userData.SteamAssociated = true;
        userData.Exists = true;
        userData.SteamID = steamID;
    }

    const UserData = steamID == null ? await User.findOne({ discordID }) : await User.findOne({ steamID });

    const MemberInSteamGroup = await SteamGroupCheck(UserData.steamID);;

    if (MemberInSteamGroup && config.ENABLE_STEAM_GROUP_CHECKING) userData.InSteamGroup = true;

    if (UserData.discordID != null || UserData.discordID) {
        userData.DiscordAssociated = true;
        userData.DiscordID = UserData.discordID;
    }

    const discordData = await DiscordBotCheck.getDiscordMemberData(UserData.discordID);

    userData.DiscordRateLimited = discordData.rateLimited;

    if (userData.DiscordAssociated &&
        discordData.userExists &&
        config.ENABLE_DISCORD_SERVER_CHECKING)
            userData.InDiscordServer = true;

    if (userData.DiscordAssociated &&
        discordData.userExists &&
        discordData.isBoosting &&
        config.ENABLE_DISCORD_SERVER_CHECKING) userData.IsBoostingDiscord = true;

    return userData;
}

router.get('/steam/:id', async (req, res) => {
    const results = await checkByID({ discordID: null,  steamID: req.params.id });

    return res.json(results);
});

router.get('/discord/:id', async (req, res) => {
    const results = await checkByID({ discordID: req.params.id,  steamID: null });

    return res.json(results);
});

router.get('/', async (req, res) => {
    const results = await checkByID({ discordID: null,  steamID: !req.user || !req.user.id ? null : req.user.id });

    return res.json(results)
});

router.get('/options', async (_req, res) => {
    const optionsData = {
        CheckSteamGroup: config.ENABLE_STEAM_GROUP_CHECKING ? true : false,
        CheckDiscordServer: config.ENABLE_DISCORD_SERVER_CHECKING ? true : false,
        DiscordInviteCode: config.DISCORD_INVITE_CODE
    };

    if (config.ENABLE_STEAM_GROUP_CHECKING) optionsData["SteamGroupID"] = config.STEAM_GROUP_ID;

    return res.json(optionsData);
});

router.get('/all/:apikey', async (req, res) => {
    if (req.params.apikey != config.API_KEY) return res.sendStatus(403);

    const dataSet = await User.find();

    if (!dataSet) return res.json({ error: true, reason: "We encountered an issue while fetching all results!" });
    else return res.json(dataSet);
});

module.exports = router;

