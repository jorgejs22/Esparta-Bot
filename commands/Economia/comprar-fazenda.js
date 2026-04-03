const {
        SlashCommandBuilder,
        EmbedBuilder,
        ActionRowBuilder,
        ComponentType,
        StringSelectMenuBuilder,
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle
} = require("discord.js");

const { Database } = require("../../database");

module.exports = {
        data: new SlashCommandBuilder()
                .setName("comprar")
                .setDescription("Compre um item do mercado"),

        async execute(interaction) {

                const user = interaction.user;
                const servidor = interaction.guild;


                function parseEmoji(emojiString) {
                        const match = emojiString.match(/<:(\w+):(\d+)>/);

                        if (!match) return { name: "💰" };

                        return {
                                name: match[1],
                                id: match[2]
                        };
                }

                function inflacaoAtual(db) {
                        const row = db.prepare(`SELECT porcentagem FROM inflacao ORDER BY criado_em DESC LIMIT 1`).get();
                        return row ? row.porcentagem : 0;
                }

                function calcularPreco(precoBase, inflacao) {
                        return Math.floor(precoBase * (1 + inflacao));
                }

                function moedaSimbolo(db) {
                        const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();

                        return row ? row.valor : "<:dracma:1396913374721343669>";
                }
                function parseEmoji(emojiString) {
                        const match = emojiString.match(/<:(\w+):(\d+)>/);

                        if (!match) return { name: "💰" };

                        return {
                                name: match[1],
                                id: match[2]
                        };
                }

                const inflacao = inflacaoAtual(Database);

                const money_simbolo = moedaSimbolo(Database);
                const emojiPorProduto = {
                        "café": "<:cafe:1486957231923531818>",
                        "trigo": "<:trigo:1486956835738095626>",
                        "algodão": "<:algodao:1486957697977942036>",
                        "feijão": "<:feijao:1486958339601465507>",
                        "milho": "<:milho:1486958531314978826>",
                        "cana-de-açucar": "<:canadeaucar:1486958752614715442>",
                        "arroz": "<:arroz:1486960640101716129>",
                        "soja": "<:soja:1486963241891528845>",
                        "mandioca": ""
                };

                const itens = Database.prepare(`SELECT * FROM mercado`).all();
                const itensComPreco = itens.map(item => ({
                        ...item,
                        preco_atual: calcularPreco(item.preco_base, inflacao)
                }));
                itensComPreco.sort((a, b) => {
                        if (b.estoque !== a.estoque) {
                                return b.estoque - a.estoque;
                        }
                        return a.preco_atual - b.preco_atual;
                });

                const fazendas = Database.prepare(`SELECT * FROM fazendas_disponiveis`).all();

                const fazendaOptions = fazendas.map(f => {
                        const produto = f.tipo_produto
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "") // remove acento
                                .trim();

                        const emojiString = emojiPorProduto[produto] || "🌱";
                        const emoji = parseEmoji(emojiString);

                        return {
                                label: `${f.tipo_produto} • (${f.provincia})`,
                                description: f.quantidade > 0
                                        ? `🌱 ${f.quantidade} disponíveis`
                                        : `🚫 Indisponível`,
                                value: `fazenda:${f.id}`,
                                emoji: emoji
                        };
                });


                const options = [
                        ...itensComPreco.map(item => {
                                const emoji = parseEmoji(money_simbolo);

                                return {
                                        label: `${item.preco_atual} - ${item.nome}`,
                                        description: item.estoque > 0
                                                ? `📦 ${item.estoque} disponíveis`
                                                : `🚫 Fora de estoque`,
                                        value: `item:${item.itemId}`,
                                        emoji: emoji
                                };
                        }),
                        ...fazendaOptions
                ];

                const embed = new EmbedBuilder()
                        .setAuthor({
                                name: `Mercado do ${servidor.name}`,
                                iconURL: servidor.iconURL()
                        })
                        .setTitle("🛒 Sistema de Aquisição")
                        .setDescription(`Selecione um item disponível no mercado utilizando o menu abaixo.\n📦 Todos os itens exibidos abaixo refletem:\n\n• Disponibilidade em estoque\n• Valor atualizado com base na inflação\n • Condições atuais do mercado imperial\n⚠️ Após selecionar um item, você poderá definir a quantidade desejada.\n Gerencie seus recursos com sabedoria.`)
                        .setFooter({
                                text: `A inflação atual é de ${(inflacao * 100).toFixed(2)}%`
                        })
                        .setTimestamp();

                const menuRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                                .setCustomId("mercado")
                                .setPlaceholder("Produtos")
                                .addOptions(options.slice(0, 25))
                )

                const response = await interaction.reply({
                        embeds: [embed],
                        components: [menuRow],
                        fetchReply: true
                })

                const collector = response.createMessageComponentCollector({
                        componentType: ComponentType.StringSelect,
                        time: 600000
                })

                collector.on('collect', async int => {

                        if (int.user.id !== interaction.user.id) {
                                return int.reply({
                                        content: `Essa não é sua interação.`,
                                        ephemeral: true
                                });
                        }

                        const [tipo, id] = int.values[0].split(":");

                        // 🟦 ITEM
                        if (tipo === "item") {

                                const item = Database.prepare(`SELECT * FROM mercado WHERE id = ?`).get(id);

                                if (!item) {
                                        return int.reply({
                                                content: `❌ Item não encontrado.`,
                                                ephemeral: true
                                        });
                                }

                                const modal = new ModalBuilder()
                                        .setCustomId(`modal_item_${id}`)
                                        .setTitle(`Comprar ${item.nome}`);

                                const input = new TextInputBuilder()
                                        .setCustomId(`qtd_compra`)
                                        .setLabel(`Quantidade de ${item.nome}`)
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true);

                                modal.addComponents(new ActionRowBuilder().addComponents(input));

                                return await int.showModal(modal); // 🔥 IMPORTANTE
                        }

                        // 🟩 FAZENDA
                        if (tipo === "fazenda") {

                                const fazenda = Database.prepare(`SELECT * FROM fazendas_disponiveis WHERE id = ?`).get(id);

                                const provincias = [
                                        "Termópilas", "Virteskem", "Houz", "Nirvrade",
                                        "Zeruz", "Leveron", "Tebas", "Argos", "Ertrug"
                                ];

                                const select = new StringSelectMenuBuilder()
                                        .setCustomId(`select_provincia_${id}`)
                                        .setPlaceholder("Escolha a província da fazenda")
                                        .addOptions(
                                                provincias.map(p => ({
                                                        label: p,
                                                        value: p
                                                }))
                                        );

                                const row = new ActionRowBuilder().addComponents(select);

                                return await int.update({
                                        content: "📍 Escolha a província:",
                                        embeds: [],
                                        components: [row]
                                });
                        }

                });
        }
}