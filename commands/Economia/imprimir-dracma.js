const {
    EmbedBuilder,
    SlashCommandBuilder,
} = require("discord.js");

const { Database } = require("../../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("imprimir-dracma")
        .setDescription("Imprima dracmas para o tesouro imperial de Esparta!")
        .addIntegerOption(option =>
            option.setName("quantidade")
                .setDescription("Quantidade de dracmas a imprimir")
                .setRequired(true)
        ),
    async execute(interaction) {
        const quantidade = interaction.options.getInteger("quantidade");
        const ministerio_cf = "1486178132309573692"; // ID do Ministério

        // Verificações Iniciais
        if (quantidade <= 0) {
            return interaction.reply({ content: "A quantidade deve ser acima de 0.", ephemeral: true });
        }

        if (!interaction.member.roles.cache.has(ministerio_cf)) {
            return interaction.reply({ content: "❌ **Acesso Negado.**", ephemeral: true });
        }

        // 1. Cálculo do Impacto
        // 0.0001 = Cada 10.000 dracmas sobem 1% o preço.
        const impacto = quantidade * 0.000005;

        // 2. Atualizar Tesouro Imperial
        const tesouroId = "tesouro_imperial";
        const tesouro = Database.query("SELECT * FROM economia WHERE userId = ?", [tesouroId]);

        if (tesouro.length === 0) {
            Database.prepare("INSERT INTO economia (userId, dracmas) VALUES (?, ?)").run(tesouroId, quantidade);
        } else {
            Database.prepare("UPDATE economia SET dracmas = dracmas + ? WHERE userId = ?").run(quantidade, tesouroId);
        }

        // 3. Atualizar Inflação Global
        Database.prepare("UPDATE inflacao SET porcentagem = porcentagem + ? WHERE id = 1").run(impacto);

        // Busca o valor atualizado para o Footer
        const rowInflacao = Database.prepare("SELECT porcentagem FROM inflacao WHERE id = 1").get();
        const inflacaoTotal = rowInflacao ? rowInflacao.porcentagem : 0;

        // 4. Atualizar Preços do Mercado (CORREÇÃO DA BOLA DE NEVE)
        const mercado = Database.query("SELECT * FROM mercado");
        mercado.forEach((item) => {
            // Aplicamos apenas o IMPACTO desta impressão ao preço que já está na loja
            const novoPreco = Math.floor(item.preco_base * (1 + impacto));
            Database.prepare("UPDATE mercado SET preco_base = ? WHERE itemId = ?").run(novoPreco, item.itemId);
        });

        // Helper de Símbolo
        function moneySimbolo(db) {
            const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();
            return row ? row.valor : "<:dracma:1396913374721343669>";
        }
        const money_symbol = moneySimbolo(Database);

        // 5. Envio do Embed
        const embed = new EmbedBuilder()
            .setTitle(`${money_symbol} Impressão de Dracmas`)
            .setColor("Gold")
            .setDescription(`O tesouro imperial recebeu um acréscimo de **${money_symbol}${quantidade.toLocaleString('pt-BR')}**`)
            .setFooter({
                text: `Impacto: ${(impacto * 100).toFixed(4)}% | Inflação Acumulada: ${(inflacaoTotal * 100).toFixed(2)}%`
            })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] })
    }
}