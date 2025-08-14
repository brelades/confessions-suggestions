const mongoose = require('mongoose');
const { EmbedBuilder } = require('discord.js');

const suggestionSchema = new mongoose.Schema({
  id: String,
  messageId: String,
  content: String,
  userId: String,
  status: { type: String, default: 'pending' },
  votes: {
    type: Map,
    of: String // userId => '👍' or '👎'
  }
});

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

module.exports = {
  async saveSuggestion(id, messageId, content, userId) {
    await Suggestion.create({
      id,
      messageId,
      content,
      userId,
      status: 'pending',
      votes: new Map()
    });
  },

  async getSuggestion(id) {
    return await Suggestion.findOne({ id });
  },

  async updateVotes(message) {
    if (!message.embeds[0]) return;

    const suggestion = await Suggestion.findOne({ messageId: message.id });
    if (!suggestion) return;

    const upReaction = message.reactions.cache.get('👍');
    const downReaction = message.reactions.cache.get('👎');

    const upUsers = upReaction ? await upReaction.users.fetch() : new Map();
    const downUsers = downReaction ? await downReaction.users.fetch() : new Map();

    const liveReactions = new Map(); // userId => Set of emojis

    for (const [userId, user] of upUsers) {
      if (user.bot) continue;
      if (!liveReactions.has(userId)) liveReactions.set(userId, new Set());
      liveReactions.get(userId).add('👍');
    }

    for (const [userId, user] of downUsers) {
      if (user.bot) continue;
      if (!liveReactions.has(userId)) liveReactions.set(userId, new Set());
      liveReactions.get(userId).add('👎');
    }

    if (!suggestion.votes) suggestion.votes = new Map();

    for (const [userId, emojiSet] of liveReactions.entries()) {
      const currentVote = suggestion.votes.get(userId);

      if (!currentVote) {
        if (emojiSet.has('👍')) suggestion.votes.set(userId, '👍');
        else if (emojiSet.has('👎')) suggestion.votes.set(userId, '👎');
      } else {
        if (!emojiSet.has(currentVote)) {
          if (emojiSet.has('👍')) suggestion.votes.set(userId, '👍');
          else if (emojiSet.has('👎')) suggestion.votes.set(userId, '👎');
          else suggestion.votes.delete(userId);
        }
      }
    }

    // Remove votes from users who removed all reactions
    for (const userId of suggestion.votes.keys()) {
      if (!liveReactions.has(userId)) suggestion.votes.delete(userId);
    }

    let up = 0;
    let down = 0;

    for (const emoji of suggestion.votes.values()) {
      if (emoji === '👍') up++;
      else if (emoji === '👎') down++;
    }

    const total = up + down;
    const upPercent = total ? ((up / total) * 100).toFixed(1) : 0;
    const downPercent = total ? ((down / total) * 100).toFixed(1) : 0;
    const opinion = up - down;

    const embed = message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(embed).setFields([
      {
        name: 'Votes',
        value: [
          `Opinion: ${opinion >= 0 ? '+' : ''}${opinion}`,
          `Upvotes: ${up} (\`${upPercent}%\`)`,
          `Downvotes: ${down} (\`${downPercent}%\`)`
        ].join('\n')
      }
    ]);

    await message.edit({ embeds: [updatedEmbed] });
    await suggestion.save();
  },

  async updateStatus(id, status) {
    const normalizedStatus =
      status === 'approve' ? 'approved' :
      status === 'deny' ? 'denied' :
      status;

    await Suggestion.updateOne({ id }, { status: normalizedStatus });
  },

  async deleteSuggestion(id) {
    await Suggestion.deleteOne({ id });
  }
};
