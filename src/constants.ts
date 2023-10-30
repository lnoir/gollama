export const DB_FILENAME = 'gollama.db';

export const DB_CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY,
    title TEXT,
    model TEXT NOT NULL,
    started DATE NOT NULL,
    context TEXT,
    system_msg TEXT,
    top_k INTEGER DEFAULT 0,
    top_p INTEGER DEFAULT 0,
    seed INTEGER DEFAULT 0,
    num_ctx INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    conversationId INTEGER NOT NULL,
    senderType TEXT NOT NULL,
    text TEXT NOT NULL,
    time DATE NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    value TEXT DEFAULT "0",
    defaultVal TEXT DEFAULT "0"
  )`
];