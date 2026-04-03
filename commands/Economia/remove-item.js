const {
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");

const { Database } = require("../../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove-item")
        .setDescription("Remove um item do mercado")
        .addStringOption(option =>
            option.setName("nome")
                .setDescription("Nome do item")
                .setRequired(true)
        ),

    async execute(interaction) {

        const nome = interaction.options.getString("nome");

        const ministerio_cf = "1486178132309573692";

        // 🔒 Permissão
        if (!interaction.member.roles.cache.has(ministerio_cf)) {
            return interaction.reply({
                content: `❌ Acesso negado.`,
                ephemeral: true
            });
        }


        function moneySimbolo(db) {
            const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();

            return row ? row.valor : "<:dracma:1396913374721343669>";
        }

        const money_symbol = moneySimbolo(Database);

        // 🔍 Buscar itens parecidos
        const itens = Database.prepare(`
            SELECT * FROM mercado WHERE LOWER(nome) LIKE LOWER(?)
          `).all(`%${nome}%`);


        // ❌ Nenhum encontrado
        if (itens.length === 0) {
            return interaction.reply({
                content: `❌ Nenhum item encontrado com esse nome.`,
                ephemeral: true
            });
        }

        // ⚠️ Vários encontrados
        if (itens.length > 1) {
            return interaction.reply({
                content: `⚠️ Encontrei vários itens:\n${itens.map(i => `• ${i.nome}`).join("\n")}\n\nSeja mais específico.`,
                ephemeral: true
            });
        }

        const item = itens[0];

        // 🗑️ Deletar
        Database.prepare(`
          DELETE FROM mercado WHERE itemId = ?
        `).run(item.itemId)

        const resultado = Database.prepare(`
                            DELETE FROM mercado WHERE itemId = ?
                            `).run(item.itemId);
        console.log(resultado)

        const itens2 = Database.prepare(`
                                SELECT * FROM mercado`).all();
        console.log(itens2);

        // 📦 Embed
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Item Removido")
            .setDescription(`O item **${item.nome}** foi removido do mercado.`)
            .addFields(
                { name: `${money_symbol} Preço Base`, value: `${item.preco_base}`, inline: true },
                { name: "📊 Estoque", value: `${item.estoque}`, inline: true }
            )
            .setColor("Red")
            .setFooter({ text: `Removido por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};