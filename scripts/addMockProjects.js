import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'projects.db');

// 生成随机数的辅助函数
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 生成精确到千位的金额
function randomThousand(minThousand, maxThousand) {
  const thousand = randomInt(minThousand, maxThousand);
  return thousand * 1000;
}

// 随机日期生成器（2025年立项，2026年验收）
function randomKickoffDate() {
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomAcceptanceDate() {
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomPlannedEndDate(kickoffDate) {
  const kickoff = new Date(kickoffDate);
  const duration = randomInt(3, 12);
  const planned = new Date(kickoff);
  planned.setMonth(planned.getMonth() + duration);
  return planned.toISOString().split('T')[0];
}

// 项目数据
const regions = ['东区', '西区', '南区', '北区', '创景可视'];
const industries = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
const statuses = ['正在进行', '验收', '延期', '暂停'];
const phases = ['需求分析', '系统设计', '开发实施', '测试验收', '运维支持'];
const types = ['开发项目', '销售项目', '混合项目', '内部项目'];
const levels = ['重大项目（B类项目）', '重点项目（C类项目）', '常规项目（D类项目）', '核心项目（A类项目）'];
const securityLevels = ['公开', '内部', '秘密'];

const managers = ['张伟', '李娜', '王强', '刘敏', '陈刚', '杨洋', '赵静', '孙丽', '周杰', '吴涛'];
const directors = ['李华', '王芳', '刘强', '陈敏', '张静', '杨杰', '赵涛', '孙丽', '周华', '吴敏'];

let projectIndex = 1;
function generateProjectId() {
  return `PROJ-2025-${String(projectIndex++).padStart(3, '0')}`;
}

function generateProjectCode() {
  const year = 2025;
  const num = randomInt(100, 999);
  return `PJ${year}${num}`;
}

// 生成20个项目数据
const projects = [];
for (let i = 1; i <= 20; i++) {
  const kickoffDate = randomKickoffDate();
  const acceptanceDate = randomAcceptanceDate();
  const plannedEndDate = randomPlannedEndDate(kickoffDate);

  const contractAmount = randomThousand(50, 500);
  const historicalPaid = randomThousand(Math.floor((contractAmount * 0.3) / 1000), Math.floor((contractAmount * 0.7) / 1000));
  const paid2025 = randomThousand(Math.floor((contractAmount * 0.2) / 1000), Math.floor((contractAmount * 0.5) / 1000));
  const pending = Math.max(0, contractAmount - historicalPaid - paid2025);
  const pendingThisYear = Math.max(0, contractAmount - historicalPaid);

  const totalBudget = randomThousand(Math.floor((contractAmount * 0.8) / 1000), Math.floor((contractAmount * 0.95) / 1000));
  const internalCost = randomThousand(Math.floor((contractAmount * 0.5) / 1000), Math.floor((contractAmount * 0.7) / 1000));
  const internalProfit = contractAmount - internalCost;

  const plannedTotal = randomInt(50, 200);
  const actualTB = Math.floor(plannedTotal * randomFloat(0.3, 0.8));

  const progress = randomInt(40, 100);
  const inputPercent = Math.floor((actualTB / plannedTotal) * 100);

  projects.push({
    id: generateProjectId(),
    project_code: generateProjectCode(),
    project_name: `模拟项目${i}`,
    security_level: randomItem(securityLevels),
    status: randomItem(statuses),
    status_comment: '项目进展顺利',
    risk_reason: '',
    forecast_acceptance_date: acceptanceDate,
    main_work_completed: '已完成',
    budget_usage: `${randomInt(60, 95)}%`,
    margin_rate: `${randomFloat(10, 30).toFixed(1)}%`,
    forecast_2026_revenue: randomThousand(Math.floor((contractAmount * 0.3) / 1000), Math.floor((contractAmount * 0.6) / 1000)),
    forecast_2026_loss_revenue: 0,
    outsourcer_name: Math.random() > 0.6 ? randomItem(['科技外协公司', '信息服务公司', '系统集成商']) : '',
    outsourcer_amount: Math.random() > 0.6 ? randomThousand(Math.floor((contractAmount * 0.1) / 1000), Math.floor((contractAmount * 0.3) / 1000)) : 0,
    outsourcer_tech_content: '',
    equipment_spec: '',
    outsourcer_ratio: Math.random() > 0.6 ? `${randomInt(10, 30)}%` : '',
    received_thank_you_date: randomInt(1, 10) > 7 ? '2026-03-15' : '',
    document_received_date: randomInt(1, 10) > 6 ? '2026-02-20' : '',
    remarks: '项目按计划推进，无重大风险',
    phase: randomItem(phases),
    type: randomItem(types),
    level: randomItem(levels),
    industry: randomItem(industries),
    region: randomItem(regions),
    is_benchmark: Math.random() > 0.8 ? 1 : 0,
    is_highlight: Math.random() > 0.8 ? 1 : 0,
    kickoff_date: kickoffDate,
    planned_end_date: plannedEndDate,
    contract_end_date: plannedEndDate,
    acceptance_date: acceptanceDate,
    delay_months: 0,
    acceptance_year: '2026',
    acceptance_control: '可控',
    contract_name: `模拟项目${i}合同`,
    group_company: randomItem(['集团总部', '华东分公司', '华南分公司', '华北分公司']),
    contract_amount: contractAmount,
    historical_paid: historicalPaid,
    paid_2026: paid2025,
    pending: pending,
    pending_this_year: pendingThisYear,
    ratio: 0,
    total_paid: historicalPaid + paid2025,
    annual_confirmed_revenue: randomThousand(Math.floor((contractAmount * 0.2) / 1000), Math.floor((contractAmount * 0.5) / 1000)),
    accepted_pending_revenue: randomThousand(Math.floor((contractAmount * 0.1) / 1000), Math.floor((contractAmount * 0.3) / 1000)),
    initial_quote: randomThousand(Math.floor((contractAmount * 1.1) / 1000), Math.floor((contractAmount * 1.2) / 1000)),
    req_evaluation_fee: Math.max(0, randomThousand(0, Math.floor((contractAmount * 0.03) / 1000))),
    internal_cost: internalCost,
    internal_profit: internalProfit,
    total_budget: totalBudget,
    budget_used_amount: randomThousand(Math.floor((totalBudget * 0.5) / 1000), Math.floor((totalBudget * 0.8) / 1000)),
    planned_total: plannedTotal,
    actual_tb: actualTB,
    pmo_annual_total: actualTB,
    progress: progress,
    input_percent: inputPercent,
    pre_sales_total: randomInt(80, 95),
    execution_total: randomInt(85, 98),
    quality_score_raw: randomInt(85, 95),
    project_manager: randomItem(managers),
    pre_sales_manager: randomItem(managers),
    sales_manager: randomItem(managers),
    project_director: randomItem(directors),
    team_members: '[]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

// 初始化数据库并插入数据
async function updateProjects() {
  console.log('正在初始化数据库...');
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_PATH)) {
    console.error(`数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  console.log('数据库加载成功');

  // 先删除旧的模拟项目
  console.log('\n删除旧的模拟项目...');
  for (let i = 1; i <= 20; i++) {
    try {
      const result = db.exec(`DELETE FROM projects WHERE project_name = '模拟项目${i}' OR project_name LIKE '%智慧城市%' OR project_name LIKE '%企业数字%' OR project_name LIKE '%智慧医疗%' OR project_name LIKE '%金融风控%' OR project_name LIKE '%智能制造%' OR project_name LIKE '%教育资源%' OR project_name LIKE '%智慧交通%' OR project_name LIKE '%能源管理%' OR project_name LIKE '%零售业ERP%' OR project_name LIKE '%政务服务%' OR project_name LIKE '%供应链%' OR project_name LIKE '%客户关系%' OR project_name LIKE '%人力资源%' OR project_name LIKE '%财务共享%' OR project_name LIKE '%物联网%' OR project_name LIKE '%大数据%' OR project_name LIKE '%人工智能%' OR project_name LIKE '%云服务%' OR project_name LIKE '%移动办公%' OR project_name LIKE '%电子商务%'`);
      if (result.length > 0 && result[0].values.length > 0) {
        console.log(`✓ 删除 ${result[0].values[0][0]} 行`);
      }
    } catch (error) {
      console.error(`删除出错: ${error.message}`);
    }
  }

  // 插入新项目
  console.log('\n插入新的模拟项目...');
  let successCount = 0;
  let failedCount = 0;

  for (const project of projects) {
    try {
      const columns = Object.keys(project).join(', ');
      const placeholders = Object.keys(project).map(() => '?').join(', ');
      const values = Object.values(project);

      const sql = `INSERT OR IGNORE INTO projects (${columns}) VALUES (${placeholders})`;
      db.run(sql, values);

      successCount++;
      console.log(`✓ 成功插入: ${project.project_name} (${project.id}) - 行业: ${project.industry}`);
    } catch (error) {
      failedCount++;
      console.error(`✗ 插入失败: ${project.project_name} - ${error.message}`);
    }
  }

  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log('\n数据库已保存');

  console.log(`\n完成! 成功: ${successCount}, 失败: ${failedCount}`);
}

updateProjects().catch(console.error);