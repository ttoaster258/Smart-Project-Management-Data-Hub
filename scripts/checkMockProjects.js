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

const result = db.exec("SELECT project_name, kickoff_date, acceptance_date, industry FROM projects WHERE project_name LIKE '模拟项目%' ORDER BY project_name");
if (result.length > 0) {
  console.log('找到模拟项目:');
  result[0].values.forEach(row => {
    console.log(`${row[0]} | 立项: ${row[1]} | 验收: ${row[2]} | 行业: ${row[3]}`);
  });
  console.log(`\n共 ${result[0].values.length} 个模拟项目`);
} else {
  console.log('未找到模拟项目');
}

// 查询总项目数
const totalResult = db.exec('SELECT COUNT(*) FROM projects');
console.log(`\n数据库中总项目数: ${totalResult[0].values[0][0]}`);