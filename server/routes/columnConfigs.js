import express from 'express';
import database from '../db.js';

const router = express.Router();

/**
 * 获取用户的所有列配置
 * GET /api/column-configs
 */
router.get('/', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    // 获取当前用户 ID
    const session = database.prepare(`
      SELECT user_id FROM sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 获取用户的所有配置
    const configs = database.prepare(`
      SELECT id, name, columns, is_default, created_at, updated_at
      FROM user_column_configs
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all([session.user_id]);

    res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error('获取列配置错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取列配置失败'
    });
  }
});

/**
 * 保存列配置
 * POST /api/column-configs
 */
router.post('/', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { name, columns } = req.body;

    if (!name || !columns) {
      return res.status(400).json({
        success: false,
        error: '配置名称和字段列表不能为空'
      });
    }

    // 获取当前用户 ID
    const session = database.prepare(`
      SELECT user_id FROM sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 检查是否已存在同名配置
    const existing = database.prepare(`
      SELECT id FROM user_column_configs
      WHERE user_id = ? AND name = ?
    `).get([session.user_id, name]);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '配置名称已存在'
      });
    }

    // 保存配置
    const result = database.prepare(`
      INSERT INTO user_column_configs (user_id, name, columns, is_default)
      VALUES (?, ?, ?, 0)
    `).run([session.user_id, name, JSON.stringify(columns)]);

    database.save();

    const newConfig = database.prepare(`
      SELECT id, name, columns, is_default, created_at, updated_at
      FROM user_column_configs
      WHERE id = ?
    `).get([result.lastInsertRowid]);

    res.json({
      success: true,
      config: newConfig
    });
  } catch (error) {
    console.error('保存列配置错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '保存列配置失败'
    });
  }
});

/**
 * 删除列配置
 * DELETE /api/column-configs/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { id } = req.params;

    // 获取当前用户 ID
    const session = database.prepare(`
      SELECT user_id FROM sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 删除配置（只能删除自己的配置）
    const result = database.prepare(`
      DELETE FROM user_column_configs
      WHERE id = ? AND user_id = ?
    `).run([id, session.user_id]);

    database.save();

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '配置不存在或无权删除'
      });
    }

    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error) {
    console.error('删除列配置错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除列配置失败'
    });
  }
});

/**
 * 更新列配置名称
 * PUT /api/column-configs/:id
 */
router.put('/:id', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { name, columns } = req.body;
    const { id } = req.params;

    if (!name && !columns) {
      return res.status(400).json({
        success: false,
        error: '配置名称或字段列表不能为空'
      });
    }

    // 获取当前用户 ID
    const session = database.prepare(`
      SELECT user_id FROM sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 构建更新语句
    let updateFields = [];
    let updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (columns) {
      updateFields.push('columns = ?');
      updateValues.push(JSON.stringify(columns));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段'
      });
    }

    updateFields.push('updated_at = datetime("now")');
    updateValues.push(id, session.user_id);

    const result = database.prepare(`
      UPDATE user_column_configs
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(updateValues);

    database.save();

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '配置不存在或无权更新'
      });
    }

    const updatedConfig = database.prepare(`
      SELECT id, name, columns, is_default, created_at, updated_at
      FROM user_column_configs
      WHERE id = ?
    `).get([id]);

    res.json({
      success: true,
      config: updatedConfig
    });
  } catch (error) {
    console.error('更新列配置错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新列配置失败'
    });
  }
});

/**
 * 设置默认配置
 * POST /api/column-configs/:id/set-default
 */
router.post('/:id/set-default', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { id } = req.params;

    // 获取当前用户 ID
    const session = database.prepare(`
      SELECT user_id FROM sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 取消该用户所有默认配置
    database.prepare(`
      UPDATE user_column_configs
      SET is_default = 0
      WHERE user_id = ?
    `).run([session.user_id]);

    // 设置新的默认配置
    database.prepare(`
      UPDATE user_column_configs
      SET is_default = 1
      WHERE id = ? AND user_id = ?
    `).run([id, session.user_id]);

    database.save();

    res.json({
      success: true,
      message: '默认配置设置成功'
    });
  } catch (error) {
    console.error('设置默认配置错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '设置默认配置失败'
    });
  }
});

export default router;