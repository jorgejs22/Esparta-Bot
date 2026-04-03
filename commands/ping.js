const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pong... ⏳', fetchReply: true });
    await interaction.editReply(`Pong! Latência API: ${interaction.client.ws.ping}ms`);
  },
};
