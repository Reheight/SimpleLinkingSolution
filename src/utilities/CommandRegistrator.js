const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('../../config.json');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

module.exports = {
    initialize(CLIENT_ID, GUILD_ID) {
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            commands.push(command.data.toJSON());
        }
        
        const rest = new REST({ version: '9' }).setToken(config.DISCORD_BOT_TOKEN);
        
        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');
        
                await rest.put(
                    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                    { body: commands },
                );

                /* await rest.get(
                    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
                ).then(data => {
                    const promises = [];
                    for (const command of data) {
                        const deleteUrl = `${Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)}/${command.id}`;
                        promises.push(rest.delete(deleteUrl));
                    }

                    return Promise.all(promises);
                }) */
        
                console.log('Successfully reloaded application (/) commands.');
            } catch (error) {
                console.error(error);
            }
        })();
    }
}