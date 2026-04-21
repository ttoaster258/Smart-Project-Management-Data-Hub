/**
 * 更新数据库中所有项目的毛利率字段
 * 随机生成 -10 到 80 之间的数值
 */

import database from '../db.js';

async function updateMarginRates() {
  try {
    await database.init();

    // 获取所有项目ID
    const projects = database.all('SELECT id, project_name FROM projects');
    console.log(`找到 ${projects.length} 个项目`);

    // 为每个项目生成随机毛利率并更新
    let updateCount = 0;
    projects.forEach((project) => {
      // 生成 -10 到 80 之间的随机数，保留1位小数
      const marginRate = (Math.random() * 90 - 10).toFixed(1);
      const marginRateStr = `${marginRate}%`;

      database.run('UPDATE projects SET margin_rate = ? WHERE id = ?', [marginRateStr, project.id]);
      console.log(`项目 ${project.project_name}: 毛利率 = ${marginRateStr}`);
      updateCount++;
    });

    // 保存数据库
    database.save();

    // 统计毛利率分布
    const updatedProjects = database.all('SELECT margin_rate FROM projects');
    const stats = {
      negative: 0,      // < 0%
      low: 0,           // 0-10%
      medium: 0,        // 10-30%
      high: 0           // > 30%
    };

    updatedProjects.forEach(p => {
      const rate = parseFloat(p.margin_rate) || 0;
      if (rate < 0) stats.negative++;
      else if (rate < 10) stats.low++;
      else if (rate <= 30) stats.medium++;
      else stats.high++;
    });

    console.log('\n毛利率分布统计:');
    console.log(`  0%以下 (负毛利): ${stats.negative} 个`);
    console.log(`  0%-10%: ${stats.low} 个`);
    console.log(`  10%-30%: ${stats.medium} 个`);
    console.log(`  30%以上: ${stats.high} 个`);
    console.log(`\n更新完成，共修改 ${updateCount} 个项目`);

  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateMarginRates();