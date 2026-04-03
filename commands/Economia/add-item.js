const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Database } = require("../../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add-item")
        .setDescription("Adiciona um novo item ao mercado imperial.")
        .addStringOption(opt => opt.setName("nome").setDescription("Nome do item").setRequired(true))
        .addIntegerOption(opt => opt.setName("preco").setDescription("Preço base").setRequired(true))
        .addStringOption(opt => opt.setName("descricao").setDescription("Descrição do item").setRequired(true))
        .addIntegerOption(opt => opt.setName("estoque").setDescription("Quantidade em estoque").setRequired(true)),

    async execute(interaction) {
        // 1. Coleta e Limpeza (O .trim() evita espaços invisíveis que causam duplicatas "falsas")
        const nome = interaction.options.getString("nome").trim();
        const precobase = interaction.options.getInteger("preco");
        const descricao = interaction.options.getString("descricao");
        const estoque = interaction.options.getInteger("estoque");

        // 2. Validações Iniciais
        if (precobase <= 0) {
            return interaction.reply({ content: "❌ O valor deve ser superior a 0.", ephemeral: true });
        }
        if (estoque <= 0) {
            return interaction.reply({ content: "❌ O estoque deve ser superior a 0.", ephemeral: true });
        }
        if (descricao.length < 10 || descricao.length > 300) {
            return interaction.reply({ content: "❌ A descrição deve ter entre 10 e 300 caracteres.", ephemeral: true });
        }

        // 3. Verificação de Cargo
        const ministerio_cf = "1486178132309573692";
        if (!interaction.member.roles.cache.has(ministerio_cf)) {
            return interaction.reply({
                content: "❌ **Acesso Negado.** Você não é funcionario do Ministério do Comércio e Finanças.", ephemeral: true });
    }

        // 4. VERIFICAÇÃO DE DUPLICIDADE (A "Cirurgia")
        // Usamos LOWER para ser justo, mas o '=' garante que 'Bolsa de X' seja diferente de 'Bolsa de Y'
        const existente = Database.prepare("SELECT nome FROM mercado WHERE LOWER(nome) = LOWER(?)").get(nome);

            if (existente) {
                // O RETURN aqui é obrigatório para o código PARAR e não ir para o INSERT
                return interaction.reply({
                    content: `❌ **Conflito:** O item **${existente.nome}** já está no catálogo.`,
                    ephemeral: true
                });
            }

            // 5. INSERÇÃO (Dentro do try/catch para segurança total)
            try {
                Database.prepare(`INSERT INTO mercado (nome, preco_base, descricao, estoque) VALUES (?, ?, ?, ?) `).run(nome, precobase, descricao, estoque);

                // 6. Resposta de Sucesso
                function moneySimbolo(db) {
                    const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();
                    return row ? row.valor : "<:dracma:1396913374721343669>";
                }
                const money_symbol = moneySimbolo(Database);

                const embed = new EmbedBuilder()
                    .setTitle("📦 Novo Item no Mercado")
                    .setColor("Green")
                    .addFields(
                        { name: "📦 Nome do item:", value: `${nome}`, inline: true },
                         { name: "📋 Descrição:", value: `${descricao}`, inline: true },
                        { name: `${money_symbol} Preço Base:`, value: `${precobase}`, inline: true },
                        { name: "📊 Estoque:", value: `${estoque}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } catch (err) {
                console.error(err);
                // Se o banco barrar por UNIQUE (mesmo que o SELECT falhe), ele cai aqui
                return interaction.reply({
                    content: "❌ Houve um erro ao registrar o item. Verifique se o nome já não existe.",
                    ephemeral: true
                });
            }
        }
    };
