import fs from 'node:fs';
import path from 'node:path';

const databasePath = process.env.DATABASE_PATH;
const backupPath = process.argv[2];

if (!databasePath) {
  console.error('DATABASE_PATH is required');
  process.exit(1);
}

if (!backupPath) {
  console.error('Usage: npm run restore:db -- /absolute/or/relative/path/to/backup.sqlite');
  process.exit(1);
}

const resolvedBackupPath = path.resolve(backupPath);

if (!fs.existsSync(resolvedBackupPath)) {
  console.error(`Backup file not found: ${resolvedBackupPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.copyFileSync(resolvedBackupPath, databasePath);

console.log(`Database restored from: ${resolvedBackupPath}`);
console.log('Stop the app before running restore to avoid SQLite file conflicts.');
