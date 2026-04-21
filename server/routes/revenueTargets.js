import express from 'express';
import db from '../db.js';
import { adminOnlyMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取所有收入目标
 * GET /api/revenue-targets
 */
router.get('/', (req, res) => {
  try {
    const { year, region } = req.query;

    let sql = 'SELECT * FROM revenue_targets';
    const conditions = [];
    const params = [];

    if (year) {
      conditions.push('year = ?');
      params.push(parseInt(year));
    }

    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY year, quarter, region';

    const targets = db.all(sql, params);

    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个收入目标
 * GET /api/revenue-targets/:id
 */
router.get('/:id', (req, res) => {
  try {
    const target = db.get('SELECT * FROM revenue_targets WHERE id = ?', [parseInt(req.params.id)]);

    if (!target) {
      return res.status(404).json({
        success: false,
        error: '收入目标不存在'
      });
    }

    res.json({
      success: true,
      data: target
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建收入目标（仅管理员）
 * POST /api/revenue-targets
 */
router.post('/', adminOnlyMiddleware, (req, res) => {
  try {
    const { region, year, quarter, targetAmount } = req.body;

    if (!region || !year || !quarter || !targetAmount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段'
      });
    }

    // 检查是否已存在
    const existing = db.get(
      'SELECT id FROM revenue_targets WHERE region = ? AND year = ? AND quarter = ?',
      [region, parseInt(year), parseInt(quarter)]
    );

    if (existing) {
      // 更新现有记录
      db.run(
        'UPDATE revenue_targets SET target_amount = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
        [parseFloat(targetAmount), existing.id]
      );
      res.json({
        success: true,
        message: '收入目标更新成功',
        id: existing.id
      });
    } else {
      // 创建新记录
      const result = db.run(
        'INSERT INTO revenue_targets (region, year, quarter, target_amount) VALUES (?, ?, ?, ?)',
        [region, parseInt(year), parseInt(quarter), parseFloat(targetAmount)]
      );
      res.status(201).json({
        success: true,
        message: '收入目标创建成功',
        id: result.lastInsertRowid
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量更新收入目标（仅管理员）
 * POST /api/revenue-targets/batch
 */
router.post('/batch', adminOnlyMiddleware, (req, res) => {
  try {
    const { targets } = req.body;

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供收入目标数据'
      });
    }

    let updatedCount = 0;

    targets.forEach(target => {
      const { region, year, quarter, targetAmount } = target;

      if (!region || !year || !quarter || !targetAmount) {
        return; // 跳过无效数据
      }

      // 检查是否已存在
      const existing = db.get(
        'SELECT id FROM revenue_targets WHERE region = ? AND year = ? AND quarter = ?',
        [region, parseInt(year), parseInt(quarter)]
      );

      if (existing) {
        db.run(
          'UPDATE revenue_targets SET target_amount = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
          [parseFloat(targetAmount), existing.id]
        );
      } else {
        db.run(
          'INSERT INTO revenue_targets (region, year, quarter, target_amount) VALUES (?, ?, ?, ?)',
          [region, parseInt(year), parseInt(quarter), parseFloat(targetAmount)]
        );
      }
      updatedCount++;
    });

    res.json({
      success: true,
      message: `成功更新 ${updatedCount} 个收入目标`,
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
 * 更新收入目标（仅管理员）
 * PUT /api/revenue-targets/:id
 */
router.put('/:id', adminOnlyMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { targetAmount } = req.body;

    if (!targetAmount) {
      return res.status(400).json({
        success: false,
        error: '请提供目标金额'
      });
    }

    db.run(
      'UPDATE revenue_targets SET target_amount = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
      [parseFloat(targetAmount), parseInt(id)]
    );

    res.json({
      success: true,
      message: '收入目标更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除收入目标（仅管理员）
 * DELETE /api/revenue-targets/:id
 */
router.delete('/:id', adminOnlyMiddleware, (req, res) => {
  try {
    db.run('DELETE FROM revenue_targets WHERE id = ?', [parseInt(req.params.id)]);

    res.json({
      success: true,
      message: '收入目标删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;