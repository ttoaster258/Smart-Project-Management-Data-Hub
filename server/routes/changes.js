import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 导入数据库
import db from '../db.js';

/**
 * 获取所有变更记录
 * GET /api/changes
 * 查询参数:
 *   - projectId: 项目ID（可选）
 *   - type: 变更类型（可选）
 *   - region: 区域（可选）
 */
router.get('/', authenticate, (req, res) => {
  try {
    const { projectId, type, region } = req.query;

    let sql = `
      SELECT pc.*, p.project_name, p.project_code, p.project_manager, p.region, p.level
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      sql += ' AND pc.project_id = ?';
      params.push(projectId);
    }

    if (type) {
      sql += ' AND pc.type = ?';
      params.push(type);
    }

    if (region && region !== '全部') {
      sql += ` AND (
        p.region = ?
        OR p.region LIKE ?
      )`;
      params.push(region, `${region}%`);
    }

    sql += ' ORDER BY pc.change_date DESC';

    const changes = db.prepare(sql).all(...params);

    // 转换 impacts_performance 为 boolean，并转换蛇形命名为驼峰命名
    const formattedChanges = changes.map(c => ({
      ...c,
      impactsPerformance: c.impacts_performance === 1,
      changeCount: c.change_count,
      changeDate: c.change_date,
      reasonCategory: c.reason_category,
      projectId: c.project_id,
      projectName: c.project_name,
      projectCode: c.project_code,
      projectManager: c.project_manager,
      newProjectManager: c.new_project_manager,
      oldProjectManager: c.old_project_manager,
      newBudgetTotal: c.new_budget_total,
      oldBudgetTotal: c.old_budget_total,
      newOutsourcerAmount: c.new_outsourcer_amount,
      oldOutsourcerAmount: c.old_outsourcer_amount,
      newProjectCycle: c.new_project_cycle,
      oldProjectCycle: c.old_project_cycle
    }));

    res.json({
      success: true,
      data: formattedChanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取变更统计
 * GET /api/changes/stats
 * 查询参数:
 *   - region: 区域（可选）
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const { region } = req.query;

    // 基础查询条件
    let regionSql = '';
    let regionParams = [];

    if (region && region !== '全部') {
      regionSql = ` AND (
        p.region = ?
        OR p.region LIKE ?
      )`;
      regionParams = [region, `${region}%`];
    }

    // 变更项目数（去重）
    const changeProjectCount = db.prepare(`
      SELECT COUNT(DISTINCT pc.project_id) as count
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE 1=1 ${regionSql}
    `).get(...regionParams).count;

    // 人员变更次数
    const personnelChangeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.type = '人员变更' ${regionSql}
    `).get(...regionParams).count;

    // 预算变更次数
    const budgetChangeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.type = '预算变更' ${regionSql}
    `).get(...regionParams).count;

    // 进度变更次数
    const scheduleChangeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.type = '进度变更' ${regionSql}
    `).get(...regionParams).count;

    res.json({
      success: true,
      data: {
        changeProjectCount,
        personnelChangeCount,
        budgetChangeCount,
        scheduleChangeCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取项目的所有变更记录
 * GET /api/changes/project/:projectId
 */
router.get('/project/:projectId', authenticate, (req, res) => {
  try {
    const changes = db.prepare(`
      SELECT pc.*, p.project_name, p.project_code, p.project_manager, p.region, p.level
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.project_id = ?
      ORDER BY pc.change_date ASC
    `).all(req.params.projectId);

    // 转换 impacts_performance 为 boolean，并转换蛇形命名为驼峰命名
    const formattedChanges = changes.map(c => ({
      ...c,
      impactsPerformance: c.impacts_performance === 1,
      changeCount: c.change_count,
      changeDate: c.change_date,
      reasonCategory: c.reason_category,
      projectId: c.project_id,
      newProjectManager: c.new_project_manager,
      oldProjectManager: c.old_project_manager,
      newBudgetTotal: c.new_budget_total,
      oldBudgetTotal: c.old_budget_total,
      newOutsourcerAmount: c.new_outsourcer_amount,
      oldOutsourcerAmount: c.old_outsourcer_amount,
      newProjectCycle: c.new_project_cycle,
      oldProjectCycle: c.old_project_cycle
    }));

    res.json({
      success: true,
      data: formattedChanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个变更记录
 * GET /api/changes/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const change = db.prepare(`
      SELECT pc.*, p.project_name, p.project_code, p.project_manager, p.region, p.level
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.id = ?
    `).get(req.params.id);

    if (!change) {
      return res.status(404).json({
        success: false,
        error: '变更记录不存在'
      });
    }

    // 转换 impacts_performance 为 boolean
    const formattedChange = {
      ...change,
      impactsPerformance: change.impacts_performance === 1,
      changeCount: change.change_count,
      changeDate: change.change_date,
      reasonCategory: change.reason_category,
      newProjectManager: change.new_project_manager,
      oldProjectManager: change.old_project_manager,
      newBudgetTotal: change.new_budget_total,
      oldBudgetTotal: change.old_budget_total,
      newOutsourcerAmount: change.new_outsourcer_amount,
      oldOutsourcerAmount: change.old_outsourcer_amount,
      newProjectCycle: change.new_project_cycle,
      oldProjectCycle: change.old_project_cycle
    };

    res.json({
      success: true,
      data: formattedChange
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新变更记录
 * POST /api/changes
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      projectId,
      type,
      reasonCategory,
      reason,
      content,
      impactsPerformance,
      changeDate,
      newProjectManager,
      newBudgetTotal,
      newOutsourcerAmount,
      newProjectCycle
    } = req.body;

    // 验证必填字段
    if (!projectId || !type || !reasonCategory || !reason || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    // 获取项目当前变更次数
    const lastChange = db.prepare(`
      SELECT change_count
      FROM project_changes
      WHERE project_id = ?
      ORDER BY change_count DESC
      LIMIT 1
    `).get(projectId);

    const changeCount = lastChange ? lastChange.change_count + 1 : 1;
    const finalChangeDate = changeDate || new Date().toISOString().split('T')[0];

    // 获取项目当前信息（用于保存旧值）
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    // 根据变更类型设置新旧值
    let oldProjectManager = null;
    let oldBudgetTotal = null;
    let oldOutsourcerAmount = null;
    let oldProjectCycle = null;

    if (type === '人员变更') {
      oldProjectManager = project?.project_manager || null;
    } else if (type === '预算变更') {
      oldBudgetTotal = project?.total_budget || null;
      oldOutsourcerAmount = project?.outsourcer_amount || null;
    } else if (type === '进度变更') {
      oldProjectCycle = project?.project_cycle || null;
    }

    // 插入新变更记录
    const result = db.prepare(`
      INSERT INTO project_changes (
        project_id, type, reason_category, reason, content,
        impacts_performance, change_date, change_count,
        new_project_manager, old_project_manager,
        new_budget_total, old_budget_total,
        new_outsourcer_amount, old_outsourcer_amount,
        new_project_cycle, old_project_cycle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      type,
      reasonCategory,
      reason,
      content,
      impactsPerformance ? 1 : 0,
      finalChangeDate,
      changeCount,
      newProjectManager || null,
      oldProjectManager,
      newBudgetTotal || null,
      oldBudgetTotal,
      newOutsourcerAmount || null,
      oldOutsourcerAmount,
      newProjectCycle || null,
      oldProjectCycle
    );

    // 更新项目的变更统计信息和实际值
    const updateFields = ['change_count = ?', 'last_change_date = ?'];
    const updateValues = [changeCount, finalChangeDate];

    if (type === '人员变更' && newProjectManager) {
      updateFields.push('project_manager = ?');
      updateValues.push(newProjectManager);
    } else if (type === '预算变更') {
      if (newBudgetTotal !== undefined && newBudgetTotal !== null) {
        updateFields.push('total_budget = ?');
        updateValues.push(newBudgetTotal);
      }
      if (newOutsourcerAmount !== undefined && newOutsourcerAmount !== null) {
        updateFields.push('outsourcer_amount = ?');
        updateValues.push(newOutsourcerAmount);
      }
    } else if (type === '进度变更' && newProjectCycle) {
      updateFields.push('project_cycle = ?');
      updateValues.push(newProjectCycle);
    }

    updateValues.push(projectId);

    db.prepare(`
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    // 获取新插入的变更记录
    const newChange = db.prepare(`
      SELECT pc.*, p.project_name, p.project_code, p.project_manager, p.region, p.level
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.id = ?
    `).get(result.lastInsertRowid);

    // 转换 impacts_performance 为 boolean，并转换蛇形命名为驼峰命名
    const formattedChange = {
      ...newChange,
      impactsPerformance: newChange.impacts_performance === 1,
      changeCount: newChange.change_count,
      changeDate: newChange.change_date,
      reasonCategory: newChange.reason_category,
      projectId: newChange.project_id,
      newProjectManager: newChange.new_project_manager,
      oldProjectManager: newChange.old_project_manager,
      newBudgetTotal: newChange.new_budget_total,
      oldBudgetTotal: newChange.old_budget_total,
      newOutsourcerAmount: newChange.new_outsourcer_amount,
      oldOutsourcerAmount: newChange.old_outsourcer_amount,
      newProjectCycle: newChange.new_project_cycle,
      oldProjectCycle: newChange.old_project_cycle
    };

    res.json({
      success: true,
      data: formattedChange
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新变更记录
 * PUT /api/changes/:id
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const {
      type,
      reasonCategory,
      reason,
      content,
      impactsPerformance,
      changeDate,
      newProjectManager,
      newBudgetTotal,
      newOutsourcerAmount,
      newProjectCycle
    } = req.body;

    // 检查变更记录是否存在
    const existingChange = db.prepare('SELECT * FROM project_changes WHERE id = ?').get(req.params.id);

    if (!existingChange) {
      return res.status(404).json({
        success: false,
        error: '变更记录不存在'
      });
    }

    // 更新变更记录
    const updateFields = [];
    const updateValues = [];

    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (reasonCategory !== undefined) {
      updateFields.push('reason_category = ?');
      updateValues.push(reasonCategory);
    }
    if (reason !== undefined) {
      updateFields.push('reason = ?');
      updateValues.push(reason);
    }
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (impactsPerformance !== undefined) {
      updateFields.push('impacts_performance = ?');
      updateValues.push(impactsPerformance ? 1 : 0);
    }
    if (changeDate !== undefined) {
      updateFields.push('change_date = ?');
      updateValues.push(changeDate);
    }
    if (newProjectManager !== undefined) {
      updateFields.push('new_project_manager = ?');
      updateValues.push(newProjectManager);
    }
    if (newBudgetTotal !== undefined) {
      updateFields.push('new_budget_total = ?');
      updateValues.push(newBudgetTotal);
    }
    if (newOutsourcerAmount !== undefined) {
      updateFields.push('new_outsourcer_amount = ?');
      updateValues.push(newOutsourcerAmount);
    }
    if (newProjectCycle !== undefined) {
      updateFields.push('new_project_cycle = ?');
      updateValues.push(newProjectCycle);
    }

    updateValues.push(req.params.id);

    db.prepare(`
      UPDATE project_changes
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    // 更新项目表中的对应字段
    const projectUpdateFields = [];
    const projectUpdateValues = [];

    if (changeDate !== undefined) {
      projectUpdateFields.push('last_change_date = ?');
      projectUpdateValues.push(changeDate);
    }
    if (existingChange.type === '人员变更' && newProjectManager !== undefined) {
      projectUpdateFields.push('project_manager = ?');
      projectUpdateValues.push(newProjectManager);
    }
    if (existingChange.type === '预算变更') {
      if (newBudgetTotal !== undefined) {
        projectUpdateFields.push('total_budget = ?');
        projectUpdateValues.push(newBudgetTotal);
      }
      if (newOutsourcerAmount !== undefined) {
        projectUpdateFields.push('outsourcer_amount = ?');
        projectUpdateValues.push(newOutsourcerAmount);
      }
    }
    if (existingChange.type === '进度变更' && newProjectCycle !== undefined) {
      projectUpdateFields.push('project_cycle = ?');
      projectUpdateValues.push(newProjectCycle);
    }

    if (projectUpdateFields.length > 0) {
      projectUpdateValues.push(existingChange.project_id);
      db.prepare(`
        UPDATE projects
        SET ${projectUpdateFields.join(', ')}
        WHERE id = ?
      `).run(...projectUpdateValues);
    }

    // 获取更新后的变更记录
    const updatedChange = db.prepare(`
      SELECT pc.*, p.project_name, p.project_code, p.project_manager, p.region, p.level
      FROM project_changes pc
      JOIN projects p ON pc.project_id = p.id
      WHERE pc.id = ?
    `).get(req.params.id);

    // 转换 impacts_performance 为 boolean，并转换蛇形命名为驼峰命名
    const formattedChange = {
      ...updatedChange,
      impactsPerformance: updatedChange.impacts_performance === 1,
      changeCount: updatedChange.change_count,
      changeDate: updatedChange.change_date,
      reasonCategory: updatedChange.reason_category,
      projectId: updatedChange.project_id
    };

    res.json({
      success: true,
      data: formattedChange
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除变更记录
 * DELETE /api/changes/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    // 先获取要删除的变更记录
    const changeToDelete = db.prepare('SELECT * FROM project_changes WHERE id = ?').get(req.params.id);

    if (!changeToDelete) {
      return res.status(404).json({
        success: false,
        error: '变更记录不存在'
      });
    }

    const projectId = changeToDelete.project_id;
    const changeCountToDelete = changeToDelete.change_count;

    // 删除变更记录
    const result = db.prepare('DELETE FROM project_changes WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '变更记录不存在'
      });
    }

    // 查找该变更之外生效日期最晚的变更
    const latestChange = db.prepare(`
      SELECT * FROM project_changes
      WHERE project_id = ? AND id != ?
      ORDER BY change_date DESC
      LIMIT 1
    `).get(projectId, req.params.id);

    // 构建需要还原的字段
    let projectManagerToRestore = null;
    let budgetTotalToRestore = null;
    let outsourcerAmountToRestore = null;
    let projectCycleToRestore = null;

    // 根据变更类型确定要还原的字段
    if (changeToDelete.type === '人员变更') {
      // 如果有其他变更，使用生效日期最晚的变更的新值；否则使用当前变更的旧值
      projectManagerToRestore = latestChange?.new_project_manager || changeToDelete.old_project_manager;
    } else if (changeToDelete.type === '预算变更') {
      budgetTotalToRestore = latestChange?.new_budget_total ?? changeToDelete.old_budget_total;
      outsourcerAmountToRestore = latestChange?.new_outsourcer_amount ?? changeToDelete.old_outsourcer_amount;
    } else if (changeToDelete.type === '进度变更') {
      projectCycleToRestore = latestChange?.new_project_cycle || changeToDelete.old_project_cycle;
    }

    // 构建更新语句
    const updateFields = [];
    const updateValues = [];

    // 还原项目经理
    if (projectManagerToRestore !== null && changeToDelete.type === '人员变更') {
      updateFields.push('project_manager = ?');
      updateValues.push(projectManagerToRestore);
    }

    // 更新预算字段
    if (changeToDelete.type === '预算变更') {
      if (budgetTotalToRestore !== null) {
        updateFields.push('total_budget = ?');
        updateValues.push(budgetTotalToRestore);
      }
      if (outsourcerAmountToRestore !== null) {
        updateFields.push('outsourcer_amount = ?');
        updateValues.push(outsourcerAmountToRestore);
      }
    }

    // 更新项目周期
    if (projectCycleToRestore !== null && changeToDelete.type === '进度变更') {
      updateFields.push('project_cycle = ?');
      updateValues.push(projectCycleToRestore);
    }

    // 计算剩余的变更次数和最近变更日期
    const remainingChanges = db.prepare(`
      SELECT COUNT(*) as count,
             MAX(change_date) as last_date
      FROM project_changes
      WHERE project_id = ?
    `).get(projectId);

    updateFields.push('change_count = ?');
    updateValues.push(remainingChanges.count || 0);

    updateFields.push('last_change_date = ?');
    updateValues.push(remainingChanges.last_date || null);

    updateValues.push(projectId);

    // 执行更新
    db.prepare(`
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    res.json({
      success: true,
      message: '变更记录已删除，项目信息已还原'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;