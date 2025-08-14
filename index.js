require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User]
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands');
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
  }
});

const store = require('./utils/suggestionStore');

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || !['👍', '👎'].includes(reaction.emoji.name)) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    await store.updateVotes(reaction.message);
  } catch (err) {
    console.error('Error in messageReactionAdd:', err);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot || !['👍', '👎'].includes(reaction.emoji.name)) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    await store.updateVotes(reaction.message);
  } catch (err) {
    console.error('Error in messageReactionRemove:', err);
  }
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    client.login(process.env.DISCORD_TOKEN).then(() => {
      console.log(`Logged in as ${client.user.tag}`);
      client.user.setPresence({
        activities: [{ name: 'your suggestions', type: 3 }], // WATCHING
        status: 'online',
      });
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
