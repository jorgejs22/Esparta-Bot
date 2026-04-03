const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { Database } = require('../../database');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trabalhar')
        .setDescription('Receba seu soldo ou salário imperial de Esparta.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const agora = Date.now();
        const tempoEspera = 24 * 60 * 60 * 1000; // 24 Horas

        // 1. Verificar Cooldown na DB
        const cd = Database.prepare("SELECT ultimo_trabalho FROM cooldowns WHERE userId = ?").get(userId);
        if (cd && (agora - cd.ultimo_trabalho) < tempoEspera) {
               Database.prepare("INSERT OR REPLACE INTO cooldowns (userId, ultimo_trabalho) VALUES (?, ?)").run(userId, 0);
            const restanteMs = tempoEspera - (agora - cd.ultimo_trabalho);
            const horas = Math.floor(restanteMs / (1000 * 60 * 60));
            const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
            return interaction.reply({
                content: `❌ **Aguarde!** Você já coletou seu pagamento. Volte em **${horas}h e ${minutos}min**.`,
                ephemeral: true
            });
        }

        await interaction.deferReply();
        // 2. Lógica de Hierarquia de Cargos (O maior sempre sobrescreve)
        let salario = 50;
        let cargoNome = "Cidadão";

        // Se for Militar
        if (interaction.member.roles.cache.has("1396876903205437660")) {
            salario = 75;
            cargoNome = "Militar";
        }
        // Se for Nobre (Sobrescreve o Militar se tiver os dois)
        if (interaction.member.roles.cache.has("1486178132309573692")) {
            salario = 130;
            cargoNome = "Nobre";
        }

        const imposto = Math.floor(salario * 0.05); // 5% de imposto
        const liquido = salario - imposto;

        // 3. Gerar Imagem com Canvas (Tamanho Realista: 700x450)
        const canvas = createCanvas(700, 450);
        const ctx = canvas.getContext('2d');

        // --- PINTURA ---
        ctx.fillStyle = '#121212'; // Fundo Moderno
        ctx.fillRect(0, 0, 700, 450);

        // Borda Dourada Imperial
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 10;
        ctx.strokeRect(15, 15, 670, 420);

        try {
            // Caminhos das Imagens
            const brasaoPath = path.join(__dirname, '../../assets/brasao.png');
            const dracmaPath = path.join(__dirname, '../../assets/dracma.png');

            const brasaoImg = await loadImage(brasaoPath);
            const dracmaImg = await loadImage(dracmaPath);

            // Brasão no canto superior direito
            ctx.globalAlpha = 0.9;
            ctx.drawImage(brasaoImg, 520, 40, 140, 140);
            ctx.globalAlpha = 1.0;

            // Títulos e Identificação
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 35px sans-serif';
            ctx.fillText('ORDEM DE PAGAMENTO', 50, 80);

            ctx.font = '22px sans-serif';
            ctx.fillText(`Beneficiário: ${interaction.user.username}`, 50, 140);
            ctx.fillText(`Cargo: ${cargoNome}`, 50, 180);

            // Linha Divisória
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(50, 210); ctx.lineTo(450, 210); ctx.stroke();

            // Valores com ícone de Dracma
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '20px sans-serif';
            ctx.drawImage(dracmaImg, 50, 242, 25, 25);
            ctx.fillText(`Salário Bruto: ${salario.toLocaleString('pt-BR')} Dracmas`, 90, 260);

            ctx.fillStyle = '#ff4444';
            ctx.drawImage(dracmaImg, 50, 292, 25, 25);
            ctx.fillText(`Imposto Retido (5%): -${imposto.toLocaleString('pt-BR')} Dracmas`, 90, 310);

            // TOTAL FINAL (O destaque da nota)
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 45px sans-serif';
            ctx.drawImage(dracmaImg, 50, 370, 45, 45);
            ctx.fillText(`${liquido.toLocaleString('pt-BR')} Dracmas`, 110, 410);

        } catch (e) {
            console.log("Erro no Canvas:", e);
            ctx.fillStyle = '#ffffff';
            ctx.fillText("ERRO NOS ASSETS IMPERIAIS", 50, 100);
        }

        // 4. Salvar na Database
        Database.prepare("INSERT OR REPLACE INTO cooldowns (userId, ultimo_trabalho) VALUES (?, ?)").run(userId, agora);
        Database.prepare(`
            INSERT INTO economia (userId, dracmas) 
                VALUES (?, ?) 
                    ON CONFLICT(userId) DO UPDATE SET dracmas = dracmas + ?
                    `).run(userId, liquido, liquido);

        Database.prepare("UPDATE economia SET dracmas = dracmas + ? WHERE userId = 'tesouro_imperial'").run(imposto);

        // 5. Enviar Resposta com Embed e Imagem
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'pagamento.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🏛️ Tesouro Imperial de Esparta`)
            .setDescription(`Seu soldo foi processado. Pela glória de **Esparta**!`)
            .setColor("#d4af37")
            .setImage('attachment://pagamento.png')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    }
};
