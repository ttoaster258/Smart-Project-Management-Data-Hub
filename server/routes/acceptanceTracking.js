import express from 'express';
import projectService from '../services/ProjectService.js';
import database from '../db.js';
import { adminOnlyMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 计算项目实际状态（后端版本）
 * 规则：
 * - "暂停"和"已验收" 是手动设置的状态，直接返回
 * - 其他状态根据当前日期和计划结束日期自动判断
 */
function calculateProjectStatus(currentStatus, plannedEndDate) {
  // 手动设置的状态优先返回
  if (currentStatus === '暂停' || currentStatus === 'Paused') return 'Paused';
  if (currentStatus === '已验收' || currentStatus === 'Accepted') return 'Accepted';

  // 解析计划结束日期
  const plannedDate = new Date(plannedEndDate);
  if (isNaN(plannedDate.getTime())) {
    return 'Ongoing'; // 无法解析日期，默认返回正在进行
  }

  // 使用今天日期进行比较
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(plannedDate);
  planned.setHours(0, 0, 0, 0);

  // 今天 < 计划结束日期 => 正在进行
  // 今天 >= 计划结束日期 => 延期
  return today < planned ? 'Ongoing' : 'Delayed';
}

/**
 * 将数据库格式转换为前端 Project 类型结构
 * 核心转换：扁平数据库字段 → 嵌套前端对象结构
 */
function transformFromDb(dbProject) {
  // 计算项目实际状态
  const plannedEndDate = dbProject.planned_end_date || '';
  const dbStatus = dbProject.status;
  const calculatedStatus = calculateProjectStatus(dbStatus, plannedEndDate);

  // 解析 team_members
  let teamMembers = [];
  if (dbProject.team_members) {
    if (Array.isArray(dbProject.team_members)) {
      teamMembers = dbProject.team_members;
    } else if (typeof dbProject.team_members === 'string') {
      try {
        teamMembers = JSON.parse(dbProject.team_members);
      } catch {
        teamMembers = [];
      }
    }
  }

  // 解析 personnelDetails
  let personnelDetails = [];
  if (dbProject.personnelDetails) {
    personnelDetails = dbProject.personnelDetails;
  }

  // 解析 changes
  let changes = [];
  if (dbProject.changes) {
    changes = dbProject.changes;
  }

  // 解析 outsourcingItems
  let outsourcingItems = [];
  if (dbProject.outsourcingItems) {
    outsourcingItems = dbProject.outsourcingItems;
  }

  // 解析 projectNature（项目性质）
  let projectNature = [];
  if (dbProject.project_nature) {
    if (Array.isArray(dbProject.project_nature)) {
      projectNature = dbProject.project_nature;
    } else if (typeof dbProject.project_nature === 'string') {
      try {
        const parsed = JSON.parse(dbProject.project_nature);
        projectNature = Array.isArray(parsed) ? parsed : [];
      } catch {
        projectNature = [];
      }
    }
  }

  // 解析 milestoneNodeData
  let milestoneNodeData = {};
  if (dbProject.milestoneNodeData && typeof dbProject.milestoneNodeData === 'object') {
    milestoneNodeData = dbProject.milestoneNodeData;
  }

  return {
    id: dbProject.id,
    projectCode: dbProject.project_code,
    projectName: dbProject.project_name,
    securityLevel: dbProject.security_level || '公开',
    status: calculatedStatus,
    statusComment: dbProject.status_comment || '',
    milestoneNode: dbProject.milestone_node || '',
    milestoneNodeData: milestoneNodeData,
    forecastAcceptanceDate: dbProject.forecast_acceptance_date || '',
    mainWorkCompleted: dbProject.main_work_completed || '',
    budgetUsage: dbProject.budget_usage || '',
    marginRate: dbProject.margin_rate || '',
    changeCount: dbProject.change_count || 0,
    lastChangeDate: dbProject.last_change_date || '',
    projectCycle: dbProject.project_cycle || '',
    forecast2026Revenue: dbProject.forecast_2026_revenue || 0,
    forecast2026LossRevenue: dbProject.forecast_2026_loss_revenue || 0,
    outsourcerName: dbProject.outsourcer_name || '',
    outsourcerAmount: dbProject.outsourcer_amount || 0,
    outsourcerTechContent: dbProject.outsourcer_tech_content || '',
    equipmentSpec: dbProject.equipment_spec || '',
    outsourcerRatio: dbProject.outsourcer_ratio || '',
    receivedThankYouDate: dbProject.received_thank_you_date || '',
    documentReceivedDate: dbProject.document_received_date || '',
    remarks: dbProject.remarks || '',
    projectHighlight: dbProject.project_highlight || '',
    acceptanceRiskLevel: dbProject.acceptance_risk_level || '',
    projectNature: projectNature,
    phase: dbProject.phase || '',
    type: dbProject.type || '',
    nature: [],
    level: dbProject.level || '',
    industry: dbProject.industry || '',
    region: dbProject.region,
    isBenchmark: dbProject.is_benchmark || false,
    isHighlight: dbProject.is_highlight || false,
    // ===== 嵌套对象结构 =====
    timeline: {
      kickoffDate: dbProject.kickoff_date || '',
      plannedEndDate: dbProject.planned_end_date || '',
      contractEndDate: dbProject.contract_end_date || '',
      acceptanceDate: dbProject.acceptance_date || '',
      delayMonths: dbProject.delay_months || 0,
      acceptanceYear: dbProject.acceptance_year || '',
      acceptanceControl: dbProject.acceptance_control || ''
    },
    milestones: { market: [], implementation: [], external: [] },
    budget: {
      totalBudget: dbProject.total_budget || 0,
      human: 0,
      travel: 0,
      outsourcing: 0,
      procurement: 0,
      business: 0,
      risk: 0,
      review: 0,
      other: 0,
      initialQuote: dbProject.initial_quote || 0,
      reqEvaluationFee: dbProject.req_evaluation_fee || 0,
      internalCost: dbProject.internal_cost || 0,
      internalProfit: dbProject.internal_profit || 0,
      budgetUsedAmount: dbProject.budget_used_amount || 0,
      outsourcingItems: outsourcingItems
    },
    payment: {
      contractName: dbProject.contract_name || '',
      groupCompany: dbProject.group_company || '',
      contractAmount: dbProject.contract_amount || 0,
      historicalPaid: dbProject.historical_paid || 0,
      paid2026: dbProject.paid_2026 || 0,
      pending: dbProject.pending || 0,
      pendingThisYear: dbProject.pending_this_year || 0,
      ratio: dbProject.ratio || 0,
      totalPaid: dbProject.total_paid || 0,
      annualConfirmedRevenue: dbProject.annual_confirmed_revenue || 0,
      acceptedPendingRevenue: dbProject.accepted_pending_revenue || 0,
      isConfirmed: Boolean(dbProject.is_confirmed),
      confirmedDate: dbProject.confirmed_date || '',
      paymentNodes: dbProject.paymentNodes || []
    },
    manHours: {
      plannedTotal: dbProject.planned_total || 0,
      pmoAnnualTotal: dbProject.pmo_annual_total || 0,
      personnelDetails: personnelDetails
    },
    execution: {
      progress: dbProject.progress || 0,
      inputPercent: dbProject.input_percent || 0
    },
    ratings: {
      preSalesTotal: dbProject.pre_sales_total || 0,
      executionTotal: dbProject.execution_total || 0,
      qualityScoreRaw: dbProject.quality_score_raw || 0,
      preSalesHard: [],
      preSalesSoft: [],
      executionHard: [],
      executionSoft: []
    },
    changes: changes,
    members: {
      projectManager: dbProject.project_manager || '',
      preSalesManager: dbProject.pre_sales_manager || '',
      salesManager: dbProject.sales_manager || '',
      projectDirector: dbProject.project_director || '',
      teamMembers: teamMembers
    },
    qualityRisks: dbProject.qualityRisks || undefined,
    // ===== 验收追踪系统专属字段 =====
    isAcceptanceTracking: Boolean(dbProject.is_acceptance_tracking),
    acceptanceTrackingDate: dbProject.acceptance_tracking_date || '',
    trackingAcceptanceRisk: dbProject.tracking_acceptance_risk || '无',
    trackingRevenueRisk: dbProject.tracking_revenue_risk || '无',
    isNewTracking: Boolean(dbProject.is_new_tracking),
    solutionMeasures: dbProject.solution_measures || '',
    riskReason: dbProject.risk_reason || ''
  };
}

/**
 * 获取所有验收追踪项目
 * GET /api/acceptance-tracking/projects
 */
router.get('/projects', (req, res) => {
  try {
    const rawProjects = projectService.getAcceptanceTrackingProjects();
    // 转换为前端期望的嵌套结构
    const projects = rawProjects.map(p => transformFromDb(p));
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个验收追踪项目详情
 * GET /api/acceptance-tracking/projects/:id
 */
router.get('/projects/:id', (req, res) => {
  try {
    const rawProject = projectService.getProjectById(req.params.id);
    if (!rawProject) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }
    // 检查是否为追踪项目
    if (!rawProject.is_acceptance_tracking) {
      return res.status(404).json({
        success: false,
        error: '该项目未加入验收追踪系统'
      });
    }
    // 转换为前端期望的嵌套结构
    const project = transformFromDb(rawProject);
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新验收追踪项目字段（仅管理员）
 * PUT /api/acceptance-tracking/projects/:id
 */
router.put('/projects/:id', adminOnlyMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 字段映射：前端字段名 -> 数据库字段名
    const fieldMapping = {
      'tracking_acceptance_risk': 'tracking_acceptance_risk',
      'tracking_revenue_risk': 'tracking_revenue_risk',
      'solution_measures': 'solution_measures',
      'is_new_tracking': 'is_new_tracking',
      'acceptance_control': 'acceptance_control',
      'risk_reason': 'risk_reason'
    };

    // 构建更新语句
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      const dbField = fieldMapping[key];
      if (dbField) {
        updates.push(`${dbField} = ?`);
        // 处理布尔值
        if (key === 'is_new_tracking') {
          values.push(updateData[key] ? 1 : 0);
        } else {
          values.push(updateData[key] || '');
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的更新字段'
      });
    }

    // 添加更新时间
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // 添加项目 ID
    values.push(id);

    const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;

    const result = database.prepare(sql).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或更新失败'
      });
    }

    res.json({
      success: true,
      message: '验收追踪项目更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 勾选/取消追踪验收（仅管理员）
 * POST /api/acceptance-tracking/projects/:id/toggle
 */
router.post('/projects/:id/toggle', adminOnlyMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { isTracking, trackingDate } = req.body;

    if (isTracking && !trackingDate) {
      return res.status(400).json({
        success: false,
        error: '勾选追踪验收时必须提供追踪日期'
      });
    }

    // 使用专门的追踪字段更新方法（部分更新）
    const success = projectService.toggleAcceptanceTracking(id, isTracking, trackingDate);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或更新失败'
      });
    }

    res.json({
      success: true,
      message: isTracking ? '项目已加入验收追踪系统' : '项目已退出验收追踪系统'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量更新验收追踪项目字段（仅管理员）
 * POST /api/acceptance-tracking/projects/batch-update
 */
router.post('/projects/batch-update', adminOnlyMiddleware, (req, res) => {
  try {
    const { projectIds, updateData } = req.body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要更新的项目'
      });
    }

    // 字段映射：前端字段名 -> 数据库字段名
    const fieldMapping = {
      'tracking_acceptance_risk': 'tracking_acceptance_risk',
      'tracking_revenue_risk': 'tracking_revenue_risk',
      'solution_measures': 'solution_measures',
      'is_new_tracking': 'is_new_tracking',
      'acceptance_control': 'acceptance_control'
    };

    // 构建更新语句
    const updates = [];
    const baseValues = [];

    Object.keys(updateData).forEach(key => {
      const dbField = fieldMapping[key];
      if (dbField) {
        updates.push(`${dbField} = ?`);
        // 处理布尔值
        if (key === 'is_new_tracking') {
          baseValues.push(updateData[key] ? 1 : 0);
        } else {
          baseValues.push(updateData[key] || '');
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的更新字段'
      });
    }

    // 添加更新时间
    updates.push('updated_at = ?');
    baseValues.push(new Date().toISOString());

    const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;

    let updatedCount = 0;
    projectIds.forEach(id => {
      const values = [...baseValues, id];
      const result = database.prepare(sql).run(...values);
      if (result.changes > 0) updatedCount++;
    });

    res.json({
      success: true,
      message: `成功更新 ${updatedCount} 个项目`,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取验收追踪统计数据
 * GET /api/acceptance-tracking/stats
 */
router.get('/stats', (req, res) => {
  try {
    const rawProjects = projectService.getAcceptanceTrackingProjects();
    // 转换为前端期望的嵌套结构
    const projects = rawProjects.map(p => transformFromDb(p));

    // 计算统计指标（使用转换后的结构）
    const totalContractAmount = projects.reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);
    const projectCount = projects.length;

    res.json({
      success: true,
      data: {
        totalContractAmount,
        projectCount,
        projects
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;