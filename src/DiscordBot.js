  // Array Helper

  Array.prototype.diff = function (arr2) {
    let ret = [];

    for (var i in this) {
      if (arr2.indexOf(this[i]) > -1) {
        ret.push(this[i]);
      }
    }

    return ret;
  };

  //

  const config = require("../config.json");
  const User = require("./models/User");
  const { Client, Intents, Collection } = require("discord.js");
  const fs = require("fs");
  const DJSCommandRegister = require("./utilities/CommandRegistrator");

  const bot = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MEMBERS,
    ],
  });

  bot.commands = new Collection();

  const commandFiles = fs
    .readdirSync("./src/commands")
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.data.name, command);
  }

  async function fetchLinkedAccounts() {
    return (await User.find({})).length;
  }

  bot.on("ready", () => {
    if (config.SHOW_LINKED_COUNT_IN_BOT_STATUS) {
      setInterval(async () => {
        let message;
        const linkedCount = await fetchLinkedAccounts();

        if (linkedCount > 0) {
          message = `${linkedCount} linked accounts...`;
        } else {
          message = `${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`;
        }

        bot.user.setActivity(message, { type: "WATCHING" });
      }, 15000);
    }

    DJSCommandRegister.initialize(bot.user.id, config.DISCORD_GUILD_ID);
  });

  bot.on("guildMemberAdd", async (member) => {
    const playerLinked = await User.exists({ discordID: member.id });

    if (playerLinked) member.roles.add(config.DISCORD_VERIFIED_ROLE_ID);
  });

  bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (!bot.commands.has(interaction.commandName)) return;

    if (config.COMMAND_CHANNEL_LOCK && interaction.channel.id != config.COMMAND_CHANNEL_ID) {
      return await interaction.reply({
        content: `You must perform this action in <#${config.COMMAND_CHANNEL_ID}> as it is the only permitted channel for this action!`,
        ephemeral: true
      });
    }

    try {
      await bot.commands.get(interaction.commandName).execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  });

  const cooldown = new Set();

  bot.on("messageCreate", async (message) => {
    if (message.author.bot || cooldown.has(message.author.id)) return;

    if (config.PROVIDE_LINKING_DETAILS_ON_KEYWORDS) {
      cooldown.add(message.author.id);
      setTimeout(() => {
        cooldown.delete(message.author.id);
      }, config.KEYWORD_INFORMATION_COOLDOWN * 1000);

      const messageArr = message.content.toLowerCase().trim().split(/ +/);
      const requiredKeywordsSimilar = messageArr.diff(config.DOMINANT_KEYWORDS.map(term => term.toLowerCase()));
      const similarKeywords = messageArr.diff(config.LINKING_INFO_KEYWORDS.map(term => term.toLowerCase()));

      if (similarKeywords.length < config.MINIMUM_KEYWORDS_REQUIRED || requiredKeywordsSimilar.length < config.MINIMUM_DOMINANT_KEYWORDS) return;

      const UserExists = await User.exists({ discordID: message.author.id });
      const TotalLinked = await fetchLinkedAccounts();

      const resMessageContent = JSON.stringify(
        config.LINKING_DETAILS_MESSAGE.content
      )
        .replace("{USER}", message.author)
        .replace("{USER_LINK_STATUS}", UserExists ? "is" : "is not")
        .replace(
          "{LINKING_URL}",
          `${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`
        )
        .replace("{LINKED_COUNT}", TotalLinked);

      const resMessageEmbeds = JSON.stringify(
        config.LINKING_DETAILS_MESSAGE.embeds
      )
        .replace("{USER}", message.author)
        .replace("{USER_LINK_STATUS}", UserExists ? "is" : "is not")
        .replace(
          "{LINKING_URL}",
          `${config.WEBPAGE_DOMAIN}${config.WEBPAGE_DIRECTORY}`
        )
        .replace("{LINKED_COUNT}", TotalLinked);

      return message
        .reply({
          content: JSON.parse(resMessageContent),
          embeds: JSON.parse(resMessageEmbeds),
        })
        .then(async (m2) => {
          setTimeout(() => {
            m2.delete().catch(() =>
              console.log(
                "We tried to delete a linking status message but we ran into an issue!"
              )
            );
          }, 15000);
        });
    }
  });

  module.exports = {
    initialize() {
      if (
        config.KEYWORD_INFORMATION_COOLDOWN > 2147483647 &&
        config.PROVIDE_LINKING_DETAILS_ON_KEYWORDS
      ) {
        return console.log(
          'We could not start the Discord bot as the "KEYWORD_INFORMATION_COOLDOWN" is too large, you must ensure it is less than or equal to 2147483647. Update your configuration file and try again!'
        );
      }

      bot.login(config.DISCORD_BOT_TOKEN);
    },
  };

