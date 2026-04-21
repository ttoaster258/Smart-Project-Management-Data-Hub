import express from 'express';
import database from '../db.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取所有产品列表
 * GET /api/products
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const products = database.prepare(`
      SELECT * FROM products
      ORDER BY sort_order, id
    `).all();

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个产品
 * GET /api/products/:id
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const product = database.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get([req.params.id]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('获取产品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新产品（管理员）
 * POST /api/products
 */
router.post('/', optionalAuth, requireAdmin, (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '产品名称不能为空'
      });
    }

    const result = database.prepare(`
      INSERT INTO products (name, sort_order)
      VALUES (?, ?)
    `).run([name.trim(), sort_order]);

    database.save();

    const newProduct = database.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get([result.lastInsertRowid]);

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error('创建产品失败:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        error: '产品名称已存在'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新产品（管理员）
 * PUT /api/products/:id
 */
router.put('/:id', optionalAuth, requireAdmin, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const { id } = req.params;

    const existing = database.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get([id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }

    database.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          sort_order = COALESCE(?, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run([
      name?.trim() || null,
      sort_order ?? null,
      id
    ]);

    database.save();

    const updated = database.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get([id]);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('更新产品失败:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        error: '产品名称已存在'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除产品（管理员）
 * DELETE /api/products/:id
 */
router.delete('/:id', optionalAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const existing = database.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get([id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '产品不存在'
      });
    }

    // 删除关联的项目产品记录
    database.prepare('DELETE FROM project_products WHERE product_id = ?').run([id]);

    // 删除产品
    database.prepare('DELETE FROM products WHERE id = ?').run([id]);
    database.save();

    res.json({
      success: true,
      message: '产品已删除'
    });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 项目-产品关联接口 ====================

/**
 * 获取项目的销售产品列表
 * GET /api/projects/:id/products
 */
router.get('/for-project/:projectId', optionalAuth, (req, res) => {
  try {
    const { projectId } = req.params;

    const products = database.prepare(`
      SELECT pp.*, p.name as product_name
      FROM project_products pp
      JOIN products p ON pp.product_id = p.id
      WHERE pp.project_id = ?
      ORDER BY p.sort_order, p.id
    `).all([projectId]);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取项目产品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 保存项目的销售产品（管理员）
 * POST /api/projects/:id/products
 * 请求体: { products: [{ product_id: number, sales_amount: number }] }
 */
router.post('/for-project/:projectId', optionalAuth, requireAdmin, (req, res) => {
  try {
    const { projectId } = req.params;
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: '产品数据格式错误'
      });
    }

    // 验证项目是否存在
    const project = database.prepare(`
      SELECT id, type FROM projects WHERE id = ?
    `).get([projectId]);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 删除现有关联
    database.prepare(`
      DELETE FROM project_products WHERE project_id = ?
    `).run([projectId]);

    // 插入新关联
    const insertStmt = database.prepare(`
      INSERT INTO project_products (project_id, product_id, sales_amount)
      VALUES (?, ?, ?)
    `);

    products.forEach(item => {
      if (item.product_id && item.sales_amount >= 0) {
        insertStmt.run([projectId, item.product_id, item.sales_amount || 0]);
      }
    });

    database.save();

    // 返回保存后的数据
    const savedProducts = database.prepare(`
      SELECT pp.*, p.name as product_name
      FROM project_products pp
      JOIN products p ON pp.product_id = p.id
      WHERE pp.project_id = ?
      ORDER BY p.sort_order, p.id
    `).all([projectId]);

    res.json({
      success: true,
      data: savedProducts
    });
  } catch (error) {
    console.error('保存项目产品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取产品销售统计（用于产品销售排名）
 * GET /api/products/stats/sales
 */
router.get('/stats/sales', optionalAuth, (req, res) => {
  try {
    const stats = database.prepare(`
      SELECT
        p.id,
        p.name,
        p.sort_order,
        COALESCE(SUM(pp.sales_amount), 0) as total_sales_amount,
        COUNT(DISTINCT pp.project_id) as project_count
      FROM products p
      LEFT JOIN project_products pp ON p.id = pp.product_id
      LEFT JOIN projects pr ON pp.project_id = pr.id
      GROUP BY p.id
      ORDER BY total_sales_amount DESC, p.sort_order
    `).all();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取产品销售统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;