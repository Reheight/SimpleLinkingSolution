const { SlashCommandBuilder } = require("@discordjs/builders");
const User = require("../models/User");
const { removeVerifiedRole } = require("../utilities/DiscordBotCheck");
const config = require("../../config.json");

Array.prototype.diff = function (arr2) {
  let ret = [];

  for (var i in this) {
    if (arr2.indexOf(this[i]) > -1) {
      ret.push(this[i]);
    }
  }

  return ret;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.DISCORD_UNLINK_COMMAND)
    .setDescription("Allows you to unlink an account by providing information!")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of platform you're unlinking from.")
        .setRequired(true)
        .addChoices([
          ["Steam", "1"],
          ["Discord", "0"],
        ])
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the account you're attempting to unlink.")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const { member, options } = interaction;

    if (member.user.bot) return;

    const rolesList = member._roles.diff(config.DISCORD_STAFF_ROLES);

    if (rolesList.length == 0)
      return interaction.editReply("You do not have permission to do this!");
    
    const method = options.getString("type");
    const identifier = options.getString("id");

    const UserExists =
      method == "0"
        ? await User.exists({ discordID: identifier })
        : await User.exists({ steamID: identifier });

    if (!UserExists)
      return interaction.editReply({
        embeds: [
          {
            title: "Invalid Account",
            description: `We are unable to find any account with the ${method == "0" ? "Discord" : "Steam"} identifier of \`${identifier}\`!`,
            color: 2555726,
            timestamp: new Date().toISOString(),
            footer: {
              icon_url: config.LINKING_MESSAGE_FOOTER_LOGO_URL,
              text: config.LINKING_MESSAGE_FOOTER_TEXT,
            }
          },
        ]
      });

    const UserData =
      Number.parseInt(options._hoistedOptions[0].value) == true
        ? await User.findOne({ steamID: options._hoistedOptions[1].value })
        : await User.findOne({ discordID: options._hoistedOptions[1].value });
    
    try {
      await removeVerifiedRole(UserData.discordID);
    } catch (err) {
      console.log(`We were unable to remove the role from the user with the ID ${UserData.discordID} as they are probably not in the Discord guild.`)
    }

    if (method == "0") {
      await User.findOneAndDelete({
        discordID: identifier
      });
    } else {
      await User.findOneAndDelete({
        steamID: identifier
      });
    }

    return interaction.editReply({
      embeds: [
        {
          title: "Account Unlinked",
          description: `You have successfully unlinked the ${method == "0" ? "Discord" : "Steam"} account with the ID of \`${identifier}\`!`,
          color: 2555726,
          timestamp: new Date().toISOString(),
          footer: {
            icon_url: config.LINKING_MESSAGE_FOOTER_LOGO_URL,
            text: config.LINKING_MESSAGE_FOOTER_TEXT,
          }
        },
      ],
    });
  },
};


