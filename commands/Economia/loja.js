const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    ComponentType,
    StringSelectMenuOptionBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const { Database } = require("../../database");
const fazenda = require("./fazenda");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loja")
        .setDescription("Abra a loja de itens e serviços disponíveis para compra com dracmas!"),
    async execute(interaction) {

        const servidor = interaction.guild;
        function inflacaoAtual(db) {
            const row = db.prepare(`
            SELECT porcentagem FROM inflacao ORDER BY criado_em DESC LIMIT 1
          `).get();
            return row ? row.porcentagem : 0;
        }

        function calcularPreco(precoBase, inflacao) {
            return Math.floor(precoBase * (1 + inflacao));
        }

        function obterItensLoja(db) {
            const inflacao = inflacaoAtual(db);

            const itens = db.prepare(`SELECT * from mercado`).all();
            return itens.map(itens => ({
                ...itens,
                preco_atual: calcularPreco(itens.preco_base, inflacao),
                descricao: itens.descricao
            }));
        }

        function moedaSimbolo(db) {
            const row = db.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get();

            return row ? row.valor : "<:dracma:1396913374721343669>";
        }

        function obterFazendas(db) {
            return db.prepare(`SELECT * from fazendas_disponiveis`).all();

        }

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

        // 1. Chame a função e guarde o resultado (multiplicando por 100 para ser porcentagem real)
        const inflacaoParaExibir = inflacaoAtual(Database) * 100;
        const money_symbol = moedaSimbolo(Database);

        const inflacao = inflacaoAtual(Database);
        const itens = obterItensLoja(Database);

        itens.sort((a, b) => a.preco_atual - b.preco_atual);
        itens.sort((a, b) => a.estoque - b.estoque);

        if (itens.length === 0) {
            const zero = new EmbedBuilder()
                .setAuthor({ name: `Mercado do ${servidor.name}`, iconURL: servidor.iconURL() })
                .setDescription(`O mercado está vazio no momento.\nAdicione um item usando o comando \`/add-item\` `)
                .setFooter({ text: `A inflação atual é de ${inflacaoParaExibir.toFixed(2)}%` })
                .setTimestamp();

            await interaction.reply({ embeds: [zero], ephemeral: false });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("🏛️ Mercado do Império Espartano")
            .setDescription(
                `Bem-vindo ao sistema econômico oficial de Esparta.

                Aqui você pode adquirir **itens, serviços e propriedades estratégicas** que fortalecem sua posição no Império.

                ⚖️ **Sistema dinâmico ativo**
                • Preços ajustados pela inflação
                • Estoque baseado na disponibilidade real

                📂 Utilize o menu abaixo para navegar entre as categorias.

                **Selecione uma opção para continuar.**`
            )
            .setFooter({
                text: `A inflação atual é de ${(inflacaoParaExibir).toFixed(2)}%`
            })
            .setTimestamp();

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("page_2")
                .setPlaceholder("Acesse outras paginas da loja")
                .addOptions([
                    {
                        label: "Itens e serviços", value: "itens", emoji: "📦"
                    },
                    {
                        label: "Fazendas", value: "fazenda", emoji: "🌱"
                    }
                ])
        );

        const response = await interaction.reply({
            embeds: [embed],
            components: [menuRow],
            fetchReply: true
        })

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 600000,
        });

        collector.on('collect', async int => {
            if (int.user.id !== interaction.user.id) {
                return int.reply({
                    content: `Essa interação não é sua`,
                    ephemeral: true
                })
            }

            if (int.values[0] === "itens") {
                const pagina_1 = new EmbedBuilder()
                    .setAuthor({ name: `Mercado do ${servidor.name}`, iconURL: servidor.iconURL() })
                    .setDescription(
                        `📦 **Itens e Serviços disponíveis**

                        Adquira recursos essenciais para sua jornada no Império.

                        💰 Os valores são ajustados automaticamente conforme a inflação atual.
                        📊 O estoque reflete a disponibilidade em tempo real.

                        Use \`/comprar\` para adquirir um item/propriedade.`
                    )

                    .addFields(itens.map(i => ({
                        name: `${money_symbol}${i.preco_atual} - ${i.nome}`,
                        value: `${i.descricao}\n**Estoque:** ${i.estoque}`,
                        inline: false
                    })))
                    .setFooter({
                        text: `A inflação atual é de ${(inflacaoParaExibir).toFixed(2)}%`
                    })
                    .setTimestamp();

                await int.update({
                    embeds: [pagina_1],
                    components: [menuRow]
                })
            }
            if (int.values[0] === "fazenda") {
                const fazendas = obterFazendas(Database);

                const pagina_2 = new EmbedBuilder()
                    .setAuthor({ name: `Mercado do ${servidor.name}`, iconURL: servidor.iconURL() })
                    .setDescription(`🌱 **Propriedades Agrícolas**\nAdquira fazendas e produza recursos de forma contínua.

                        📈 Cada propriedade gera **200kg por semana** automaticamente.
                        📦 A produção é armazenada no inventário do proprietário.

                        💼 Os produtos podem ser:
                        • Vendidos ao governo
                        • Comercializados com outros cidadãos
                        • Armazenados para uso futuro

                        ⚠️ A disponibilidade varia conforme a região e tipo de produção.\n\n`)
                if (fazendas.length === 0) {
                    pagina_2.addFields({
                        name: "🌱 Nenhuma fazenda registrada",
                        value: "Nenhuma propriedade agrícola foi cadastrada no sistema.",
                        inline: false
                    })
                } else {
                    pagina_2.addFields(fazendas.map(f => {
                        const produto = f.tipo_produto.toLowerCase().trim();
                        const emoji = emojiPorProduto[produto] || "🌱";

                        const preco_atual = calcularPreco(f.preco_base, inflacao);
                        const disponivel = f.quantidade > 0;

                        return {
                            name: `${emoji} Fazenda de ${f.tipo_produto} (${f.provincia}) — ${money_symbol}${preco_atual}`,
                            value: disponivel
                                ? [
                                    `📦 **Disponíveis:** ${f.quantidade}`,
                                    `📈 **Produção:** 200kg/semana`
                                ].join("\n")
                                : [
                                    `❌ **Indisponível**`,
                                    `📉 Estoque esgotado`
                                ].join("\n"),
                            inline: false
                        };
                    }))
                }
            
            pagina_2.setFooter({
                text: `A inflação atual é de ${(inflacaoParaExibir).toFixed(2)}%`
            })
                .setTimestamp();

            await int.update({
                embeds: [pagina_2],
                components: [menuRow]
            });
        }
    });
    }
}