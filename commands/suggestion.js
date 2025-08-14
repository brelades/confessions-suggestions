const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const store = require('../utils/suggestionStore');

const MOD_ROLES = process.env.MOD_ROLES.split(',');
const LOG_CHANNEL_ID = '1402702487307419678'; // your log channel id
const SUGGESTION_CHANNEL_ID = process.env.SUGGESTION_CHANNEL_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Moderate suggestions')
    .addSubcommand(sub =>
      sub.setName('approve')
        .setDescription('Approve a suggestion')
        .addStringOption(opt => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for approval').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('deny')
        .setDescription('Deny a suggestion')
        .addStringOption(opt => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for denial').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a suggestion')
        .addStringOption(opt => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for deletion').setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const id = interaction.options.getString('id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.member;

    if (!MOD_ROLES.some(role => member.roles.cache.has(role))) {
      return interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
    }

    const suggestion = await store.getSuggestion(id);
    if (!suggestion) {
      return interaction.reply({ content: 'Suggestion not found.', ephemeral: true });
    }

    const suggestionChannel = interaction.client.channels.cache.get(SUGGESTION_CHANNEL_ID);
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);

    if (!suggestionChannel || !logChannel) {
      return interaction.reply({ content: 'Suggestion or log channel not found.', ephemeral: true });
    }

    const msg = await suggestionChannel.messages.fetch(suggestion.messageId).catch(() => null);
    if (!msg) {
      return interaction.reply({ content: 'Original suggestion message not found.', ephemeral: true });
    }

    const user = await interaction.client.users.fetch(suggestion.userId).catch(() => null);

    if (sub === 'approve' || sub === 'deny') {
      if (suggestion.status && suggestion.status !== 'pending') {
        return interaction.reply({
          content: `This suggestion has already been **${suggestion.status}**.`,
          ephemeral: true
        });
      }

      const statusText = sub === 'approve' ? 'approved' : 'denied';
      const color = sub === 'approve' ? 0x57F287 : 0xED4245;

      const embed = msg.embeds[0];
      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor(color)
        .setDescription(
          embed.description + `\n\n**Suggestion ${statusText} by ${interaction.user.tag}**\nReason: ${reason}`
        );

      await msg.edit({ embeds: [updatedEmbed] });
      await store.updateStatus(id, statusText);

      await logChannel.send({
        content: `Suggestion \`${id}\` was ${statusText} by **${interaction.user.tag}**.\nReason: ${reason}`,
        embeds: [updatedEmbed]
      });

if (user) {
  try {
    await user.send({
      content: `Your suggestion (\`${id}\`) has been **${statusText}** in ${interaction.guild.name}.\n[Jump to suggestion](${msg.url})`,
      embeds: [msg.embeds[0]]
    });
  } catch {
  }
}
      await interaction.reply({ content: `✅ Suggestion \`${id}\` was ${statusText}.`, ephemeral: true });
    }
else if (sub === 'delete') {
  await msg.delete().catch(() => null);
  await store.deleteSuggestion(id);

  const embed = msg.embeds[0];

  await logChannel.send({
    content: `Suggestion \`${id}\` was deleted by **${interaction.user.tag}**.\n**Reason:** ${reason}`,
    embeds: [embed]
  });

  if (user) {
    try {
      await user.send({
        content: `Your suggestion (\`${id}\`) has been **deleted** in ${interaction.guild.name}.\n**Reason:** ${reason}`,
        embeds: [embed]
      });
    } catch {
    }
  }

  await interaction.reply({ content: `🗑️ Suggestion \`${id}\` deleted.`, ephemeral: true });
}
  }
};
