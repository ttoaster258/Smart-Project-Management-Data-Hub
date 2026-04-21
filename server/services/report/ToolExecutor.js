/**
 * 工具执行器
 * 实现 Tool 定义中声明的所有工具的实际执行逻辑
 */

import db from '../../db.js';

/**
 * 执行工具调用
 * @param {string} toolName - 工具名称
 * @param {object} toolInput - 工具参数
 * @returns {object} - 执行结果
 */
export async function executeTool(toolName, toolInput) {

  console.log(`[ToolExecutor] 执行工具：${toolName}`);
  console.log(`[ToolExecutor] 参数：`, JSON.stringify(toolInput, null, 2));

  try {

    switch (toolName) {

      case 'get_project_stats':
        return await getProjectStats(toolInput);

      case 'get_region_performance':
        return await getRegionPerformance(toolInput);

      case 'get_industry_distribution':
        return await getIndustryDistribution(toolInput);

      case 'get_risk_projects':
        return await getRiskProjects(toolInput);

      case 'get_milestone_status':
        return await getMilestoneStatus(toolInput);

      case 'get_change_analysis':
        return await getChangeAnalysis(toolInput);

      case 'get_financial_health':
        return await getFinancialHealth(toolInput);

      case 'get_key_projects':
        return await getKeyProjects(toolInput);

      case 'get_project_managers':
        return await getProjectManagers();

      case 'get_regions':
        return await getRegions();

      default:
        return { error: `未知的工具：${toolName}` };
    }

  } catch (error) {
    console.error(`[ToolExecutor] 执行失败：`, error);
    return { error: error.message };
  }
}

// ==================== 工具实现函数 ====================

/**
 * 获取项目统计数据
 */
async function getProjectStats(input) {
  const { startDate, endDate, scope, region, projectManager } = input;

  // 构建基础 SQL 和条件
  let whereConditions = [];
  let params = [];

  // 时间范围条件
  whereConditions.push('1=1');

  // 根据范围添加条件
  if (scope === 'region' && region) {
    whereConditions.push('region LIKE ?');
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereConditions.push('project_manager = ?');
    params.push(projectManager);
  }

  const whereClause = whereConditions.join(' AND ');

  // 查询项目统计
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_projects,
      SUM(CASE WHEN kickoff_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as new_projects,
      SUM(CASE WHEN acceptance_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as completed_projects,
      SUM(CASE WHEN status = '正在进行' THEN 1 ELSE 0 END) as ongoing_projects,
      SUM(CASE WHEN status = '延期' THEN 1 ELSE 0 END) as delayed_projects,
      SUM(CASE WHEN status = '暂停' THEN 1 ELSE 0 END) as paused_projects,
      SUM(CASE WHEN kickoff_date BETWEEN ? AND ? AND status = '延期' THEN 1 ELSE 0 END) as new_delayed,
      SUM(contract_amount) as total_contract_amount,
      SUM(annual_confirmed_revenue) as total_revenue,
      SUM(paid_2026) as total_payment,
      AVG(CASE WHEN margin_rate IS NOT NULL AND margin_rate != ''
        THEN CAST(REPLACE(margin_rate, '%', '') AS REAL) ELSE NULL END) as avg_margin_rate
    FROM projects
    WHERE ${whereClause}
  `).get(startDate, endDate, startDate, endDate, startDate, endDate, ...params);

  return {
    totalProjects: stats.total_projects || 0,
    newProjects: stats.new_projects || 0,
    completedProjects: stats.completed_projects || 0,
    ongoingProjects: stats.ongoing_projects || 0,
    delayedProjects: stats.delayed_projects || 0,
    pausedProjects: stats.paused_projects || 0,
    newDelayed: stats.new_delayed || 0,
    totalContractAmount: stats.total_contract_amount || 0,
    totalRevenue: stats.total_revenue || 0,
    totalPayment: stats.total_payment || 0,
    avgMarginRate: stats.avg_margin_rate ? Number(stats.avg_margin_rate.toFixed(2)) : null,
    scope: scope,
    region: region,
    projectManager: projectManager,
    period: `${startDate} 至 ${endDate}`
  };
}

/**
 * 获取区域业绩数据
 */
async function getRegionPerformance(input) {
  const { region } = input;

  if (region) {
    // 获取单个区域数据
    const result = db.prepare(`
      SELECT
        region,
        COUNT(*) as project_count,
        SUM(contract_amount) as contract_amount,
        SUM(annual_confirmed_revenue) as revenue,
        SUM(paid_2026) as payment,
        50000000 as kpi_target,
        ROUND(SUM(annual_confirmed_revenue) * 100.0 / 50000000, 2) as kpi_rate,
        SUM(CASE WHEN status = '延期' THEN 1 ELSE 0 END) as delayed_count
      FROM projects
      WHERE region LIKE ?
      GROUP BY region
    `).get(`${region}%`);

    if (!result) {
      return { region: region, project_count: 0, revenue: 0, kpi_rate: 0 };
    }

    return {
      region: result.region,
      projectCount: result.project_count,
      contractAmount: result.contract_amount || 0,
      revenue: result.revenue || 0,
      payment: result.payment || 0,
      kpiTarget: 50000000,
      kpiRate: result.kpi_rate || 0,
      delayedCount: result.delayed_count || 0
    };
  } else {
    // 获取所有区域数据
    const results = db.prepare(`
      SELECT
        region,
        COUNT(*) as project_count,
        SUM(contract_amount) as contract_amount,
        SUM(annual_confirmed_revenue) as revenue,
        SUM(paid_2026) as payment,
        50000000 as kpi_target,
        ROUND(SUM(annual_confirmed_revenue) * 100.0 / 50000000, 2) as kpi_rate,
        SUM(CASE WHEN status = '延期' THEN 1 ELSE 0 END) as delayed_count
      FROM projects
      GROUP BY region
      ORDER BY revenue DESC
    `).all();

    return results.map(r => ({
      region: r.region,
      projectCount: r.project_count,
      contractAmount: r.contract_amount || 0,
      revenue: r.revenue || 0,
      payment: r.payment || 0,
      kpiTarget: r.kpi_target,
      kpiRate: r.kpi_rate || 0,
      delayedCount: r.delayed_count || 0
    }));
  }
}

/**
 * 获取行业分布数据
 */
async function getIndustryDistribution(input) {
  const { scope, region, projectManager } = input;

  let whereConditions = ['industry IS NOT NULL', 'industry != ""', 'industry != "-"'];
  let params = [];

  if (scope === 'region' && region) {
    whereConditions.push('region LIKE ?');
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereConditions.push('project_manager = ?');
    params.push(projectManager);
  }

  const whereClause = whereConditions.join(' AND ');

  const results = db.prepare(`
    SELECT
      industry,
      COUNT(*) as project_count,
      SUM(contract_amount) as contract_amount,
      SUM(annual_confirmed_revenue) as revenue
    FROM projects
    WHERE ${whereClause}
    GROUP BY industry
    ORDER BY project_count DESC
  `).all(...params);

  // 计算总计和占比
  const total = results.reduce((sum, r) => sum + r.project_count, 0);

  return results.map(r => ({
    industry: r.industry,
    projectCount: r.project_count,
    contractAmount: r.contract_amount || 0,
    revenue: r.revenue || 0,
    percentage: total > 0 ? Number((r.project_count * 100 / total).toFixed(2)) : 0
  }));
}

/**
 * 获取风险项目列表
 */
async function getRiskProjects(input) {
  const { riskType, scope, region, projectManager } = input;

  let sql = '';
  let params = [];

  if (riskType === 'progress') {
    // 进度风险：延期≥1个月或暂停
    sql = `
      SELECT
        project_code, project_name, project_manager, region,
        status, delay_months, kickoff_date, planned_end_date,
        contract_amount, progress
      FROM projects
      WHERE ((status = '延期' AND delay_months >= 1) OR status = '暂停')
    `;
  } else if (riskType === 'cost') {
    // 成本风险：毛利率<0
    sql = `
      SELECT
        project_code, project_name, project_manager, region,
        margin_rate, contract_amount, budget_used_amount, total_budget,
        internal_cost, internal_profit
      FROM projects
      WHERE margin_rate LIKE '-%'
         OR (budget_used_amount > total_budget AND total_budget > 0)
    `;
  } else if (riskType === 'quality') {
    // 质量风险：关键节点缺失或超期
    sql = `
      SELECT DISTINCT
        p.project_code, p.project_name, p.project_manager, p.region,
        p.status, p.progress,
        GROUP_CONCAT(m.milestone_node) as delayed_nodes
      FROM projects p
      JOIN project_milestones m ON p.id = m.project_id
      WHERE m.milestone_node IN ('项目启动', '计划预算', '概要方案', '内部验收')
        AND (m.actual_date IS NULL OR m.actual_date > m.planned_date)
    `;
  }

  // 根据范围添加条件
  if (scope === 'region' && region) {
    sql += ` AND region LIKE ?`;
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    sql += ` AND project_manager = ?`;
    params.push(projectManager);
  }

  sql += ` ORDER BY contract_amount DESC LIMIT 20`;

  const results = db.prepare(sql).all(...params);

  // 标记风险类型
  return results.map(r => ({
    ...r,
    riskType: riskType === 'progress' ? '进度风险' :
              riskType === 'cost' ? '成本风险' : '质量风险'
  }));
}

/**
 * 获取里程碑状态
 */
async function getMilestoneStatus(input) {
  const { scope, region, projectManager } = input;

  let whereClause = '1=1';
  let params = [];

  if (scope === 'region' && region) {
    whereClause += ' AND p.region LIKE ?';
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereClause += ' AND p.project_manager = ?';
    params.push(projectManager);
  }

  const results = db.prepare(`
    SELECT
      m.milestone_node as node_name,
      COUNT(*) as total_count,
      SUM(CASE WHEN m.actual_date IS NOT NULL THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN m.actual_date IS NULL
        AND m.planned_date IS NOT NULL
        AND m.planned_date < DATE('now') THEN 1 ELSE 0 END) as delayed_count,
      SUM(CASE WHEN m.actual_date IS NULL
        AND (m.planned_date IS NULL OR m.planned_date >= DATE('now')) THEN 1 ELSE 0 END) as pending_count
    FROM project_milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE ${whereClause}
    GROUP BY m.milestone_node
    ORDER BY m.milestone_node
  `).all(...params);

  return results.map(r => ({
    nodeName: r.node_name,
    totalCount: r.total_count,
    completedCount: r.completed_count,
    delayedCount: r.delayed_count,
    pendingCount: r.pending_count,
    completionRate: r.total_count > 0 ?
      Number((r.completed_count * 100 / r.total_count).toFixed(2)) : 0
  }));
}

/**
 * 获取变更分析
 */
async function getChangeAnalysis(input) {
  const { startDate, endDate, scope, region, projectManager } = input;

  let whereClause = 'change_date BETWEEN ? AND ?';
  let params = [startDate, endDate];

  if (scope === 'region' && region) {
    whereClause += ' AND p.region LIKE ?';
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereClause += ' AND p.project_manager = ?';
    params.push(projectManager);
  }

  // 变更类型统计
  const typeStats = db.prepare(`
    SELECT
      pc.type,
      COUNT(*) as change_count
    FROM project_changes pc
    JOIN projects p ON pc.project_id = p.id
    WHERE ${whereClause}
    GROUP BY pc.type
  `).all(...params);

  // 主要原因
  const reasonStats = db.prepare(`
    SELECT
      pc.reason_category,
      COUNT(*) as count
    FROM project_changes pc
    JOIN projects p ON pc.project_id = p.id
    WHERE ${whereClause} AND pc.reason_category IS NOT NULL
    GROUP BY pc.reason_category
    ORDER BY count DESC
    LIMIT 5
  `).all(...params);

  return {
    totalChanges: typeStats.reduce((sum, s) => sum + s.change_count, 0),
    typeDistribution: typeStats.map(s => ({
      type: s.type,
      count: s.change_count
    })),
    topReasons: reasonStats.map(r => ({
      reason: r.reason_category,
      count: r.count
    })),
    period: `${startDate} 至 ${endDate}`
  };
}

/**
 * 获取财务健康度数据
 */
async function getFinancialHealth(input) {
  const { scope, region, projectManager } = input;

  let whereClause = '1=1';
  let params = [];

  if (scope === 'region' && region) {
    whereClause += ' AND region LIKE ?';
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereClause += ' AND project_manager = ?';
    params.push(projectManager);
  }

  // 毛利率分布
  const marginDistribution = db.prepare(`
    SELECT
      CASE
        WHEN margin_rate IS NULL OR margin_rate = '' THEN '未知'
        WHEN CAST(REPLACE(margin_rate, '%', '') AS REAL) >= 30 THEN '30%以上'
        WHEN CAST(REPLACE(margin_rate, '%', '') AS REAL) >= 10 THEN '10%-30%'
        WHEN CAST(REPLACE(margin_rate, '%', '') AS REAL) >= 0 THEN '0%-10%'
        ELSE '0%以下'
      END as margin_range,
      COUNT(*) as project_count,
      SUM(contract_amount) as contract_amount
    FROM projects
    WHERE ${whereClause}
    GROUP BY margin_range
    ORDER BY
      CASE margin_range
        WHEN '30%以上' THEN 1
        WHEN '10%-30%' THEN 2
        WHEN '0%-10%' THEN 3
        WHEN '0%以下' THEN 4
        ELSE 5
      END
  `).all(...params);

  // 预算超支项目
  const budgetOverspend = db.prepare(`
    SELECT
      COUNT(*) as overspend_count,
      SUM(budget_used_amount - total_budget) as overspend_amount
    FROM projects
    WHERE ${whereClause}
      AND budget_used_amount > total_budget
      AND total_budget > 0
  `).get(...params);

  // 平均毛利率
  const avgMargin = db.prepare(`
    SELECT AVG(CAST(REPLACE(margin_rate, '%', '') AS REAL)) as avg_margin
    FROM projects
    WHERE ${whereClause}
      AND margin_rate IS NOT NULL
      AND margin_rate != ''
      AND margin_rate LIKE '%%'
  `).get(...params);

  return {
    marginDistribution: marginDistribution.map(m => ({
      range: m.margin_range,
      projectCount: m.project_count,
      contractAmount: m.contract_amount || 0
    })),
    budgetOverspendCount: budgetOverspend.overspend_count || 0,
    budgetOverspendAmount: budgetOverspend.overspend_amount || 0,
    averageMarginRate: avgMargin.avg_margin ? Number(avgMargin.avg_margin.toFixed(2)) : null
  };
}

/**
 * 获取重点项目列表
 */
async function getKeyProjects(input) {
  const { scope, region, projectManager, limit = 10 } = input;

  let whereClause = "level IN ('核心项目（A类项目）', '重大项目（B类项目）')";
  let params = [];

  if (scope === 'region' && region) {
    whereClause += ' AND region LIKE ?';
    params.push(`${region}%`);
  } else if (scope === 'personal' && projectManager) {
    whereClause += ' AND project_manager = ?';
    params.push(projectManager);
  }

  const results = db.prepare(`
    SELECT
      project_code, project_name, project_manager, region,
      level, status, progress, phase,
      contract_amount, annual_confirmed_revenue,
      forecast_acceptance_date, delay_months
    FROM projects
    WHERE ${whereClause}
    ORDER BY contract_amount DESC
    LIMIT ?
  `).all(...params, limit);

  return results.map(r => ({
    projectCode: r.project_code,
    projectName: r.project_name,
    projectManager: r.project_manager,
    region: r.region,
    level: r.level,
    status: r.status,
    progress: r.progress || 0,
    phase: r.phase,
    contractAmount: r.contract_amount || 0,
    revenue: r.annual_confirmed_revenue || 0,
    forecastAcceptanceDate: r.forecast_acceptance_date,
    delayMonths: r.delay_months || 0
  }));
}

/**
 * 获取项目经理列表
 */
async function getProjectManagers() {
  // 从 projects 表和 project_managers 表合并获取
  const fromProjects = db.prepare(`
    SELECT DISTINCT project_manager as name
    FROM projects
    WHERE project_manager IS NOT NULL
      AND project_manager != ''
      AND project_manager != '-'
    ORDER BY project_manager
  `).all();

  const fromManagers = db.prepare(`
    SELECT name, level, score
    FROM project_managers
    ORDER BY name
  `).all();

  // 合并数据
  const managerMap = new Map();

  fromProjects.forEach(p => {
    managerMap.set(p.name, { name: p.name, level: null, score: null });
  });

  fromManagers.forEach(m => {
    if (managerMap.has(m.name)) {
      managerMap.set(m.name, {
        name: m.name,
        level: m.level,
        score: m.score
      });
    } else {
      managerMap.set(m.name, {
        name: m.name,
        level: m.level,
        score: m.score
      });
    }
  });

  return Array.from(managerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 获取区域列表
 */
async function getRegions() {
  const results = db.prepare(`
    SELECT DISTINCT region
    FROM projects
    WHERE region IS NOT NULL
      AND region != ''
    ORDER BY region
  `).all();

  return results.map(r => ({ region: r.region }));
}

export default executeTool;