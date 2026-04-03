const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

function normalizar(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("registro-teste")
        .setDescription("Registrar participantes de um evento")
        .addStringOption(option =>
            option.setName("participantes")
                .setDescription("Separe por ; (menção, nome ou ID)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("evento")
                .setDescription("Nome/ID do Evento")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const participantesStr = interaction.options.getString("participantes");
        const eventId = interaction.options.getString("evento");

        const participantes = participantesStr.split(";").map(p => p.trim()).filter(p => p.length > 0);

        const guild = interaction.guild;

        const participantesValidos = [];
        const invalidos = [];

        //Buscar todos os membros do servidor para garantir que o cache esteja completo
        await guild.members.fetch();
        
        for (const participante of participantes) {

            let member = null;

            // 🔹 1. MENÇÃO
            const match = participante.match(/^<@!?(\d+)>$/);
            if (match) {
                const id = match[1];
                member = guild.members.cache.get(id);
            }

            // 🔹 2. ID
            if (!member && /^\d+$/.test(participante)) {
                member = guild.members.cache.get(participante);
            }

            // 🔹 3. NOME
            if (!member) {
                const nome = normalizar(participante);

                member = guild.members.cache.find(m => {
                    const display = normalizar(m.displayName);
                    const username = normalizar(m.user.username);

                    return (
                        display.endsWith(nome) || // "Cargo, Nome"
                        display === nome ||
                        username === nome
                    );
                });
            }

            if (member) {
                participantesValidos.push(member);
            } else {
                invalidos.push(participante);
            }
        }

        // Remove duplicados
        const participantesUnicos = [...new Map(participantesValidos.map(m => [m.id, m])).values()];

        const participantesIds = participantesUnicos.map(p => p.id);

        const todosMembros = guild.members.cache.filter(m => !m.user.bot);

        const naoParticiparam = todosMembros.filter(m => !participantesIds.includes(m.id));

        // Cargos de isenção
        const nobrezaId = "1059434664663719966";
        const monarcaId = "1059437488378232872";

        const naoParticiparamFiltrado = naoParticiparam.filter(m =>
            !m.roles.cache.has(nobrezaId) &&
            !m.roles.cache.has(monarcaId)
        );

             //Total de participantes faltantes (excluindo isentos)
       const faltantes = [...naoParticiparamFiltrado.values()];
        const preview = faltantes.slice(0, 5).map(u => u.user.tag).join("\n");
        const textoFaltantes = faltantes.length > 0 ? `${preview} e mais **${faltantes.length - 5} pessoas...**` : "Todos participaram ou estão isentos";
        //Total de participantes presentes
        const presentes = [...participantesUnicos.values()];
        const textoPresentes = presentes.length > 0 ? `${presentes.length}` : "0";
        //Total de não encontrados
        const textoInvalidos = invalidos.length > 0 ? `${invalidos.length}` : "0";


        //Adicionar presença 
        const embed = new EmbedBuilder()
            .setTitle(`📋 Registro de Evento Concluído`)
            .setDescription(`Evento: **${eventId}**`)
            .addFields(
                {
                    name: `<:EZ:1386470845982965890> Participantes **(${textoPresentes})**`,
                    value: participantesUnicos.map(p => p.user.tag).join("\n") || "Nenhum participante válido encontrado",
                    inline: false
                },
                {
                    name: `<:emoji_7:1306767826765479976> Não Encontrados **(${textoInvalidos})**`,
                    value: invalidos.join(", ") || "Todos foram encontrados!",
                    inline: false
                },
                {
                    name: `<:STK20240228WA0000:1386474716918841414> Não Participaram **(${faltantes.length})**`,
                    value: textoFaltantes,
                    inline: false
                }
            )
            .setColor(invalidos.length > 0 ? "Yellow" : "Green")
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed]
        });
    }
};