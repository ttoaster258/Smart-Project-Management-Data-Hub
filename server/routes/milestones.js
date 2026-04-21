import express from 'express';
import database from '../db.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 里程碑节点定义（13个节点，与初始化脚本一致）
const MILESTONE_NODES = [
  '早期报价',
  '级别确定',
  '需求评估',
  '报价审批',
  '项目投标',
  '任务书审批',
  '合同审批',
  '项目启动',
  '计划预算',
  '概要方案',
  '详细方案',
  '内部验收',
  '已验收'
];

// 关键节点（必填，用于质量风险判定）
const REQUIRED_MILESTONES = ['项目启动', '计划预算', '概要方案', '已验收'];

/**
 * 获取项目的所有里程碑
 * GET /api/milestones/projects/:id/milestones
 */
router.get('/projects/:id/milestones', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;

    // 获取项目基本信息
    const project = database.prepare('SELECT * FROM projects WHERE id = ?').get([id]);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 获取里程碑记录
    const milestones = database.prepare(`
      SELECT * FROM project_milestones
      WHERE project_id = ?
      ORDER BY created_at
    `).all([id]);

    // 构建里程碑数据
    const milestoneData = MILESTONE_NODES.map(node => {
      const existing = milestones.find(m => m.milestone_node === node);
      const isRequired = REQUIRED_MILESTONES.includes(node);

      // 计算计划日期（针对关键节点）
      let plannedDate = existing?.planned_date || null;
      let actualDate = existing?.actual_date || null;

      // 项目启动：使用立项日期
      if (node === '项目启动' && !plannedDate) {
        plannedDate = project.kickoff_date || null;
      }

      // 计划预算：立项日期 + 30天
      if (node === '计划预算' && !plannedDate && project.kickoff_date) {
        const kickoffDate = new Date(project.kickoff_date);
        kickoffDate.setDate(kickoffDate.getDate() + 30);
        plannedDate = kickoffDate.toISOString().split('T')[0];
      }

      // 已验收：使用验收日期
      if (node === '已验收' && !plannedDate) {
        plannedDate = project.acceptance_date || null;
      }

      return {
        id: existing?.id,
        milestone_node: node,
        planned_date: plannedDate,
        actual_date: actualDate,
        is_skipped: existing?.is_skipped || 0,
        is_required: isRequired ? 1 : 0
      };
    });

    res.json({
      success: true,
      data: milestoneData
    });
  } catch (error) {
    console.error('获取里程碑失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 保存/更新项目的里程碑
 * POST /api/milestones/projects/:id/milestones
 */
router.post('/projects/:id/milestones', optionalAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { milestones } = req.body;

    if (!Array.isArray(milestones)) {
      return res.status(400).json({
        success: false,
        error: '里程碑数据格式错误'
      });
    }

    // 验证项目是否存在
    const project = database.prepare('SELECT * FROM projects WHERE id = ?').get([id]);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 获取现有里程碑
    const existingMilestones = database.prepare(`
      SELECT id, milestone_node FROM project_milestones WHERE project_id = ?
    `).all([id]);

    const existingMap = new Map(existingMilestones.map(m => [m.milestone_node, m.id]));

    // 保存/更新每个里程碑
    milestones.forEach(milestone => {
      const { milestone_node, planned_date, actual_date, is_skipped } = milestone;

      // 对于项目启动和已验收节点，只允许更新 actual_date，不修改 planned_date
      if (milestone_node === '项目启动' || milestone_node === '已验收') {
        if (existingMap.has(milestone_node)) {
          const existingId = existingMap.get(milestone_node);
          // 只更新 actual_date，保持 planned_date 不变
          database.prepare(`
            UPDATE project_milestones
            SET actual_date = ?,
                is_skipped = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run([
            actual_date || null,
            is_skipped ? 1 : 0,
            existingId
          ]);
        } else {
          // 插入新记录（但 planned_date 需要从项目信息获取）
          let defaultPlannedDate = null;
          if (milestone_node === '项目启动') {
            defaultPlannedDate = project.kickoff_date || null;
          } else if (milestone_node === '已验收') {
            defaultPlannedDate = project.acceptance_date || null;
          }
          database.prepare(`
            INSERT INTO project_milestones (project_id, milestone_node, planned_date, actual_date, is_skipped)
            VALUES (?, ?, ?, ?, ?)
          `).run([
            id,
            milestone_node,
            defaultPlannedDate,
            actual_date || null,
            is_skipped ? 1 : 0
          ]);
        }
        return;
      }

      if (existingMap.has(milestone_node)) {
        // 更新现有记录
        const existingId = existingMap.get(milestone_node);
        database.prepare(`
          UPDATE project_milestones
          SET planned_date = ?,
              actual_date = ?,
              is_skipped = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run([
          planned_date || null,
          actual_date || null,
          is_skipped ? 1 : 0,
          existingId
        ]);
      } else {
        // 插入新记录
        database.prepare(`
          INSERT INTO project_milestones (project_id, milestone_node, planned_date, actual_date, is_skipped)
          VALUES (?, ?, ?, ?, ?)
        `).run([
          id,
          milestone_node,
          planned_date || null,
          actual_date || null,
          is_skipped ? 1 : 0
        ]);
      }
    });

    database.save();

    res.json({
      success: true,
      message: '里程碑保存成功'
    });
  } catch (error) {
    console.error('保存里程碑失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 初始化现有项目的里程碑数据
 * POST /api/milestones/initialize
 */
router.post('/initialize', optionalAuth, requireAdmin, (req, res) => {
  try {
    // 获取所有项目
    const projects = database.prepare('SELECT id FROM projects').all();

    let createdCount = 0;
    let skippedCount = 0;

    projects.forEach(project => {
      // 检查是否已有里程碑记录
      const existingCount = database.prepare(`
        SELECT COUNT(*) as count FROM project_milestones WHERE project_id = ?
      `).get([project.id]).count;

      if (existingCount > 0) {
        skippedCount++;
        return;
      }

      // 获取项目详细信息
      const projectDetails = database.prepare(`
        SELECT kickoff_date, acceptance_date FROM projects WHERE id = ?
      `).get([project.id]);

      // 为每个里程碑节点创建记录
      MILESTONE_NODES.forEach(node => {
        let plannedDate = null;
        const isRequired = REQUIRED_MILESTONES.includes(node) ? 1 : 0;

        // 项目启动：使用立项日期
        if (node === '项目启动') {
          plannedDate = projectDetails?.kickoff_date || null;
        }

        // 计划预算：立项日期 + 30天
        else if (node === '计划预算' && projectDetails?.kickoff_date) {
          const kickoffDate = new Date(projectDetails.kickoff_date);
          kickoffDate.setDate(kickoffDate.getDate() + 30);
          plannedDate = kickoffDate.toISOString().split('T')[0];
        }

        // 已验收：使用验收日期
        else if (node === '已验收') {
          plannedDate = projectDetails?.acceptance_date || null;
        }

        database.prepare(`
          INSERT INTO project_milestones (project_id, milestone_node, planned_date, is_required)
          VALUES (?, ?, ?, ?)
        `).run([project.id, node, plannedDate, isRequired]);
      });

      createdCount++;
    });

    database.save();

    res.json({
      success: true,
      message: `初始化完成`,
      created: createdCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error('初始化里程碑失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取质量风险项目列表
 * GET /api/quality-risks
 */
router.get('/quality-risks', optionalAuth, (req, res) => {
  try {
    // 获取所有项目及其里程碑
    const projects = database.prepare(`
      SELECT p.*,
             COUNT(DISTINCT pm.id) as milestone_count
      FROM projects p
      LEFT JOIN project_milestones pm ON p.id = pm.project_id
      GROUP BY p.id
    `).all();

    const riskProjects = [];

    projects.forEach(project => {
      const risks = identifyQualityRisks(project);
      if (risks.riskLevel) {
        riskProjects.push({
          ...project,
          qualityRisks: risks
        });
      }
    });

    res.json({
      success: true,
      data: riskProjects
    });
  } catch (error) {
    console.error('获取质量风险项目失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 判断项目的质量风险
 */
function identifyQualityRisks(project) {
  try {
    const milestones = database.prepare(`
      SELECT * FROM project_milestones WHERE project_id = ?
    `).all([project.id]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let riskLevel = null;
    const riskDetails = [];

    // 判断项目是否真正已验收（基于状态）
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