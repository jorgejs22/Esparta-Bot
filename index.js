require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials, StringSelectMenuBuilder, ActionRowBuilder, InteractionResponse, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Database } = require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(entryPath);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
      }
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));

async function registerCommands() {
  const commandsData = client.commands.map(c => c.data.toJSON());

  if (process.env.GUILD_ID) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
      await guild.commands.set(commandsData);
      console.log(`✅ Comandos registrados no servidor ${process.env.GUILD_ID}`);
      return;
    }
  }

  await client.application.commands.set(commandsData);
  console.log('✅ Comandos globais registrados.');


}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} pronto e conectado!`);
  await Database.init();
  await registerCommands();

  // Aqui o database já garantiu as tabelas no init(), então não precisa criar novamente em cada ready.
  const economiaCount = Database.query('SELECT * FROM economia').length;
  const patenteCount = Database.query('SELECT * FROM patente').length;

  console.log(`${client.user.tag} conectado ao Banco de Dados SQLite, carregando os dados: ${economiaCount} usuários na tabela ECONOMIA\n${patenteCount} usuários na tabela PATENTE`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction, { Database });
    } catch (error) {
      console.error(error);

      if (interaction.deferred || interaction.replied) {

        await interaction.followUp({
          content: 'Erro ao executar comando.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'Erro ao executar comando.',
          ephemeral: true
        });
      }
    }

    return;
  }
  if (interaction.isModalSubmit()) {
    if (interaction.customId === `fazenda_${interaction.user.id}`) {

      const quantidade = interaction.fields.getTextInputValue("fazenda_input")

      const select = new StringSelectMenuBuilder()
        .setCustomId(`select_fazenda_${quantidade}`)
        .setPlaceholder("Escolha o que fazer")
        .addOptions([
          {
            label: "Plantar semente",
            value: "plantar",
            description: "Plantar as sementes"
          }, {
            label: "Vender Sementes",
            value: "vender",
            description: "Venda algumas sementes para o Governo"
          }
        ])

      const row = new ActionRowBuilder().addComponents(select);

      await interaction.reply({
        content: `🌾 Quantidade: ${quantidade}`,
        components: [row]
      })
    }

    if (interaction.isStringSelectMenu()) {

      const quantidade = interaction.customId.split('_')[2]
      const escolha = interaction.values[0];

      if (escolha === "plantar") {
        await interaction.reply({
          content: `🌾 Você plantou ${quantidade} sementes!`
        });
      }
      if (escolha === "vender") {
        await interaction.reply({
          content: `💰 Você vendeu ${quantidade} sementes pro governo!`
        });
      }
    }
  }

  if (interaction.customId === 'modal_venda_fazenda') {
    const userId = interaction.user.id;
    const qtdRaw = parseInt(interaction.fields.getTextInputValue('qtd_venda'));
    const quantidade = parseInt(qtdRaw);

    // 1. Validar Estoque na DB
    const fazenda = Database.prepare("SELECT * FROM propriedades WHERE donoId = ?").get(userId);

    if (!fazenda || isNaN(quantidade) || quantidade <= 0 || quantidade > fazenda.estoque_kg) {
      return interaction.reply({
        content: `❌ **Contrato Negado.** Quantidade inválida ou estoque insuficiente (${fazenda?.estoque_kg || 0}kg).`,
        ephemeral: true
      });
    }

    // 2. Preço por KG (Baseado na Reforma de Esparta)
    const precoKg = 0.50;
    const lucro = quantidade * precoKg;

    try {
      // 3. Executar Transação (Tirar KG e Dar Dracmas)
      Database.prepare("UPDATE propriedades SET estoque_kg = estoque_kg - ? WHERE donoId = ?").run(quantidade, userId);
      Database.prepare(`INSERT INTO economia (userId, dracmas) VALUES (?, ?)ON CONFLICT(userId) DO UPDATE SET dracmas = dracmas + ?
         `).run(userId, lucro, lucro);

      Database.prepare("")
      await interaction.reply({
        content: `🏛️ **Tesouro de Esparta:** Venda de **${quantidade}kg** processada. Você recebeu **${lucro.toLocaleString('pt-BR')} Dracmas**.`,
        ephemeral: true
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Erro crítico no Tesouro Imperial.", ephemeral: true });
    }
  }
  if (interaction.customId.startsWith("modal_item_")) {
    const id = interaction.customId.split("_")[2];
    const userId = interaction.user.id;
    const quantidade = parseInt(interaction.fields.getTextInputValue("qtd_compra"));

    if (isNaN(quantidade) || quantidade <= 0) {
      return interaction.reply({
        content: "❌ Quantidade inválida.",
        ephemeral: true
      });
    }

    const item = Database.prepare(`SELECT * FROM mercado WHERE id = ?`).get(id);

    if (!item) {
      return interaction.reply({
        content: "❌ Este item não existe mais no mercado.",
        ephemeral: true
      });
    }
    if (item.estoque < quantidade) {
      return interaction.reply({
        content: `❌ Estoque insuficiente. Disponível: ${item.estoque}`,
        ephemeral: true
      });
    }
    const user = Database.prepare(`SELECT dracmas FROM economia WHERE userId = ?
  `).get(userId);

    const inflacao = Database.prepare(`SELECT porcentagem FROM inflacao ORDER BY criado_em DESC LIMIT 1
  `).get();

    const precoAtual = Math.floor(item.preco_base * (1 + (inflacao?.porcentagem || 0)));
    const total = precoAtual * quantidade;

    // saldo
    if (!user || user.dracmas < total) {
      return interaction.reply({
        content: `❌ Saldo insuficiente. Necessário: ${total}`,
        ephemeral: true
      });
    }

    // atualizar banco
    Database.prepare(`UPDATE economia SET dracmas = dracmas - ? WHERE userId = ?
              `).run(total, userId);

    Database.prepare(` UPDATE mercado SET estoque = estoque - ? WHERE id = ?
              `).run(quantidade, id);

    // resposta
    return interaction.reply({
      content: `✅ Você comprou ${quantidade}x ${item.nome} por ${total}`,
      ephemeral: true,
    });
  }

  if (interaction.customId === "fazenda_add") {

    const tipo_produto = interaction.fields.getTextInputValue("fazenda_add_produto");
    const provincia = interaction.fields.getTextInputValue("fazenda_add_provincia");
    const preco_base = parseInt(interaction.fields.getTextInputValue("fazenda_add_precobase"));
    const estoque = parseInt(interaction.fields.getTextInputValue("fazenda_add_estoque"));

    const territorio = ["Termópilas", "Virteskem", "Houz", "Nirvrade", "Zeruz", "Leveron", "Tebas", "Argos", "Ertrug"]
    if (!territorio.includes(provincia)) {
      return await interaction.reply({
        content: `O Império não possuí esse território!`,
        ephemeral: true
      })
    }

    if (preco_base <= 0 || isNaN(preco_base)) {
      return await interaction.reply({
        content: `❌ O preço base é invalido, ele deve ser um número positivo.`,
        ephemeral: true
      })
    }

    if (estoque <= 0 || isNaN(estoque)) {
      return await interaction.reply({
        content: `❌ O estoque é inválido, ele deve ser um número positivo.`,
        ephemeral: true
      });
    }

    const existente = Database.prepare(`SELECT * FROM fazendas_disponiveis WHERE tipo_produto = ? AND provincia = ?`).get(tipo_produto, provincia);

    if (existente) {
      return interaction.reply({
        content: `❌ Já existe uma fazenda desse tipo na província!`,
        ephemeral: true
      })
    }

    Database.prepare(`INSERT INTO fazendas_disponiveis (tipo_produto, provincia, preco_base, quantidade) VALUES (?, ?, ?, ?)`).run(tipo_produto, provincia, preco_base, estoque);


    const embed = new EmbedBuilder()
      .setTitle(`<:database_icon:1196780499381780490> Propriedade Registrada`)
      .setColor("Green")
      .setDescription(`A Fazenda de ${tipo_produto} foi registrada com sucesso no sistema!`)
      .addFields(
        {
          name: `Fazenda de ${tipo_produto}`, value: `Preço base: ${preco_base}`, inline: true
        }, {
        name: `Localização`, value: `Província de ${provincia}`, inline: true
      }, {
        name: `Estoque`, value: `${estoque} disponíveis!`, inline: true
      }
      )

    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    })
  }

  //Menu da compra da fazenda
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_provincia_")) {

    const id = interaction.customId.split("_")[2];
    const provincia = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`modal_fazenda_${id}_${provincia}`)
      .setTitle("Comprar Fazenda");

    const input = new TextInputBuilder()
      .setCustomId("quantidade")
      .setLabel("Quantidade")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  //Comprar Fazendas
  if (interaction.customId.startsWith("modal_fazenda_")) {

    const user = Database.prepare(`SELECT * FROM economia WHERE userId = ?`).get(interaction.user.id);
    const [, , id, provincia] = interaction.customId.split("_");


    const quantidade = parseInt(
      interaction.fields.getTextInputValue("quantidade")
    );

    if (isNaN(quantidade) || quantidade <= 0) {
      return interaction.reply({
        content: "❌ Quantidade inválida.",
        ephemeral: true
      });
    }
    function inflacaoAtual(db) {
      const row = db.prepare(`
      SELECT porcentagem FROM inflacao ORDER BY criado_em DESC LIMIT 1
                                        `).get();
      return row ? row.porcentagem : 0;
    }

    function calcularPreco(precoBase, inflacao) {
      return Math.floor(precoBase * (1 + inflacao));
    }

    const fazenda = Database.prepare(`
          SELECT * FROM fazendas_disponiveis WHERE id = ?
          `).get(id);

    if (!fazenda) {
      return interaction.reply({
        content: "❌ Fazenda não encontrada.",
        ephemeral: true
      });
    }

    // inflação
    const inflacao = inflacaoAtual(Database);

    // preço unitário
    const precoAtual = calcularPreco(fazenda.preco_base, inflacao);

    // total final
    const total = precoAtual * quantidade;

    if (user.dracmas < total) {
      return interaction.reply({
        content: `❌ Saldo insuficiente. Necessário: ${total}`,
        ephemeral: true
      })
    }
    if (fazenda.quantidade < quantidade) {
      return interaction.reply({
        content: `❌ Quantidade indisponível. Estoque atual: ${fazenda.quantidade}`,
        ephemeral: true
      })
    }

    const money_symbol = Database.prepare(`SELECT valor FROM config WHERE chave = 'moeda'`).get().valor || "<:dracma:1396913374721343669>";


    try {

      Database.prepare("BEGIN TRANSACTION").run();

      Database.prepare(`
              INSERT INTO fazendas (donoId, tipo_producao, provincia, level)
                  VALUES (?, ?, ?, 1)
                    `).run(interaction.user.id, fazenda.tipo_produto, provincia);

      Database.prepare(`
                          UPDATE fazendas_disponiveis 
                              SET quantidade = quantidade - ? 
                                  WHERE id = ?
                                    `).run(quantidade, id);

      Database.prepare(`
                                          UPDATE economia 
                                              SET dracmas = dracmas - ? 
                                                  WHERE userId = ?
                                                    `).run(total, interaction.user.id);

      Database.prepare("COMMIT").run();

    } catch (err) {

      Database.prepare("ROLLBACK").run();

      console.error(err);

      return interaction.reply({
        content: "❌ Erro na compra. Nenhuma alteração foi aplicada.",
        ephemeral: true
      });
    }



    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🏛️ Aquisição Confirmada")
      .setDescription(`A propriedade foi integrada ao seu domínio com sucesso.\n\n⚠️ A produção não é automática — é necessário gerenciar sua fazenda para gerar recursos.`)

      .addFields(
        {
          name: "🌱 Propriedade",
          value: `Fazenda de **${fazenda.tipo_produto}**`,
          inline: true
        },
        {
          name: "📍 Localização",
          value: `Província de **${provincia}**`,
          inline: true
        },
        {
          name: "📦 Quantidade",
          value: `**${quantidade} unidade(s)**`,
          inline: true
        },
        {
          name: "💰 Investimento Total",
          value: `${money_symbol}${total}`,
          inline: true
        },
        {
          name: "📈 Produção",
          value: `Até 200kg/semana por unidade\n⚠️ Requer gestão ativa`,
          inline: true
        },
        {
          name: "⚖️ Status",
          value: `Ativa e operando`,
          inline: true
        }
      )

      .setFooter({
        text: "Império Espartano • Ministério do Comércio e Finanças"
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    })
  }

  if(interaction.isStringSelectMenu() && interaction.customId === "plantar_quantidade") {

    const modal = new ModalBuilder()
    .setCustomId(`plantar_qtd`)
    .setTitle("Plantar Sementes");

    const input = new TextInputBuilder()
    .setCustomId("qtd_plantio")
    .setLabel("Quantidade de sementes a plantar")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);

  }

  if(interaction.customId === "plantar_qtd") {
    const quantidade = parseInt(interaction.fields.getTextInputValue("qtd_plantio"));
    const userId = interaction.user.id;

    if(isNaN(quantidade) || quantidade <= 0) {
      return interaction.reply({
        content: `❌ Quantidade inválida.`,
        ephemeral: true,
      })
    }

    
    const fazenda = Database.prepare(`SELECT * FROM fazendas `).get(userId);

    if(interaction.user.id !== fazenda.donoId) {
      return interaction.reply({
        content: `❌ Esta não é sua fazenda.`,
        ephemeral: true,
      })
    }
      Database.prepare(`UPDATE inventario SET quantidade = quantidade - 1 WHERE userId = ? AND item = ?`).run(userId, `semente_${fazenda.tipo_producao}`);
      Database.prepare(`UPDATE fazendas SET ultimo_plantio = ? WHERE id = ?`).run(Date.now(), fazenda.id);

      return interaction.reply({
        content: `🌱 Você plantou ${quantidade} sementes`,
        ephemeral: true
      })
  }

  });

process.on('uncaughtException', err => console.error('uncaughtException', err));
process.on('unhandledRejection', err => console.error('unhandledRejection', err));

client.login(process.env.DISCORD_TOKEN);
