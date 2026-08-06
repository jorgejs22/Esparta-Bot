const {
  SlashCommandBuilder,
  ContainerBuilder,
  UserSelectMenuBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("teste")
    .setDescription("Este comando usa Componente V2"),
  async execute(interaction) {
    const container = new ContainerBuilder()
      .setAccentColor(0x0099ff)
      .addTextDisplayComponents((text) => text.setContent(`# Algo aqui`))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents(
            (text) => text.setContent(`Outra coisa aqui`),
            (text) => text.setContent(`Continuando mais algo`),
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId("teste_1")
              .setLabel(`Comprar`)
              .setStyle(ButtonStyle.Primary),
          ),
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row.setComponents(
          new UserSelectMenuBuilder()
            .setCustomId("teste")
            .setPlaceholder("Escolha"),
        ),
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
