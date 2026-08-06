const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ComponentType,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");

const { Database } = require("../../database");
const fazenda = require("./fazenda");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loja")
    .setDescription(
      "Abra a loja de itens e serviços disponíveis para compra com dracmas!",
    ),
  async execute(interaction) {
    const servidor = interaction.guild;
    function inflacaoAtual(db) {
      const row = db
        .prepare(
          `
            SELECT porcentagem FROM inflacao ORDER BY criado_em DESC LIMIT 1
          `,
        )
        .get();
      return row ? row.porcentagem : 0;
    }

    function calcularPreco(precoBase, inflacao) {
      return Math.floor(precoBase * (1 + inflacao));
    }

    function obterItensLoja(db) {
      const inflacao = inflacaoAtual(db);

      const itens = db.prepare(`SELECT * from mercado`).all();
      return itens.map((itens) => ({
        ...itens,
        preco_atual: calcularPreco(itens.preco_base, inflacao),
        descricao: itens.descricao,
      }));
    }

    function moedaSimbolo(db) {
      const row = db
        .prepare(`SELECT valor FROM config WHERE chave = 'moeda'`)
        .get();

      return row ? row.valor : "<:dracma:1396913374721343669>";
    }

    function obterFazendas(db) {
      return db.prepare(`SELECT * from fazendas_disponiveis`).all();
    }

    const emojiPorProduto = {
      café: "<:cafe:1486957231923531818>",
      trigo: "<:trigo:1486956835738095626>",
      algodão: "<:algodao:1486957697977942036>",
      feijão: "<:feijao:1486958339601465507>",
      milho: "<:milho:1486958531314978826>",
      "cana-de-açucar": "<:canadeaucar:1486958752614715442>",
      arroz: "<:arroz:1486960640101716129>",
      soja: "<:soja:1486963241891528845>",
      mandioca: "",
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
        .setAuthor({
          name: `Mercado do ${servidor.name}`,
          iconURL: servidor.iconURL(),
        })
        .setDescription(
          `O mercado está vazio no momento.\nAdicione um item usando o comando \`/add-item\` `,
        )
        .setFooter({
          text: `A inflação atual é de ${inflacaoParaExibir.toFixed(2)}%`,
        })
        .setTimestamp();

      await interaction.reply({ embeds: [zero], ephemeral: false });
      return;
    }

    const menuRow = new StringSelectMenuBuilder()
      .setCustomId("page_2")
      .setPlaceholder("Acesse outras paginas da loja")
      .addOptions([
        {
          label: "Itens e serviços",
          value: "itens",
          emoji: "📦",
        },
        {
          label: "Fazendas",
          value: "fazenda",
          emoji: "🌱",
        },
      ]);

    function montarContainer(categoria) {
      const container = new ContainerBuilder().setAccentColor(0xd4af37);

      container.addTextDisplayComponents((text) =>
        text.setContent(`# Mercado do Império Espartano`),
      );
      container.addSeparatorComponents((separator) => separator);
      container.addTextDisplayComponents((text) =>
        text.setContent(`Bem-vindo ao sistema econômico oficial de Esparta.

Aqui você pode adquirir **itens, serviços e propriedades estratégicas** que fortalecem sua posição no Império.

⚖️ **Sistema dinâmico ativo**
• Preços ajustados pela inflação
• Estoque baseado na disponibilidade real

📂 Utilize o menu abaixo para navegar entre as categorias.

**Selecione uma opção para continuar.**`),
      );
      container.addActionRowComponents((row) => row.setComponents(menuRow));
      container.addSeparatorComponents((separator) => separator);

      if (categoria === "itens") {
        if (itens.length === 0) {
          container.addTextDisplayComponents((text) =>
            text.setContent(`📦 Nenhum item disponível no momento.`),
          );
        } else {
          itens.forEach((item) => {
            const texto = `**${item.nome}**
💰 ${money_symbol}${item.preco_atual}
📝 ${item.descricao}
📦 Estoque: ${item.estoque}`;

            container.addSectionComponents((section) =>
              section
                .addTextDisplayComponents((textDisplay) =>
                  textDisplay.setContent(texto),
                )
                .setButtonAccessory((button) =>
                  button
                    .setCustomId(`comprar_${item.id}`)
                    .setLabel("Comprar")
                    .setStyle(ButtonStyle.Primary),
                ),
            );
            container.addSeparatorComponents((separator) => separator);
          });
        }
      }

      if (categoria === "fazenda") {
        const fazendas = obterFazendas(Database);

        if (fazendas.length === 0) {
          container.addTextDisplayComponents((text) =>
            text.setContent(`🌱 Nenhuma fazenda cadastrada no momento.`),
          );
        } else {
          fazendas.forEach((f) => {
            const produto = f.tipo_produto.toLowerCase().trim();
            const emoji = emojiPorProduto[produto] || "🌱";
            const precoAtual = calcularPreco(f.preco_base, inflacao);
            const disponivel = f.quantidade > 0;
            const texto =
              `${emoji} **Fazenda de ${f.tipo_produto} (${f.provincia})**
💰 ${money_symbol}${precoAtual}
📦 Disponíveis: ${f.quantidade}
📈 Produção: 200kg/semana
${disponivel ? "" : "❌ Indisponível"}`.trim();

            container.addSectionComponents((section) =>
              section
                .addTextDisplayComponents((textDisplay) =>
                  textDisplay.setContent(texto),
                )
                .setButtonAccessory((button) =>
                  button
                    .setCustomId(`fazenda_${f.id}`)
                    .setLabel("Ver")
                    .setStyle(ButtonStyle.Secondary),
                ),
            );
            container.addSeparatorComponents((separator) => separator);
          });
        }
      }

      return container;
    }

    const response = await interaction.reply({
      components: [montarContainer("itens")],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 600000,
    });

    collector.on("collect", async (int) => {
      if (int.user.id !== interaction.user.id) {
        return int.reply({
          content: `Essa interação não é sua`,
          ephemeral: true,
        });
      }

      if (int.values[0] === "itens") {
        await int.update({
          components: [montarContainer("itens")],
          flags: MessageFlags.IsComponentsV2,
        });
      }
      if (int.values[0] === "fazenda") {
        await int.update({
          components: [montarContainer("fazenda")],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    });
  },
};
