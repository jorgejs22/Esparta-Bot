const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'bot.db');

const DatabaseModule = {
  db: null,

  init() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Esquema inicial do bot
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
         )
      `).run();

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS economia (
        userId TEXT PRIMARY KEY,
        dracmas INTEGER DEFAULT 0
            )
      `).run()

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS patente (
       userId TEXT PRIMARY KEY,
       cargo TEXT,
       salario INTEGER DEFAULT 0
    )
  `).run();

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS pontuacao (
       userId TEXT PRIMARY KEY,
       presencas INTEGER DEFAULT 0,
       faltas INTEGER DEFAULT 0,
       pontos INTEGER DEFAULT 0
      )
   `).run();
    this.db.prepare(`
     CREATE TABLE IF NOT EXISTS inflacao (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       porcentagem REAL NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
      .run();

    this.db.prepare(`
        INSERT OR IGNORE INTO inflacao (id, porcentagem) VALUES (1, 0) 
        `).run();

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS mercado (
        itemId INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
        preco_base INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        estoque INTEGER DEFAULT 0
    )`)
      .run();

    this.db.prepare(`
        CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
        )
        `).run();

    this.db.prepare(`
          INSERT OR IGNORE INTO config (chave, valor)
          VALUES ('moeda', '<:dracma:1396913374721343669>')
          `).run();

    this.db.prepare(`
            CREATE TABLE IF NOT EXISTS cooldowns (
              userId TEXT PRIMARY KEY,
              ultimo_trabalho INTEGER
            )`).run();
    // Tabela de Propriedades (Fazendas e Casas)
    this.db.prepare(`
                CREATE TABLE IF NOT EXISTS fazendas (
           id INTEGER PRIMARY KEY,
           donoId TEXT,
           provincia TEXT,
           tipo_producao TEXT,
           ultimo_plantio INTEGER,
           level INTEGER DEFAULT 0,
           estoque_kg REAL DEFAULT 0
          )
       `).run();

    this.db.prepare(`
          CREATE TABLE IF NOT EXISTS fazendas_disponiveis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_produto TEXT,
            provincia TEXT,
            quantidade INTEGER,
            preco_base INTEGER NOT NULL
          )
          `).run();

        
    return Promise.resolve();
  },

  ensure() {
    if (!this.db) throw new Error('Database não inicializada. Chame Database.init() primeiro.');
  },

  createTable(name, schema) {
    this.ensure();
    this.db.prepare(`CREATE TABLE IF NOT EXISTS ${name} (${schema})`).run();
  },

  execute(sql, params = []) {
    this.ensure();
    return this.db.prepare(sql).run(...params);
  },

  query(sql, params = []) {
    this.ensure();
    return this.db.prepare(sql).all(...params);
  },

  get(sql, params = []) {
    this.ensure();
    return this.db.prepare(sql).get(...params);
  },

  prepare(sql) {
    this.ensure();
    return this.db.prepare(sql);
  },
};

module.exports = { Database: DatabaseModule };
