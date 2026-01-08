import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', '..', 'data', 'questionair.db');

// Ensure data directories exist
try {
  mkdirSync(join(__dirname, '..', '..', 'data'), { recursive: true });
  mkdirSync(join(__dirname, '..', '..', 'data', 'voice'), { recursive: true });
  mkdirSync(join(__dirname, '..', '..', 'data', 'uploads'), { recursive: true });
} catch (e) {
  // Directories exist
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-apply schema on startup (CREATE IF NOT EXISTS is safe for existing tables)
try {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
} catch (err) {
  console.error('Failed to apply schema:', err.message);
}

export default db;



