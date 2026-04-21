import express from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../db.js';

const router = express.Router();

/**
 * 获取项目的所有进展更新记录
 * GET /api/progress-updates/project/:projectId
 */
router.get('/project/:projectId', authenticate, (req, res) => {
  try {
    const updates = db.prepare(`
      SELECT * FROM project_progress_updates
      WHERE project_id = ?
      ORDER BY update_time DESC
    `).all(req.params.projectId);

    // 转换为驼峰命名
    const formattedUpdates = updates.map(u => ({
      id: u.id,
      projectId: u.project_id,
      updateText: u.update_text,
      updateTime: u.update_time,
      updatePm: u.update_pm,
      createdAt: u.created_at
    }));

    res.json({
      success: true,
      data: formattedUpdates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新的进展更新记录
 * POST /api/progress-updates
 */
router.post('/', authenticate, (req, res) => {
  try {
    const { projectId, updateText, updatePm } = req.body;

    // 验证必填字段
    if (!projectId || !updateText) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    const updateTime = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO project_progress_updates (project_id, update_text, update_time, update_pm)
      VALUES (?, ?, ?, ?)
    `).run(projectId, updateText, updateTime, updatePm || '');

    // 获取新插入的记录
    const newUpdate = db.prepare(`
      SELECT * FROM project_progress_updates WHERE id = ?
    `).get(result.lastInsertRowid);

    const formattedUpdate = {
      id: newUpdate.id,
      projectId: newUpdate.project_id,
      updateText: newUpdate.update_text,
      updateTime: newUpdate.update_time,
      updatePm: newUpdate.update_pm,
      createdAt: newUpdate.created_at
    };

    res.json({
      success: true,
      data: formattedUpdate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除进展更新记录
 * DELETE /api/progress-updates/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM project_progress_updates WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '进展更新记录不存在'
      });
    }

    res.json({
      success: true,
      message: '进展更新记录已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取所有项目经理列表（用于搜索）
 * GET /api/progress-updates/project-managers
 */
router.get('/project-managers', authenticate, (req, res) => {
  try {
    const managers = db.prepare(`
      SELECT DISTINCT project_manager as name
      FROM projects
      WHERE project_manager IS NOT NULL AND project_manager != ''
      ORDER BY project_manager
    `).all();

    res.json({
      success: true,
      data: managers.map(m => m.name)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;