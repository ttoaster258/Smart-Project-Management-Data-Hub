import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'projects.db');

const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync(DB_PATH);
const db = new SQL.Database(fileBuffer);

const result = db.exec('SELECT DISTINCT industry FROM projects WHERE industry IS NOT NULL AND industry != ""');
if (result.length > 0) {
  console.log(result[0].values.map(v => v[0]).join(', '));
} else {
  console.log('No industries found');
}