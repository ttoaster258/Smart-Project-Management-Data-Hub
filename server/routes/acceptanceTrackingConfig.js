import express from 'express';
import db from '../db.js';
import { adminOnlyMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取所有验收追踪配置
 * GET /api/acceptance-tracking-config
 */
router.get('/', (req, res) => {
  try {
    const configs = db.all('SELECT * FROM acceptance_tracking_config ORDER BY config_key');

    // 转换为对象格式方便前端使用
    const configMap = {};
    configs.forEach(config => {
      configMap[config.config_key] = config.config_value;
    });

    res.json({
      success: true,
      data: configs,
      configMap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个配置
 * GET /api/acceptance-tracking-config/:key
 */
router.get('/:key', (req, res) => {
  try {
    const config = db.get(
      'SELECT * FROM acceptance_tracking_config WHERE config_key = ?',
      [req.params.key]
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: '配置项不存在'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新配置（仅管理员）
 * PUT /api/acceptance-tracking-config/:key
 */
router.put('/:key', adminOnlyMiddleware, (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({
        success: false,
        error: '请提供配置值'
      });
    }

    // 检查配置是否存在
    const existing = db.get(
      'SELECT id FROM acceptance_tracking_config WHERE config_key = ?',
      [key]
    );

    if (existing) {
      db.run(
        'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = ?',
        [value, key]
      );
    } else {
      db.run(
        'INSERT INTO acceptance_tracking_config (config_key, config_value) VALUES (?, ?)',
        [key, value]
      );
    }

    res.json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量更新配置（仅管理员）
 * POST /api/acceptance-tracking-config/batch
 */
router.post('/batch', adminOnlyMiddleware, (req, res) => {
  try {
    const { configs } = req.body;

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        success: false,
        error: '请提供配置数据'
      });
    }

    let updatedCount = 0;

    Object.entries(configs).forEach(([key, value]) => {
      const existing = db.get(
        'SELECT id FROM acceptance_tracking_config WHERE config_key = ?',
        [key]
      );

      if (existing) {
        db.run(
          'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = ?',
          [String(value), key]
        );
      } else {
        db.run(
          'INSERT INTO acceptance_tracking_config (config_key, config_value) VALUES (?, ?)',
          [key, String(value)]
        );
      }
      updatedCount++;
    });

    res.json({
      success: true,
      message: `成功更新 ${updatedCount} 个配置`,
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
 * 获取列配置
 * GET /api/acceptance-tracking-config/columns
 */
router.get('/columns', (req, res) => {
  try {
    const visibleColumns = db.get(
      'SELECT config_value FROM acceptance_tracking_config WHERE config_key = "visible_columns"'
    );
    const columnOrder = db.get(
      'SELECT config_value FROM acceptance_tracking_config WHERE config_key = "column_order"'
    );

    res.json({
      success: true,
      data: {
        visibleColumns: visibleColumns?.config_value || '',
        columnOrder: columnOrder?.config_value || ''
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
 * 更新列配置（仅管理员）
 * PUT /api/acceptance-tracking-config/columns
 */
router.put('/columns', adminOnlyMiddleware, (req, res) => {
  try {
    const { visibleColumns, columnOrder } = req.body;

    if (visibleColumns) {
      db.run(
        'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = "visible_columns"',
        [visibleColumns]
      );
    }

    if (columnOrder) {
      db.run(
        'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = "column_order"',
        [columnOrder]
      );
    }

    res.json({
      success: true,
      message: '列配置更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取全局指标（预期收入、预测收入）
 * GET /api/acceptance-tracking-config/indicators
 */
router.get('/indicators', (req, res) => {
  try {
    const expectedRevenue = db.get(
      'SELECT config_value FROM acceptance_tracking_config WHERE config_key = "expected_revenue"'
    );
    const forecastRevenue = db.get(
      'SELECT config_value FROM acceptance_tracking_config WHERE config_key = "forecast_revenue"'
    );

    res.json({
      success: true,
      data: {
        expectedRevenue: parseFloat(expectedRevenue?.config_value || '0'),
        forecastRevenue: parseFloat(forecastRevenue?.config_value || '0')
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
 * 更新全局指标（仅管理员）
 * PUT /api/acceptance-tracking-config/indicators
 */
router.put('/indicators', adminOnlyMiddleware, (req, res) => {
  try {
    const { expectedRevenue, forecastRevenue } = req.body;

    if (expectedRevenue !== undefined) {
      db.run(
        'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = "expected_revenue"',
        [String(expectedRevenue)]
      );
    }

    if (forecastRevenue !== undefined) {
      db.run(
        'UPDATE acceptance_tracking_config SET config_value = ?, updated_at = datetime("now", "localtime") WHERE config_key = "forecast_revenue"',
        [String(forecastRevenue)]
      );
    }

    res.json({
      success: true,
      message: '全局指标更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;