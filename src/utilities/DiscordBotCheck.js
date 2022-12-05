const config = require("../../config.json");
const qs = require("qs");
const axios = require("axios").default;

const isInDiscord = async (discordID) => {
    const response = await axios({
        method: "GET",
        url: `https://discord.com/api/v8/guilds/${config.DISCORD_GUILD_ID}/members/${discordID}`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    })
    .then((res) => res.data)
    .catch((err) => err);

    const { user } = response;

    if (!user || user == undefined || user == null)
        return false;
    else
        return true;
}

const getDiscordMemberData = async (discordID) => {
    const response = await axios({
        method: "GET",
        url: `https://discord.com/api/v8/guilds/${config.DISCORD_GUILD_ID}/members/${discordID}`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    })
    .then((res) => res.data)
    .catch((err) => err.data);

    if (!response)
        return {
            isBoosting: null,
            userExists: null,
            rateLimited: true
        }

    const { premium_since: premium, user } = response;

    const isBoosting = premium != null;
    const userExists = user != null;

    return {
        isBoosting,
        userExists,
        rateLimited: false
    };
}

const isBoostingDiscord = async (discordID) => {
    const response = await axios({
        method: "GET",
        url: `https://discord.com/api/v8/guilds/${config.DISCORD_GUILD_ID}/members/${discordID}`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    })
    .then((res) => {
        return res.data;
    })
    .catch((err) => err);

    const { premium_since: premium } = response;

    if (premium == null) return false;
    else return true;
}

async function resolveCodeToData(code) {
    const tokenURL = "https://discordapp.com/api/oauth2/token";

    const tokenData = await axios({
        method: "POST",
        url: tokenURL,
        data: qs.stringify({
            "grant_type": "authorization_code",
            "client_id": config.DISCORD_OAUTH2_CLIENT_ID,
            "client_secret": config.DISCORD_OAUTH2_CLIENT_SECRET,
            "redirect_uri": `${config.API_DOMAIN}:${config.PORT}/api/authentication/discord/passback`,
            "code": code
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }).catch((err) => console.error(err));
    
    const user = await resolveTokenToData(tokenData.data.access_token);
    
    await joinDiscordServer(tokenData.data.access_token, user.id);

    return user.id;
}

async function resolveTokenToData(token) {
    const apiURLBase = "https://discordapp.com/api/users/@me";

    const userData = await axios({
        method: "GET",
        url: apiURLBase,
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }).catch((err) => console.error(err));

    return userData.data;
}

async function joinDiscordServer(token, discordID) {
    const guildsURL = `https://discordapp.com/api/guilds/${config.DISCORD_GUILD_ID}/members/`;

    await axios({
        method: "PUT",
        url: `${guildsURL}${discordID}`,
        data: {
            "access_token": token
        },
        headers: {
            "User-Agent": "DiscordBot (linking, 1.0)",
            "Content-type": "application/json",
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    }).catch((err) => console.error(err));

    await addVerifiedRole(discordID);
}

async function addVerifiedRole(discordID) {
    await axios({
        method: "PUT",
        url: `https://discord.com/api/v8/guilds/${config.DISCORD_GUILD_ID}/members/${discordID}/roles/${config.DISCORD_VERIFIED_ROLE_ID}`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    }).catch((err) => { console.log(`We encountered an error whilst assigning the verification role!\n\n${err}`)});
}

async function removeVerifiedRole(discordID) {
    await axios({
        method: "DELETE",
        url: `https://discord.com/api/v8/guilds/${config.DISCORD_GUILD_ID}/members/${discordID}/roles/${config.DISCORD_VERIFIED_ROLE_ID}`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`
        }
    }).catch((err) => { console.log(`We encountered an error whilst removing the verification role!\n\n${err}`)});
}

async function sendLinkedMessage(discordID, steamID) {
    await axios({
        method: "POST",
        url: `https://discord.com/api/v8/channels/${config.DISCORD_LINK_LOG_CHANNEL}/messages`,
        headers: {
            "Authorization": `Bot ${config.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
        },
        data: {
          embed: {
            title: "Account Linked",
            description: "The following accounts have been linked!",
            color: 2555726,
            timestamp: new Date().toISOString(),
            footer: {
              icon_url: config.LINKING_MESSAGE_FOOTER_LOGO_URL,
              text: config.LINKING_MESSAGE_FOOTER_TEXT,
            },
            fields: [
              {
                name: "Steam",
                value: `https://www.steamcommunity.com/profiles/${steamID}`,
                inline: true,
              },
              {
                name: "Discord",
                value: `<@${discordID}> (${discordID})`,
                inline: true,
              },
            ],
          },
        },
      }).catch((err) => { console.log(`We encountered an error whilst sending the message!\n\n${err}`)});
}

module.exports = { isInDiscord, isBoostingDiscord, getDiscordMemberData, resolveCodeToData, addVerifiedRole, removeVerifiedRole, sendLinkedMessage };
