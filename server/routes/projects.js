import express from 'express';
import projectService from '../services/ProjectService.js';
import { optionalAuth, authenticate, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = express.Router();

/**
 * 获取所有项目
 * GET /api/projects
 * @query includePastYears - 是否包含往年数据（已验收且验收年份<当前年份）
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const includePastYears = req.query.includePastYears === 'true';
    const projects = projectService.getAllProjects(includePastYears);
    const isAdminIp = projectService.isAdminIp(req.ip);

    // 为每个项目添加质量风险信息
    const projectsWithQualityRisks = projects.map(project => {
      const qualityRisks = identifyQualityRisks(project);
      return {
        ...project,
        qualityRisks
      };
    });

    res.json({
      success: true,
      data: projectsWithQualityRisks,
      isAdmin: (req.user?.role === 'admin') || isAdminIp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取有变更的项目列表
 * GET /api/projects/with-changes
 * 注意：必须在 /:id 路由之前定义，否则会被拦截
 */
router.get('/with-changes', optionalAuth, (req, res) => {
  try {
    // 直接从 project_changes 表统计变更次数，不依赖 projects 表的 change_count 字段
    const projects = db.prepare(`
      SELECT p.id, p.project_name, p.project_code, p.project_manager, p.region, p.level,
             COUNT(pc.id) as change_count
      FROM projects p
      INNER JOIN project_changes pc ON p.id = pc.project_id
      GROUP BY p.id, p.project_name, p.project_code, p.project_manager, p.region, p.level
      ORDER BY change_count DESC
    `).all();

    console.log('获取有变更的项目列表，共', projects.length, '条记录');

    res.json({
      success: true,
      data: projects.map(p => ({
        ...p,
        changeCount: p.change_count // 转换为驼峰命名
      }))
    });
  } catch (error) {
    console.error('获取有变更项目列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个项目
 * GET /api/projects/:id
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const project = projectService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 添加质量风险信息
    const qualityRisks = identifyQualityRisks(project);

    res.json({
      success: true,
      data: {
        ...project,
        qualityRisks
      },
      isAdmin: req.user?.role === 'admin' || false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新项目
 * POST /api/projects
 * 仅管理员可访问
 */
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const project = projectService.createProject(req.body);
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        error: '项目编号已存在'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新项目
 * PUT /api/projects/:id
 * 仅管理员可访问
 */
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const project = projectService.updateProject(req.params.id, req.body);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

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
 * 删除项目
 * DELETE /api/projects/:id
 * 仅管理员可访问
 */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const success = projectService.deleteProject(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    res.json({
      success: true,
      message: '项目已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量导入项目
 * POST /api/projects/batch
 * 仅管理员可访问
 */
router.post('/batch', authenticate, requireAdmin, (req, res) => {
  try {
    const { projects } = req.body;

    if (!Array.isArray(projects)) {
      return res.status(400).json({
        success: false,
        error: 'projects 参数必须是数组'
      });
    }

    const results = projectService.batchImportProjects(projects);

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 导出项目数据（JSON 格式）
 * GET /api/projects/export/json
 * 仅管理员可访问
 * @query includePastYears - 是否包含往年数据
 */
router.get('/export/json', authenticate, requireAdmin, (req, res) => {
  try {
    const includePastYears = req.query.includePastYears === 'true';
    const projects = projectService.getAllProjects(includePastYears);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=projects.json');

    res.json({
      exportedAt: new Date().toISOString(),
      total: projects.length,
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 判断项目的质量风险
 * @param {Object} project - 项目对象
 * @returns {Object} - { riskLevel, riskDetails }
 */
function identifyQualityRisks(project) {
  try {
    const milestones = db.prepare(`
      SELECT * FROM project_milestones WHERE project_id = ?
    `).all([project.id]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let riskLevel = null;
    const riskDetails = [];

    // 判断项目是否真正已验收（基于状态或里程碑实际完成日期）
    const isProjectAccepted = project.status === '已验收' || project.status === 'Accepted';

    // 1. 计划预算
    const budgetMilestone = milestones.find(m => m.milestone_node === '计划预算');
    if (budgetMilestone?.planned_date) {
      // 如果项目已验收或该节点已实际完成，则不判定超期
      const isMilestoneCompleted = !!budgetMilestone.actual_date;
      const isOverdue = !isProjectAccepted && !isMilestoneCompleted && todayStr > budgetMilestone.planned_date;

      if (isOverdue) {
        const plannedDate = new Date(budgetMilestone.planned_date);
        const overdueDays = Math.floor((today - plannedDate) / (1000 * 60 * 60 * 24));

        if (overdueDays >= 30) {
          riskLevel = '中';
          riskDetails.push({ node: '计划预算', type: '超期', days: overdueDays });
        } else {
          riskLevel = '低';
          riskDetails.push({ node: '计划预算', type: '超期', days: overdueDays });
        }
      }
    }

    // 2. 概要方案
    const overviewMilestone = milestones.find(m => m.milestone_node === '概要方案');
    if (!overviewMilestone || !overviewMilestone.planned_date) {
      // 遗漏
      riskLevel = '高';
      riskDetails.push({ node: '概要方案', type: '遗漏' });
    } else {
      // 检查该节点是否实际完成
      const isMilestoneCompleted = !!overviewMilestone.actual_date;
      const isOverdue = !isProjectAccepted && !isMilestoneCompleted && todayStr > overviewMilestone.planned_date;

      if (isOverdue) {
        const plannedDate = new Date(overviewMilestone.planned_date);
        const overdueDays = Math.floor((today - plannedDate) / (1000 * 60 * 60 * 24));

        if (riskLevel === '高') {
          // 已是高风险
        } else if (riskLevel === '中') {
          riskLevel = '高'; // 中风险 + 概要方案超期 = 高风险
        } else {
          riskLevel = '中'; // 概要方案超期 >= 30天 = 中风险，否则 = 低风险
        }
        riskDetails.push({ node: '概要方案', type: '超期', days: overdueDays });
      }
    }

    // 3. 计算超期节点数量（关键节点）
    const requiredMilestones = milestones.filter(m => m.is_required === 1);
    let overdueCount = 0;

    requiredMilestones.forEach(milestone => {
      // 跳过已验收节点和概要方案（已单独处理）
      if (milestone.milestone_node === '已验收' || milestone.milestone_node === '概要方案') {
        return;
      }

      if (milestone.planned_date) {
        // 检查该节点是否实际完成
        const isMilestoneCompleted = !!milestone.actual_date;
        const isOverdue = !isProjectAccepted && !isMilestoneCompleted && todayStr > milestone.planned_date;

        if (isOverdue) {
          overdueCount++;
        }
      }
    });

    // 2个以上关键节点超期 = 高风险
    if (overdueCount >= 2) {
      riskLevel = '高';
    }

    return {
      riskLevel,
      riskDetails
    };
  } catch (error) {
    console.error('判断质量风险失败:', error);
    return {
      riskLevel: null,
      riskDetails: []
    };
  }
}

export default router;