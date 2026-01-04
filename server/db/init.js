import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', '..', 'data', 'questionair.db');

// Create data directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync(join(__dirname, '..', '..', 'data'), { recursive: true });
  mkdirSync(join(__dirname, '..', '..', 'data', 'voice'), { recursive: true });
} catch (e) {
  // Directory exists
}

const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

console.log('Database schema initialized.');

// Create two default users if they don't exist
const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

if (existingUsers.count === 0) {
  console.log('\nNo users found. Creating default users...');
  console.log('-------------------------------------------');
  
  const user1Id = uuidv4();
  const user2Id = uuidv4();
  
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertSettings = db.prepare(`
    INSERT INTO user_settings (user_id)
    VALUES (?)
  `);
  
  const adriannaHash = bcrypt.hashSync('AdriannaPass', 10);
  const gerrodHash = bcrypt.hashSync('GerrodPass', 10);
  
  db.transaction(() => {
    insertUser.run(user1Id, 'Adrianna', adriannaHash, 'Adrianna');
    insertSettings.run(user1Id);
    
    insertUser.run(user2Id, 'Gerrod', gerrodHash, 'Gerrod');
    insertSettings.run(user2Id);
  })();
  
  console.log('Created two default users:');
  console.log('  Username: Adrianna / Password: AdriannaPass');
  console.log('  Username: Gerrod / Password: GerrodPass');
  console.log('-------------------------------------------');
}

db.close();
console.log('\nDatabase initialization complete.');

