/**
 * 初始化项目销售产品数据
 * 为销售项目和混合项目随机分配产品和销售金额
 */

import database from '../db.js';

function initProjectProducts() {
  console.log('开始初始化项目销售产品数据...');

  try {
    // 检查是否已有数据
    const existingCount = database.prepare(`
      SELECT COUNT(*) as count FROM project_products
    `).get().count;

    if (existingCount > 0) {
      console.log(`项目产品数据已存在 ${existingCount} 条，跳过初始化`);
      return;
    }

    // 获取所有产品
    const products = database.prepare(`
      SELECT id, name FROM products ORDER BY sort_order
    `).all();

    if (products.length === 0) {
      console.log('产品列表为空，请先执行产品表迁移');
      return;
    }

    console.log(`找到 ${products.length} 个产品:`, products.map(p => p.name).join(', '));

    // 获取所有销售项目和混合项目
    const salesProjects = database.prepare(`
      SELECT id, project_name, type, contract_amount
      FROM projects
      WHERE type IN ('销售项目', '混合项目')
    `).all();

    if (salesProjects.length === 0) {
      console.log('没有找到销售项目或混合项目');
      return;
    }

    console.log(`找到 ${salesProjects.length} 个销售项目/混合项目`);

    // 准备插入语句
    const insertStmt = database.prepare(`
      INSERT INTO project_products (project_id, product_id, sales_amount)
      VALUES (?, ?, ?)
    `);

    let insertedCount = 0;

    // 为每个项目分配1-3个产品
    salesProjects.forEach(project => {
      // 随机决定分配几个产品（1-3个）
      const productCount = Math.floor(Math.random() * 3) + 1;

      // 随机选择产品（不重复）
      const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
      const selectedProducts = shuffledProducts.slice(0, productCount);

      // 根据合同金额分配销售金额
      const contractAmount = project.contract_amount || 1000000;
      const totalSalesAmount = contractAmount * (0.6 + Math.random() * 0.4); // 60%-100%的合同金额

      selectedProducts.forEach((product, index) => {
        // 最后一个产品获得剩余金额，其他随机分配
        let salesAmount;
        if (index === selectedProducts.length - 1) {
          // 最后一个产品获得剩余金额
          const assignedAmount = selectedProducts.slice(0, index).reduce((sum, p) => sum + (p._amount || 0), 0);
          salesAmount = Math.round(totalSalesAmount - assignedAmount);
        } else {
          // 随机分配金额
          const remaining = selectedProducts.length - index;
          const avgAmount = (totalSalesAmount - (selectedProducts.slice(0, index).reduce((sum, p) => sum + (p._amount || 0), 0))) / remaining;
          salesAmount = Math.round(avgAmount * (0.5 + Math.random()));
          product._amount = salesAmount;
        }

        // 确保金额为正数
        salesAmount = Math.max(10000, salesAmount);

        insertStmt.run([project.id, product.id, salesAmount]);
        insertedCount++;
      });
    });

    database.save();
    console.log(`项目产品数据初始化完成，共插入 ${insertedCount} 条记录`);

    // 显示统计信息
    const stats = database.prepare(`
      SELECT
        p.name as product_name,
        COUNT(pp.id) as project_count,
        SUM(pp.sales_amount) as total_sales
      FROM products p
      LEFT JOIN project_products pp ON p.id = pp.product_id
      GROUP BY p.id
      ORDER BY total_sales DESC
    `).all();

    console.log('\n产品销售统计:');
    stats.forEach(stat => {
      const totalSales = (stat.total_sales || 0) / 10000;
      console.log(`  ${stat.product_name}: ${stat.project_count}个项目, ${totalSales.toFixed(2)}万元`);
    });

  } catch (error) {
    console.error('初始化项目产品数据失败:', error);
  }
}

// 执行初始化
initProjectProducts();

export default initProjectProducts;