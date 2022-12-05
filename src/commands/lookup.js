const { SlashCommandBuilder } = require("@discordjs/builders");
const User = require("../models/User");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.DISCORD_LOOKUP_COMMAND)
    .setDescription(
      "Allows you to look up an account by providing information!"
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of platform you're looking up from.")
        .setRequired(true)
        .addChoices([
          ["Steam", "1"],
          ["Discord", "0"],
        ])
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the account you're attempting to look up.")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const { member, options } = interaction;

    if (member.user.bot) return;

    const rolesList = member._roles.diff(config.DISCORD_STAFF_ROLES);

    if (rolesList.length == 0)
      return interaction.editReply("You do not have permission to do this!");

    const UserExists =
      Number.parseInt(options._hoistedOptions[0].value) == true
        ? await User.exists({ steamID: options._hoistedOptions[1].value })
        : await User.exists({ discordID: options._hoistedOptions[1].value });

    if (!UserExists)
      return interaction.editReply(
        "There are no accounts linked by the information you provided!"
      );

    const UserData =
      Number.parseInt(options._hoistedOptions[0].value) == true
        ? await User.findOne({ steamID: options._hoistedOptions[1].value })
        : await User.findOne({ discordID: options._hoistedOptions[1].value });

    return interaction.editReply({
      embeds: [
        {
          title: "Associated Information",
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
              value: UserData.steamID
                ? `https://www.steamcommunity.com/profiles/${UserData.steamID}`
                : `Unavailable`,
              inline: true,
            },
            {
              name: "Discord",
              value: UserData.discordID
                ? `<@${UserData.discordID}> (${UserData.discordID})`
                : `Unavailable`,
              inline: true,
            }
          ],
        },
      ],
    });
  },
};

