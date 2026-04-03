const {
        SlashCommandBuilder,
        ActionRowBuilder,
        StringSelectMenuBuilder,
        AttachmentBuilder,
        ComponentType,
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle
} = require("discord.js");

const { Database } = require("../../database");
const { renderFazenda } = require("../../system/fazenda/engine/render");
const { obterBioma } = require("../../system/fazenda/engine/biome");
const { getCrop } = require("../../system/fazenda/engine/crops");

module.exports = {
        data: new SlashCommandBuilder()
                .setName("fazenda")
                .setDescription("Gerencie suas terras."),

        async execute(interaction) {
                // 1. Diz ao Discord para esperar (evita o erro de 3 segundos)
                await interaction.deferReply().catch(() => { });

                const userId = interaction.user.id;

                try {
                        const fazenda = Database.prepare(`SELECT * FROM fazendas WHERE donoId = ?`).get(userId);

                        if (!fazenda) {
                                return interaction.editReply("❌ Você não possui fazendas.");
                        }

                        console.log("📍 Fazenda encontrada:", {
                                provincia: fazenda.provincia,
                                tipo_producao: fazenda.tipo_producao,
                                nivel: fazenda.nivel,
                                clima: fazenda.clima
                        });

                        const ciclo = 7 * 24 * 60 * 60 * 1000;
                        let progresso = 0;

                        if (fazenda.ultimo_plantio) {
                                progresso = (Date.now() - fazenda.ultimo_plantio) / ciclo;
                                progresso = Math.max(0, Math.min(1, progresso));
                        }

                        // 2. RENDERIZAÇÃO
                        console.log("🎨 Iniciando renderização...");
                        const buffer = await renderFazenda(fazenda, progresso);
                        console.log("✅ Renderização concluída:", buffer.length, "bytes");

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
                                                { label: "Colher", value: "colher", emoji: "🌾" }
                                        ])
                        );

                        // 3. ENVIA A IMAGEM
                        const response = await interaction.editReply({
                                files: [new AttachmentBuilder(buffer, { name: "fazenda.png" })],
                                components: [row]
                        });

                        // --- INÍCIO DO COLLECTOR ---
                        const collector = response.createMessageComponentCollector({
                                componentType: ComponentType.StringSelect,
                                time: 600000
                        });

                        collector.on("collect", async i => {

                                if (i.user.id !== userId) {
                                        return i.reply({ content: "Não é sua fazenda.", ephemeral: true });
                                }

                                if (i.values[0] === "plantar") {
                                        await i.deferReply({ ephemeral: true });

                                        const sementesPermitidas = Database.prepare(`SELECT tipo_producao FROM fazendas WHERE id = ? `).get(fazenda.id).tipo_producao;

                                        if (!sementesPermitidas) {
                                                return i.editReply({ content: "❌ Esta fazenda não pode plantar nada." });
                                        }

                                        const options = sementesPermitidas.split(",").map(rawTipo => {
                                                const tipo = rawTipo.trim();
                                                const crop = getCrop(tipo);

                                                if (!crop) {
                                                        console.warn(`[fazenda.js] tipo_producao inválido em sementesPermitidas: ${tipo}`);
                                                        return null;
                                                }

                                                return {
                                                        label: crop.nome || tipo,
                                                        value: `plantar:${crop.id || tipo}`
                                                };
                                        }).filter(Boolean);

                                        if (options.length === 0) {
                                                return i.editReply({ content: "❌ Nenhuma semente válida encontrada." });
                                        }

                                        const select = new StringSelectMenuBuilder()
                                                .setCustomId("plantar_quantidade")
                                                .setPlaceholder("Plante sementes")
                                                .addOptions(options.slice(0, 25));

                                        const row = new ActionRowBuilder().addComponents(select);

                                        return i.editReply({
                                                content: `Selecione a semente que deseja plantar:`,
                                                components: [row]
                                        })
                                }

                                if (i.values[0] === "colher") {
                                        await i.deferUpdate();

                                        if (progresso < 1) {
                                                return i.editReply({ content: "❌ Ainda não está pronto." });
                                        }

                                        Database.prepare(`UPDATE fazendas SET estoque_kg = estoque_kg + 200, ultimo_plantio = NULL WHERE id = ?`).run(fazenda.id);

                                        return i.editReply({ content: "🌾 Colhido +200kg." });
                                }

                                if (i.values[0] === "status") {
                                        await i.deferUpdate(); // Avisa o Discord na hora que recebeu o clique
                                        const novoBuffer = await renderFazenda(fazenda, progresso);
                                        return await i.editReply({
                                                files: [new AttachmentBuilder(novoBuffer, { name: "fazenda.png" })]
                                        });
                                }
                        });
                } catch (error) {
                        console.error("❌ ERRO COMPLETO:", {
                                message: error.message,
                                stack: error.stack,
                                code: error.code
                        });

                        const errorMsg = error.message || "Erro desconhecido";
                        const userMsg = `❌ Erro na geração da fazenda: ${errorMsg}`;

                        if (interaction.deferred || interaction.replied) {
                                return await interaction.editReply(userMsg);
                        } else {
                                return await interaction.reply(userMsg);
                        }
                }
        }
}