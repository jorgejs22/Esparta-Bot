# EMPRÔS SPARTA! 🛡️
# Esparta-Bot
Bot Discord.js v14 com SQLite (SQL) como database

## ✅ Instalação

1. Copie o repositório para seu workspace.
2. Crie arquivo `.env` com:
   - `DISCORD_TOKEN` (token do bot)
      - `CLIENT_ID` (ID do aplicativo do bot)
         - `GUILD_ID` (ID do servidor onde os slash commands serão registrados, opcional para registro em guild)

         3. Instale dependências:
            - `npm install`

            4. Inicie o bot (o código já registra comandos automaticamente no servidor/guild ou global em `ready`):
               - `npm start`

               ## 🛠️ Scripts úteis

               - `npm start` -> executa `node index.js`
               - `npm run deploy` -> opcional para deploy manual via `deploy-commands.js`

               Adicione no `package.json`:

               ```json
               "scripts": {
                 "start": "node index.js",
                   "deploy": "node deploy-commands.js"
                   }
                   ```

                   ## 📁 Estrutura

                   - `index.js` -> inicializa cliente Discord, carrega comandos e registra slash commands automaticamente
                   - `database.js` -> init SQLite e manipula pontos
                   - `commands/` -> comandos /ping /setpoints /getpoints e pode conter subpastas
                   - `data/bot.db` -> banco de dados SQLite (gerado automaticamente)

                   ## 🧠 Banco de dados SQL (SQLite)

                   O bot usa `better-sqlite3` (SQLite) para persistir pontos em `data/bot.db`.

                   - Tabela `users`:
                     - `id` (TEXT PRIMARY KEY)
                       - `points` (INTEGER)

                       Comandos:
                       - `/setpoints usuário quantidade` -> define pontos
                       - `/getpoints [usuário]` -> consulta pontos

                       ## 🚀 Como usar

                       1. Crie o bot em https://discord.com/developers
                       2. Conceda permissão de `applications.commands` e `bot`.
                       3. Preencha `.env`.
                       4. `npm run deploy`
                       5. `npm start`
                       6. No Discord, use `/ping`, `/setpoints`, `/getpoints`

                       ## 💡 Aprendizado SQL

                       No `database.js` você aprenderá:
                       - criação de tabela (`CREATE TABLE IF NOT EXISTS`)
                       - consultas com `SELECT`
                       - inserção/atualização com `INSERT ... ON CONFLICT`
                       - uso de transação e preparação de statements
                       - acesso por ID único de usuário do Discord

