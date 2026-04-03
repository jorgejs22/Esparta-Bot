const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas"); // Faltava isso
const { Database } = require("../../database");
const path = require("path"); // Faltava isso

module.exports = {
        data: new SlashCommandBuilder()
                .setName("saldo") // Corrigido de setTitle para setName
                .setDescription("Veja suas posses, investimentos e prestígio em Esparta.")
                .addUserOption(option => 
                        option.setName("usuario")
                        .setDescription(`O cidadão que você deseja consultar (opcional)`)
                        .setRequired(false)
                ),

        async execute(interaction) {
                await interaction.deferReply();

                const alvo = interaction.options.getUser("usuario") || interaction.user;
                const userId = alvo.id // Corrigido para userId

                // Protótipos
                const investimentos = 0;
                const prestigio = 50;

                // 1. Buscar dados na DB (Corrigido para 'dracmas')
                const rowEcono = Database.prepare(`SELECT dracmas FROM economia WHERE userId = ?`).get(userId);
                const dracmasLiquidos = rowEcono ? rowEcono.dracmas : 0;

                // 2. Preparar Canvas
                const canvas = createCanvas(700, 450);
                const ctx = canvas.getContext('2d');

                // --- PINTURA ---
                ctx.fillStyle = '#121212';
                ctx.fillRect(0, 0, 700, 450);
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 10;
                ctx.strokeRect(15, 15, 670, 420);

                try {
                        // 3. Carregar Imagens
                        const brasao = await loadImage(path.join(__dirname, '../../assets/brasao.png'));
                        const dracmaImg = await loadImage(path.join(__dirname, '../../assets/dracma.png'));
                        ctx.drawImage(brasao, 310, 30, 80, 80);
                        // 4. Nome e Cabeçalho
                        ctx.fillStyle = '#ffffff';
                        ctx.textAlign = 'center';
                        ctx.font = 'bold 30px sans-serif';
                        ctx.fillText(alvo.username.toUpperCase(), 350, 140);
                        ctx.font = '20px sans-serif';
                        ctx.fillStyle = '#aaaaaa';
                        ctx.fillText("LINHAGEM DE ESPARTA", 350, 170);

                        // 5. Divisória
                        ctx.strokeStyle = '#333333';
                        ctx.beginPath(); ctx.moveTo(350, 200); ctx.lineTo(350, 380); ctx.stroke();

                        // 6. LADO ESQUERDO: Liquidez (Corrigido saldoAtual -> dracmasLiquidos)
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 22px sans-serif';
                        ctx.fillText('LIQUIDEZ', 60, 220);

                        ctx.drawImage(dracmaImg, 60, 240, 30, 30);
                        ctx.fillStyle = '#d4af37';
                        ctx.font = 'bold 35px sans-serif';
                        ctx.fillText(`${dracmasLiquidos.toLocaleString('pt-BR')}`, 100, 270);
                        ctx.font = '15px sans-serif';
                        ctx.fillText('DRACMAS DISPONÍVEIS', 100, 290);

                        // 7. LADO DIREITO: Investimentos (Corrigido totalAcoes -> investimentos)
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 22px sans-serif';
                        ctx.fillText('INVESTIMENTOS', 380, 220);

                        ctx.fillStyle = '#66ff66';
                        ctx.font = 'bold 30px sans-serif';
                        ctx.fillText(`+ ${investimentos.toLocaleString('pt-BR')}`, 380, 265);
                        ctx.font = '15px sans-serif';
                        ctx.fillStyle = '#aaaaaa';
                        ctx.fillText('VALOR EM AÇÕES (SSE)', 380, 285);

                        // 8. RODAPÉ: Prestígio
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 18px sans-serif';
                        ctx.fillText('NÍVEL DE PRESTÍGIO FAMILIAR', 60, 350);

                        ctx.fillStyle = '#333333';
                        ctx.fillRect(60, 365, 580, 20);
                        ctx.fillStyle = '#d4af37';
                        const larguraPrestigio = (prestigio / 100) * 580;
                        ctx.fillRect(60, 365, larguraPrestigio, 20);

                } catch (e) {
                        console.log("Erro no Canvas:", e);
                }

                // 9. Enviar
                const buffer = canvas.toBuffer();
                const attachment = new AttachmentBuilder(buffer, { name: 'extrato.png' });

                const embed = new EmbedBuilder()
                        .setTitle(`🏦 Extrato Imperial de ${interaction.user.username}`)
                        .setDescription(`Relatório Oficial do **Ministério do Comércio e Finanças**`)
                        .setColor("#d4af37")
                        .setImage('attachment://extrato.png')
                        .setTimestamp();

                await interaction.editReply({
                        embeds: [embed],
                        files: [attachment]
                });
        }
};
