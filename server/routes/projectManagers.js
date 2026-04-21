import express from 'express';
import database from '../db.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取所有项目经理数据
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const managers = database.prepare(`
      SELECT * FROM project_managers ORDER BY name
    `).all();

    res.json({
      success: true,
      data: managers
    });
  } catch (error) {
    console.error('获取项目经理列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取项目经理列表失败'
    });
  }
});

/**
 * 根据姓名获取项目经理数据
 */
router.get('/:name', optionalAuth, (req, res) => {
  try {
    const { name } = req.params;
    const manager = database.prepare(`
      SELECT * FROM project_managers WHERE name = ?
    `).get(name);

    if (!manager) {
      res.json({
        success: true,
        data: {
          name,
          level: '初级',
          score: 0
        }
      });
    } else {
      res.json({
        success: true,
        data: manager
      });
    }
  } catch (error) {
    console.error('获取项目经理数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取项目经理数据失败'
    });
  }
});

/**
 * 创建或更新项目经理数据
 * 仅管理员可访问
 */
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, level, score } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '项目经理姓名不能为空'
      });
    }

    // 检查是否已存在
    const existing = database.prepare(`
      SELECT id FROM project_managers WHERE name = ?
    `).get(name);

    if (existing) {
      // 更新
      database.prepare(`
        UPDATE project_managers
        SET level = ?, score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `).run(level, score, name);
    } else {
      // 创建
      database.prepare(`
        INSERT INTO project_managers (name, level, score)
        VALUES (?, ?, ?)
      `).run(name, level, score);
    }

    res.json({
      success: true,
      message: '项目经理数据保存成功'
    });
  } catch (error) {
    console.error('保存项目经理数据失败:', error);
    res.status(500).json({
      success: false,
      error: '保存项目经理数据失败'
    });
  }
});

/**
 * 批量创建项目经理数据（从项目表中初始化）
 * 仅管理员可访问
 */
router.post('/initialize', authenticate, requireAdmin, (req, res) => {
  try {
    // 获取所有项目经理
    const projectManagers = database.prepare(`
      SELECT DISTINCT project_manager FROM projects WHERE project_manager IS NOT NULL AND project_manager != ''
    `).all();

    let createdCount = 0;
    let updatedCount = 0;

    projectManagers.forEach(({ project_manager: name }) => {
      const existing = database.prepare(`
        SELECT id FROM project_managers WHERE name = ?
      `).get(name);

      if (!existing) {
        database.prepare(`
          INSERT INTO project_managers (name, level, score)
          VALUES (?, '初级', 0)
        `).run(name);
        createdCount++;
      } else {
        updatedCount++;
      }
    });

    res.json({
      success: true,
      message: `初始化完成，新增 ${createdCount} 个项目经理`,
      created: createdCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error('初始化项目经理数据失败:', error);
    res.status(500).json({
      success: false,
      error: '初始化项目经理数据失败'
    });
  }
});

export default router;