import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// 获取正确的 XLSX 函数
const xlsx = XLSX as any;
const readXlsxFile = xlsx.readFile || xlsx.default?.readFile;

// 配置
const DB_PATH = path.join(process.cwd(), 'data', 'projects.db');
const EXCEL_PATH = path.join(process.cwd(), 'public', 'new_data_updated_formatted.xlsx');

/**
 * 从 Excel 文件读取项目数据
 */
function readExcelData(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`Excel 文件不存在: ${filePath}`);
    return [];
  }

  const workbook = readXlsxFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`从 Excel 读取到 ${data.length} 条记录`);
  return data;
}

/**
 * 将 Excel 行转换为项目对象
 */
function transformExcelRow(row: any, index: number) {
  const id = row['项目编号']?.toString() || `PROJ-${index}`;
  const projectName = row['项目名称']?.toString() || '未命名项目';

  // 密级脱敏
  const slRaw = row['密级']?.toString() || '';
  let securityLevel = '';
  if (slRaw === 'NB' || slRaw === 'SM' || slRaw === 'TM') {
    securityLevel = slRaw;
  } else if (slRaw.includes('机密')) {
    securityLevel = 'TM';
  } else if (slRaw.includes('涉密')) {
    securityLevel = 'SM';
  } else if (slRaw.includes('内部') || slRaw.includes('公开') || slRaw.includes('普通')) {
    securityLevel = 'NB';
  }

  // 解析状态
  const statusRaw = row['项目状态']?.toString() || '';
  let status = '正在进行';
  if (statusRaw.includes('延期')) status = '延期';
  else if (statusRaw.includes('暂停')) status = '暂停';
  else if (statusRaw.includes('验收') || statusRaw.includes('已验收')) status = '验收';

  // 解析变更
  const changeCount = parseInt(row['变更次数']?.toString() || '0');
  const changeTypes = (row['变更类型']?.toString() || '').split('\n').filter((s: string) => s.trim());
  const changeReasons = (row['变更原因']?.toString() || '').split('\n').filter((s: string) => s.trim());
  const changeDates = (row['最近变更通过时间']?.toString() || '').split('\n').filter((s: string) => s.trim());

  const changes = Array.from({ length: Math.max(changeCount, changeTypes.length) }).map((_, i) => ({
    id: `${id}-CHG-${i}`,
    type: changeTypes[i] || '计划变更',
    reason: changeReasons[i] || '常规调整',
    content: '',
    before: '--',
    after: '--',
    impactsPerformance: (changeTypes[i] || '').includes('重大') || (changeReasons[i] || '').includes('延迟'),
    date: changeDates[0] || row['最近变更通过时间']?.toString() || ''
  }));

  // 财务数据
  const historicalPaid = parseFloat(row['历史回款']?.toString() || '0');
  const paid2026 = parseFloat(row['2026已回款']?.toString() || '0');
  const totalPaid = historicalPaid + paid2026;
  const pending = parseFloat(row['剩余回款金额']?.toString() || '0');
  const contractAmount = parseFloat(row['合同总额']?.toString() || '0');

  // 人员工时数据
  const plannedTotal = parseFloat(row['项目整体计划总工时 (人周)']?.toString() || '0');
  const actualTB = parseFloat(row['项目整体实际总工时 (人周)']?.toString() || '0');

  // 质量评分
  const qualityScoreRaw = parseFloat(row['质量评分']?.toString() || '0');
  const executionTotal = (qualityScoreRaw / 15) * 100;

  return {
    id,
    projectCode: id,
    projectName,
    securityLevel,
    status,
    statusComment: row['项目状态说明']?.toString() || statusRaw,
    riskReason: '',
    forecastAcceptanceDate: row['预测验收时间']?.toString() || '',
    mainWorkCompleted: row['主体工作是否完成']?.toString() || '',
    budgetUsage: row['预算使用情况']?.toString() || '',
    marginRate: row['毛利率']?.toString() || '',
    forecast2026Revenue: parseFloat(row['预测2026年可获得收入']?.toString() || '0'),
    forecast2026LossRevenue: parseFloat(row['预测2026年无法获取收入']?.toString() || '0'),
    outsourcerName: row['外协单位名称']?.toString() || '',
    outsourcerAmount: parseFloat(row['外协采购金额']?.toString() || '0'),
    outsourcerTechContent: row['外协主要技术内容']?.toString() || '',
    equipmentSpec: row['采购设备规格内容']?.toString() || '',
    outsourcerRatio: row['外协采购费用占比']?.toString() || '',
    receivedThankYouDate: row['感谢信接收时间']?.toString() || '',
    documentReceivedDate: row['验收单获取时间']?.toString() || '',
    remarks: row['备注']?.toString() || '',
    phase: row['项目阶段']?.toString() || '',
    type: row['项目类型']?.toString() || '',
    nature: (row['项目性质']?.toString() || '').split('、').filter((s: string) => s),
    level: row['项目级别']?.toString() || '',
    industry: row['行业']?.toString() || '',
    region: row['所属区域']?.toString() || '西区',
    isBenchmark: row['是否标杆']?.toString() === '是',
    isHighlight: row['是否为亮点工程']?.toString() === '是',
    timeline: {
      kickoffDate: row['立项日期']?.toString() || '',
      plannedEndDate: row['计划结束日期']?.toString() || '',
      contractEndDate: row['计划结束日期']?.toString() || '',
      acceptanceDate: row['验收日期']?.toString() || '',
      delayMonths: 0,
      acceptanceYear: row['验收日期']?.toString() ? row['验收日期'].split('/')[0] : '',
      acceptanceControl: row['验收可控性']?.toString() || '可行'
    },
    payment: {
      contractName: row['合同名称']?.toString() || projectName + '合同',
      groupCompany: row['集团公司']?.toString() || '',
      contractAmount,
      historicalPaid,
      paid2026,
      pending,
      pendingThisYear: parseFloat(row['2026待回款']?.toString() || '0'),
      ratio: contractAmount > 0 ? totalPaid / contractAmount : 0,
      totalPaid,
      annualConfirmedRevenue: parseFloat(row['全年已确认收入']?.toString() || '0'),
      acceptedPendingRevenue: parseFloat(row['已验收待确认收入']?.toString() || '0'),
      isConfirmed: false,
      paymentNodes: []
    },
    manHours: {
      plannedTotal,
      pmoAnnualTotal: actualTB,
      personnelDetails: [
        {
          name: row['项目经理']?.toString() || '',
          role: '项目经理',
          monthly: Array(12).fill(0)
        }
      ]
    },
    execution: {
      progress: parseFloat(row['进度百分比 (%)']?.toString() || '0'),
      inputPercent: parseFloat(row['投入百分比 (%)']?.toString() || '0')
    },
    ratings: {
      preSalesTotal: 0,
      executionTotal,
      qualityScoreRaw,
      preSalesHard: [],
      preSalesSoft: [],
      executionHard: [],
      executionSoft: []
    },
    changes,
    members: {
      projectManager: row['项目经理']?.toString() || '',
      preSalesManager: row['售前经理']?.toString() || '',
      salesManager: row['销售经理']?.toString() || '',
      projectDirector: row['项目总监']?.toString() || '',
      teamMembers: []
    }
  };
}

/**
 * 迁移 Excel 数据到数据库
 */
async function migrateExcelToDb() {
  console.log('=================================');
  console.log('开始迁移 Excel 数据到数据库');
  console.log('=================================');

  // 检查数据库文件
  if (!fs.existsSync(DB_PATH)) {
    console.error('数据库文件不存在，请先启动服务器初始化数据库');
    process.exit(1);
  }

  // 读取 Excel 数据
  const excelData = readExcelData(EXCEL_PATH);
  if (excelData.length === 0) {
    console.error('Excel 文件中没有数据');
    process.exit(1);
  }

  // 加载数据库
  const initSqlJs = await import('sql.js');
  const SQL = await initSqlJs.default();

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // 开始迁移
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  excelData.forEach((row, index) => {
    try {
      const project = transformExcelRow(row, index);

      // 检查项目是否已存在
      const existing = db.exec(`SELECT id FROM projects WHERE id = '${project.id}'`);

      if (existing && existing.length > 0 && existing[0].values.length > 0) {
        // 更新现有项目
        const stmt = db.prepare(`
          UPDATE projects SET
            project_name = ?, security_level = ?, status = ?, status_comment = ?,
            phase = ?, type = ?, level = ?, industry = ?, region = ?,
            is_benchmark = ?, kickoff_date = ?, acceptance_date = ?,
            contract_amount = ?, historical_paid = ?, paid_2025 = ?, pending = ?,
            planned_total = ?, pmo_annual_total = ?, progress = ?, input_percent = ?,
            execution_total = ?, quality_score_raw = ?,
            project_manager = ?, pre_sales_manager = ?, sales_manager = ?, project_director = ?
          WHERE id = ?
        `);

        stmt.run([
          project.projectName,
          project.securityLevel,
          project.status,
          project.statusComment,
          project.phase,
          project.type,
          project.level,
          project.industry,
          project.region,
          project.isBenchmark ? 1 : 0,
          project.timeline.kickoffDate,
          project.timeline.acceptanceDate,
          project.payment.contractAmount,
          project.payment.historicalPaid,
          project.payment.paid2026,
          project.payment.pending,
          project.manHours.plannedTotal,
          project.manHours.pmoAnnualTotal,
          project.execution.progress,
          project.execution.inputPercent,
          project.ratings.executionTotal,
          project.ratings.qualityScoreRaw,
          project.members.projectManager,
          project.members.preSalesManager,
          project.members.salesManager,
          project.members.projectDirector,
          project.id
        ]);

        console.log(`✓ 更新项目: ${project.projectName} (${project.id})`);
      } else {
        // 创建新项目
        const stmt = db.prepare(`
          INSERT INTO projects (
            id, project_code, project_name, security_level, status, status_comment,
            phase, type, level, industry, region, is_benchmark,
            kickoff_date, acceptance_date, contract_amount, historical_paid, paid_2025, pending,
            planned_total, pmo_annual_total, progress, input_percent,
            execution_total, quality_score_raw,
            project_manager, pre_sales_manager, sales_manager, project_director
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
          project.id,
          project.projectCode,
          project.projectName,
          project.securityLevel,
          project.status,
          project.statusComment,
          project.phase,
          project.type,
          project.level,
          project.industry,
          project.region,
          project.isBenchmark ? 1 : 0,
          project.timeline.kickoffDate,
          project.timeline.acceptanceDate,
          project.payment.contractAmount,
          project.payment.historicalPaid,
          project.payment.paid2026,
          project.payment.pending,
          project.manHours.plannedTotal,
          project.manHours.pmoAnnualTotal,
          project.execution.progress,
          project.execution.inputPercent,
          project.ratings.executionTotal,
          project.ratings.qualityScoreRaw,
          project.members.projectManager,
          project.members.preSalesManager,
          project.members.salesManager,
          project.members.projectDirector
        ]);

        console.log(`✓ 创建项目: ${project.projectName} (${project.id})`);
      }

      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({
        rowIndex: index + 1,
        projectName: row['项目名称']?.toString() || '未知',
        error: error instanceof Error ? error.message : String(error)
      });
      console.error(`✗ 处理失败 (行 ${index + 1}): ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  // 关闭数据库
  db.close();

  console.log('=================================');
  console.log('迁移完成');
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failedCount}`);
  console.log('=================================');

  if (errors.length > 0) {
    console.log('\n错误详情:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. 行 ${err.rowIndex} - ${err.projectName}: ${err.error}`);
    });
  }
}

// 运行迁移
migrateExcelToDb().catch(console.error);