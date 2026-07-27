// ==========================================
// 5. FAZENDA.JS - ARQUIVO COMPLETO (substitua tudo)
// ==========================================
const {
        SlashCommandBuilder,
        ActionRowBuilder,
        StringSelectMenuBuilder,
        AttachmentBuilder,
        ComponentType,
        EmbedBuilder
} = require("discord.js");

const { Database } = require("../../database");
const { renderFazenda } = require("../../system/fazenda/engine/render");
const { getCrop } = require("../../system/fazenda/engine/crops");

module.exports = {
        data: new SlashCommandBuilder()
                .setName("fazenda")
                .setDescription("Gerencie suas terras."),

        async execute(interaction) {
                await interaction.deferReply().catch(() => { });
                const userId = interaction.user.id;

                try {
                        const fazendas = Database.prepare(`
                                                                                                    SELECT * FROM fazendas WHERE donoId = ?
                                                                                                                `).all(userId);

                        if (fazendas.length === 0) {
                                return interaction.editReply("❌ Você não possui fazendas.");
                        }

                        // 1 fazenda = vai direto pro canvas
                        if (fazendas.length === 1) {
                                return await mostrarCanvasFazenda(interaction, fazendas[0]);
                        }

                        // 2+ fazendas = menu de seleção
                        const embedSelecao = new EmbedBuilder()
                                .setTitle("🌾 Suas Propriedades")
                                .setColor("#4caf50")
                                .setDescription("Selecione uma fazenda para gerenciar:")
                                .addFields(
                                        fazendas.map((f, i) => ({
                                                name: `🏡 Fazenda #${i + 1}`,
                                                value: [
                                                        `🌱 **Cultura:** ${f.tipo_producao}`,
                                                        `📍 **Província:** ${f.provincia}`,
                                                        `📦 **Estoque:** ${f.estoque_kg || 0}kg`,
                                                        `⭐ **Nível:** ${f.nivel || 1}`
                                                ].join("\n"),
                                                inline: true
                                        }))
                                )
                                .setFooter({ text: `${fazendas.length} fazendas encontradas` })
                                .setTimestamp();

                        const selectFazenda = new StringSelectMenuBuilder()
                                .setCustomId("selecionar_fazenda")
                                .setPlaceholder("Escolha uma fazenda para gerenciar")
                                .addOptions(
                                        fazendas.map(f => ({
                                                label: `${f.tipo_producao} - ${f.provincia}`,
                                                description: `Estoque: ${f.estoque_kg || 0}kg | Nível ${f.nivel || 1}`,
                                                value: `fazenda_${f.id}`,
                                                emoji: "🌾"
                                        }))
                                );

                        const row = new ActionRowBuilder().addComponents(selectFazenda);

                        return interaction.editReply({
                                embeds: [embedSelecao],
                                components: [row]
                        });

                } catch (error) {
                        console.error("❌ ERRO:", error);
                        return interaction.editReply(`❌ Erro: ${error.message}`);
                }
        },

        mostrarCanvasFazenda
};

// 🎨 Função do canvas (mantida igual, com adições)
async function mostrarCanvasFazenda(interaction, fazenda) {
        const userId = interaction.user.id;
        const ciclo = 7 * 24 * 60 * 1000;

        let progresso = 0;
        if (fazenda.ultimo_plantio) {
                progresso = (Date.now() - fazenda.ultimo_plantio) / ciclo;
                progresso = Math.max(0, Math.min(1, progresso));
        }

        const buffer = await renderFazenda(fazenda, progresso);

        if (!buffer || buffer.length === 0) {
                return interaction.editReply("❌ Erro: Buffer de imagem vazio.");
        }

        const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                        .setCustomId("fazenda_menu")
                        .setPlaceholder("Gerenciar fazenda")
                        .addOptions([
                                { label: "Status", value: "status", emoji: "📊" },
                                { label: "Plantar", value: "plantar", emoji: "🌱" },
                                { label: "Colher", value: "colher", emoji: "🌾" },
                                { label: "Estoque", value: "estoque", emoji: "📦" },
                                { label: "Voltar", value: "voltar", emoji: "🔙" }
                        ])
        );

        const response = interaction.deferred
                ? await interaction.editReply({
                        files: [new AttachmentBuilder(buffer, { name: "fazenda.png" })],
                        components: [row]
                })
                : await interaction.update({
                        files: [new AttachmentBuilder(buffer, { name: "fazenda.png" })],
                        components: [row]
                });

        // 🎮 COLLECTOR
        const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 600000
        });

        collector.on("collect", async i => {
                if (i.user.id !== userId) {
                        return i.reply({ content: "Não é sua fazenda.", ephemeral: true });
                }

                // 🌱 PLANTAR
                if (i.values[0] === "plantar") {
                        await i.deferReply({ ephemeral: true });

                        const sementesPermitidas = Database.prepare(`
                                                                            SELECT tipo_producao FROM fazendas WHERE id = ?
                                                                                    `).get(fazenda.id).tipo_producao;

                        if (!sementesPermitidas) {
                                return i.editReply({ content: "❌ Esta fazenda não pode plantar nada." });
                        }

                        const options = sementesPermitidas.split(",").map(rawTipo => {
                                const tipo = rawTipo.trim();
                                const crop = getCrop(tipo);
                                if (!crop) return null;
                                return {
                                        label: crop.nome || tipo,
                                        value: `plantar:${fazenda.id}:${crop.id || tipo}`
                                };
                        }).filter(Boolean);

                        if (options.length === 0) {
                                return i.editReply({ content: "❌ Nenhuma semente válida." });
                        }

                        const select = new StringSelectMenuBuilder()
                                .setCustomId("plantar_quantidade")
                                .setPlaceholder("Plante sementes")
                                .addOptions(options.slice(0, 25));

                        const rowPlantio = new ActionRowBuilder().addComponents(select);

                        return i.editReply({
                                content: "🌱 Selecione a semente:",
                                components: [rowPlantio]
                        });
                }

                // 🌾 COLHER
                if (i.values[0] === "colher") {
                        const fresca = Database.prepare(`SELECT * FROM fazendas WHERE id = ?`).get(fazenda.id);

                        let progressoAtual = 0;
                        if (fresca.ultimo_plantio) {
                                progressoAtual = (Date.now() - fresca.ultimo_plantio) / ciclo;
                                progressoAtual = Math.max(0, Math.min(1, progressoAtual));
                        }

                        if (progressoAtual < 1) {
                                return i.reply({
                                        content: `❌ Ainda não está pronto! ${(progressoAtual * 100).toFixed(1)}%`,
                                        ephemeral: true
                                });
                        }

                        const producao = 200 * (fresca.nivel || 1);

                        Database.prepare(`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            UPDATE fazendas 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        SET estoque_kg = estoque_kg + ?, ultimo_plantio = NULL 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    WHERE id = ?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            `).run(producao, fresca.id);

                        Database.prepare(`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                UPDATE fazenda_estoque 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            SET quantidade_kg = quantidade_kg + ?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        WHERE fazenda_id = ? AND produto = ?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                `).run(producao, fresca.id, fresca.tipo_producao);

                        const embedColheita = new EmbedBuilder()
                                .setTitle("🌾 Colheita Realizada!")
                                .setColor("#4caf50")
                                .addFields(
                                        { name: "🌱 Cultura", value: fresca.tipo_producao, inline: true },
                                        { name: "📦 Quantidade", value: `+${producao}kg`, inline: true },
                                        { name: "📍 Província", value: fresca.provincia, inline: true },
                                        { name: "📊 Estoque Total", value: `${fresca.estoque_kg + producao}kg`, inline: true }
                                )
                                .setTimestamp();

                        return i.reply({ embeds: [embedColheita], ephemeral: true });
                }

                // 📊 STATUS
                if (i.values[0] === "status") {
                        await i.deferUpdate();
                        const fresca = Database.prepare(`SELECT * FROM fazendas WHERE id = ?`).get(fazenda.id);

                        let progressoAtual = 0;
                        if (fresca.ultimo_plantio) {
                                progressoAtual = (Date.now() - fresca.ultimo_plantio) / ciclo;
                                progressoAtual = Math.max(0, Math.min(1, progressoAtual));
                        }

                        const novoBuffer = await renderFazenda(fresca, progressoAtual);
                        return i.editReply({
                                files: [new AttachmentBuilder(novoBuffer, { name: "fazenda.png" })]
                        });
                }

                // 📦 ESTOQUE
                if (i.values[0] === "estoque") {
                        const fresca = Database.prepare(`SELECT * FROM fazendas WHERE id = ?`).get(fazenda.id);
                        const estoqueDetalhado = Database.prepare(`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    SELECT produto, quantidade_kg 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                FROM fazenda_estoque 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            WHERE fazenda_id = ?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    `).all(fazenda.id);

                        const embedEstoque = new EmbedBuilder()
                                .setTitle("📦 Estoque da Fazenda")
                                .setColor("#8B4513")
                                .addFields(
                                        { name: "📍 Província", value: fresca.provincia, inline: true },
                                        { name: "⭐ Nível", value: `${fresca.nivel || 1}`, inline: true },
                                        { name: "📊 Total Geral", value: `${fresca.estoque_kg || 0}kg`, inline: false }
                                );

                        if (estoqueDetalhado.length > 0) {
                                estoqueDetalhado.forEach(e => {
                                        embedEstoque.addFields({
                                                name: `🌱 ${e.produto}`,
                                                value: `${e.quantidade_kg || 0}kg`,
                                                inline: true
                                        });
                                });
                        }

                        return i.reply({ embeds: [embedEstoque], ephemeral: true });
                }

                // 🔙 VOLTAR
                if (i.values[0] === "voltar") {
                        const fazendas = Database.prepare(`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        SELECT * FROM fazendas WHERE donoId = ?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                `).all(userId);

                        if (fazendas.length === 1) {
                                return i.reply({
                                        content: "❌ Você só tem uma fazenda.",
                                        ephemeral: true
                                });
                        }

                        const embedSelecao = new EmbedBuilder()
                                .setTitle("🌾 Suas Propriedades")
                                .setColor("#4caf50")
                                .setDescription("Selecione uma fazenda para gerenciar:")
                                .addFields(
                                        fazendas.map((f, idx) => ({
                                                name: `🏡 Fazenda #${idx + 1}`,
                                                value: [
                                                        `🌱 **Cultura:** ${f.tipo_producao}`,
                                                        `📍 **Província:** ${f.provincia}`,
                                                        `📦 **Estoque:** ${f.estoque_kg || 0}kg`,
                                                        `⭐ **Nível:** ${f.nivel || 1}`
                                                ].join("\n"),
                                                inline: true
                                        }))
                                )
                                .setFooter({ text: `${fazendas.length} fazendas encontradas` })
                                .setTimestamp();

                        const selectFazenda = new StringSelectMenuBuilder()
                                .setCustomId("selecionar_fazenda")
                                .setPlaceholder("Escolha uma fazenda para gerenciar")
                                .addOptions(
                                        fazendas.map(f => ({
                                                label: `${f.tipo_producao} - ${f.provincia}`,
                                                description: `Estoque: ${f.estoque_kg || 0}kg | Nível ${f.nivel || 1}`,
                                                value: `fazenda_${f.id}`,
                                                emoji: "🌾"
                                        }))
                                );

                        const rowVoltar = new ActionRowBuilder().addComponents(selectFazenda);

                        return i.update({
                                embeds: [embedSelecao],
                                files: [],
                                components: [rowVoltar]
                        });
                }
        });

}