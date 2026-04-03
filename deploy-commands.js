require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadCommands(dir) {
  const commands = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      commands.push(...loadCommands(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(entryPath);
      if (command.data) commands.push(command.data.toJSON());
    }
  }

  return commands;
}

const commands = loadCommands(path.join(__dirname, 'commands'));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🚀 Registrando ${commands.length} comandos de barra...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Comandos registrados com sucesso.');
  } catch (error) {
    console.error(error);
  }
})();
