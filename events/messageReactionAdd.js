const { Events } = require('discord.js');
const suggestionModel = require('../models/suggestionModel');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (!['👍', '👎'].includes(reaction.emoji.name)) return;

    await suggestionModel.updateVotes(reaction.message);
  }
};
