import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'projects.db');

// 固定的6个行业
const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];

// 随机选择一个行业
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function updateAllIndustries() {
  console.log('正在初始化数据库...');
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_PATH)) {
    console.error(`数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  console.log('数据库加载成功');

  // 查询所有项目
  const result = db.exec('SELECT id, project_name, industry FROM projects');

  if (result.length === 0) {
    console.log('数据库中没有项目');
    return;
  }

  const projects = result[0].values;
  console.log(`\n找到 ${projects.length} 个项目`);

  // 更新每个项目的行业
  console.log('\n开始更新行业字段...');
  let successCount = 0;
  let failedCount = 0;

  db.run('BEGIN TRANSACTION');

  for (const [id, projectName, currentIndustry] of projects) {
    try {
      const newIndustry = randomItem(FIXED_INDUSTRIES);
      db.run('UPDATE projects SET industry = ? WHERE id = ?', [newIndustry, id]);
      successCount++;
      console.log(`✓ 更新: ${projectName} (${id}) - ${currentIndustry || '(无)'} → ${newIndustry}`);
    } catch (error) {
      failedCount++;
      console.error(`✗ 更新失败: ${projectName} (${id}) - ${error.message}`);
    }
  }

  db.run('COMMIT');

  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log('\n数据库已保存');

  console.log(`\n完成! 成功: ${successCount}, 失败: ${failedCount}`);
}

updateAllIndustries().catch(console.error);