import express from 'express';
import database from '../db.js';

const router = express.Router();

/**
 * 检查是否为管理员
 */
async function checkAdmin(req) {
  const token = req.headers['authorization']?.substring(7);
  if (!token) return false;

  const session = database.prepare(`
    SELECT user_id FROM sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).get([token]);

  if (!session) return false;

  // 检查用户是否为管理员（通过 IP 检查）
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const adminIp = database.prepare('SELECT * FROM admin_ips WHERE ip_address = ?').get([clientIp]);

  return !!adminIp;
}

/**
 * 获取所有自定义列定义
 * GET /api/custom-columns
 */
router.get('/', (req, res) => {
  try {
    const columns = database.prepare(`
      SELECT * FROM custom_columns
      ORDER BY sort_order, id
    `).all();

    res.json({
      success: true,
      data: columns
    });
  } catch (error) {
    console.error('获取自定义列错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取自定义列失败'
    });
  }
});

/**
 * 创建自定义列
 * POST /api/custom-columns
 */
router.post('/', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: '只有管理员可以创建自定义列'
      });
    }

    const { columnName, dataType } = req.body;

    if (!columnName || !columnName.trim()) {
      return res.status(400).json({
        success: false,
        error: '列名称不能为空'
      });
    }

    // 检查列名是否已存在
    const existing = database.prepare(`
      SELECT id FROM custom_columns WHERE column_name = ?
    `).get([columnName.trim()]);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '列名称已存在'
      });
    }

    // 生成唯一的 column_key
    const count = database.prepare('SELECT COUNT(*) as count FROM custom_columns').get();
    const columnKey = `custom_${count.count + 1}`;

    // 获取最大排序号
    const maxOrder = database.prepare('SELECT MAX(sort_order) as max_order FROM custom_columns').get();
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    const result = database.prepare(`
      INSERT INTO custom_columns (column_key, column_name, data_type, sort_order)
      VALUES (?, ?, ?, ?)
    `).run([columnKey, columnName.trim(), dataType || 'text', sortOrder]);

    database.save();

    const newColumn = database.prepare(`
      SELECT * FROM custom_columns WHERE id = ?
    `).get([result.lastInsertRowid]);

    res.json({
      success: true,
      data: newColumn
    });
  } catch (error) {
    console.error('创建自定义列错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '创建自定义列失败'
    });
  }
});

/**
 * 更新自定义列
 * PUT /api/custom-columns/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: '只有管理员可以更新自定义列'
      });
    }

    const { id } = req.params;
    const { columnName, dataType, sortOrder } = req.body;

    // 检查列是否存在
    const existing = database.prepare('SELECT * FROM custom_columns WHERE id = ?').get([id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '自定义列不存在'
      });
    }

    // 检查新名称是否与其他列冲突
    if (columnName && columnName.trim() !== existing.column_name) {
      const nameConflict = database.prepare(`
        SELECT id FROM custom_columns WHERE column_name = ? AND id != ?
      `).get([columnName.trim(), id]);

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: '列名称已存在'
        });
      }
    }

    // 构建更新语句
    const updates = [];
    const values = [];

    if (columnName) {
      updates.push('column_name = ?');
      values.push(columnName.trim());
    }
    if (dataType) {
      updates.push('data_type = ?');
      values.push(dataType);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段'
      });
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    database.prepare(`
      UPDATE custom_columns SET ${updates.join(', ')} WHERE id = ?
    `).run(values);

    database.save();

    const updatedColumn = database.prepare(`
      SELECT * FROM custom_columns WHERE id = ?
    `).get([id]);

    res.json({
      success: true,
      data: updatedColumn
    });
  } catch (error) {
    console.error('更新自定义列错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新自定义列失败'
    });
  }
});

/**
 * 删除自定义列
 * DELETE /api/custom-columns/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: '只有管理员可以删除自定义列'
      });
    }

    const { id } = req.params;

    // 获取列信息
    const column = database.prepare('SELECT * FROM custom_columns WHERE id = ?').get([id]);
    if (!column) {
      return res.status(404).json({
        success: false,
        error: '自定义列不存在'
      });
    }

    // 删除该列的所有数据
    database.prepare('DELETE FROM project_custom_data WHERE column_key = ?').run([column.column_key]);

    // 删除列定义
    database.prepare('DELETE FROM custom_columns WHERE id = ?').run([id]);

    database.save();

    res.json({
      success: true,
      message: '自定义列删除成功'
    });
  } catch (error) {
    console.error('删除自定义列错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除自定义列失败'
    });
  }
});

/**
 * 获取所有项目的自定义列数据
 * GET /api/custom-columns/data
 */
router.get('/data', (req, res) => {
  try {
    const data = database.prepare(`
      SELECT project_id, column_key, value
      FROM project_custom_data
    `).all();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取自定义列数据错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取自定义列数据失败'
    });
  }
});

/**
 * 更新项目的自定义列值
 * PUT /api/custom-columns/data/:projectId/:columnKey
 */
router.put('/data/:projectId/:columnKey', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: '只有管理员可以编辑自定义列数据'
      });
    }

    const { projectId, columnKey } = req.params;
    const { value } = req.body;

    // 检查项目是否存在
    const project = database.prepare('SELECT id FROM projects WHERE id = ?').get([projectId]);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 检查列是否存在
    const column = database.prepare('SELECT * FROM custom_columns WHERE column_key = ?').get([columnKey]);
    if (!column) {
      return res.status(404).json({
        success: false,
        error: '自定义列不存在'
      });
    }

    // 使用 UPSERT 语法
    database.prepare(`
      INSERT INTO project_custom_data (project_id, column_key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(project_id, column_key)
      DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run([projectId, columnKey, value ?? '']);

    database.save();

    res.json({
      success: true,
      message: '数据更新成功'
    });
  } catch (error) {
    console.error('更新自定义列数据错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新自定义列数据失败'
    });
  }
});

export default router;