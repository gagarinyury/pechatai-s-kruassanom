import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const databasePath = process.env.DATABASE_PATH;

if (!databasePath) {
  console.error('DATABASE_PATH is required');
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR || path.resolve('backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `croissant-${timestamp}.sqlite`);

fs.mkdirSync(backupDir, { recursive: true });

const db = new Database(databasePath, { readonly: true });

try {
  await db.backup(backupPath);
  console.log(`Backup created: ${backupPath}`);
} finally {
  db.close();
}
