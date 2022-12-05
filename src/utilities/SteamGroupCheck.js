const config = require("../../config.json");
const steamGroup = require("steam-group-members");

module.exports = (steamid) => steamGroup.findMember(`https://steamcommunity.com/groups/${config.STEAM_GROUP_ID}`, steamid).then(isMember => isMember);