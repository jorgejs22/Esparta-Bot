const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    ComponentType
} = require("discord.js");

const { Database } = require("../../database")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add-propriedade")
        .setDescription("Cadastre uma propriedade no sistema"),

    async execute(interaction) {

        const user = interaction.user;

        function moedaSimbolo(db) {
            const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();

            return row ? row.valor : "<:dracma:1396913374721343669>";
        }

        const money_simbolo = moedaSimbolo(Database);
        const fazendas = Database.prepare(`SELECT * FROM fazendas_disponiveis`).all();

        const ministerio_cf = "1486178132309573692"

        if (!interaction.member.roles.cache.has(ministerio_cf)) {
            await interaction.reply({
                content: `❌ **Acesso Negado.** Você não é um funcionário do Ministério do Comércio e Finanças`,
                ephemeral: true
            })
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`<:database_icon:1196780499381780490> Registro de Propriedades`)
            .setColor("Yellow")
            .setDescription(`Adicione um item ou uma propriedade ao mercado nacional\nEscolha uma categoria abaixo para escolher o tipo de produto\n\nGerencie os recursos adequadamente!`)
            .setTimestamp();

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("add_propriedade")
                .setPlaceholder("Registro")
                .addOptions({
                    label: `Fazendas`,
                    description: `Registre uma propriedade de produção agrícola no sistema`,
                    value: `faz`
                }, {
                    label: `Residências`,
                    description: `Registre uma residência ao sistema`,
                    value: `casa`
                })
        )

        const response = await interaction.reply({
            embeds: [embed],
            components: [menuRow],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 600000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({
                    content: `Essa interação não é sua.`,
                    ephemeral: true
                })
                return;
            }

            if (i.values[0] === "faz") {

                const modal = new ModalBuilder()
                    .setCustomId(`fazenda_add`)
                    .setTitle(`Registrar uma Fazenda ao sistema`)

                const tipo_produto = new TextInputBuilder()
                    .setCustomId(`fazenda_add_produto`)
                    .setLabel(`Tipo de produto que a Fazenda deve produzir`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const provincia = new TextInputBuilder()
                    .setCustomId(`fazenda_add_provincia`)
                    .setLabel(`Localização da Fazenda no território`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const preco_base = new TextInputBuilder()
                    .setCustomId(`fazenda_add_precobase`)
                    .setLabel(`Insira o preço base da fazenda`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const estoque = new TextInputBuilder()
                    .setCustomId(`fazenda_add_estoque`)
                    .setLabel(`Estoque disponível para essa fazenda`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const row1 = new ActionRowBuilder().addComponents(tipo_produto)
                const row2 = new ActionRowBuilder().addComponents(provincia)
                const row3 = new ActionRowBuilder().addComponents(preco_base)
                const row4 = new ActionRowBuilder().addComponents(estoque);

                modal.addComponents(row1, row2, row3, row4)
                await i.showModal(modal);

            }
        });
    }
}