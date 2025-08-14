const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const store = require('../utils/suggestionStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(option =>
      option.setName('content').setDescription('Your suggestion').setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const content = interaction.options.getString('content');
    const suggestionId = uuidv4().split('-')[0];
    const channelId = process.env.SUGGESTION_CHANNEL_ID;
    const channel = interaction.client.channels.cache.get(channelId);

    if (!channel) {
      return interaction.editReply({ content: '❌ Suggestion channel not found.' });
    }

    const user = interaction.user;
const randomColor = Math.floor(Math.random() * 0xFFFFFF);

const embed = new EmbedBuilder()
  .setColor(randomColor)
  .setAuthor({ name: `Suggestion from ${user.username}`, iconURL: user.displayAvatarURL() })
  .setThumbnail(user.displayAvatarURL())
  .setDescription(content)
  .addFields({
    name: 'Votes',
    value: [
      `Opinion: ±0`,
      `Upvotes: 0 (\`0%\`)`,
      `Downvotes: 0 (\`0%\`)`
    ].join('\n')
  })
  .setFooter({ text: `Suggestion ID: ${suggestionId} | Submitted on • ${new Date().toLocaleString()}` });

    const msg = await channel.send({ embeds: [embed] });

    await msg.react('👍').catch(() => {});
    await msg.react('🤷').catch(() => {});
    await msg.react('👎').catch(() => {});

    await store.saveSuggestion(suggestionId, msg.id, content, user.id);
    await store.updateVotes(msg);

    await interaction.editReply({ content: `✅ Suggestion submitted! ID: \`${suggestionId}\`` });
  }
};
