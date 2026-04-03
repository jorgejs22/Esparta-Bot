const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("teste-modal")
        .setDescription("Testando Modal e Select Menu"),

    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId(`fazenda_${interaction.user.id}`)
            .setTitle("Fazenda")

        const fazendaInput = new TextInputBuilder()
            .setCustomId('fazenda_input')
            .setLabel("Quantas sementes você irá plantar?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1, 2, 3...')


        const row = new ActionRowBuilder().addComponents(fazendaInput)
        modal.addComponents(row);

        await interaction.showModal(modal)
    }
}