import database from '../db.js';

// 里程碑节点选项（排除已验收）
const MILESTONE_NODES = [
  'level_determined',
  'requirement_evaluation',
  'project_bidding',
  'contract_approval',
  'project_start',
  'plan_budget',
  'overview_solution',
  'detailed_solution',
  'internal_acceptance'
];

/**
 * 初始化里程碑节点数据
 * 为现有项目自动分配里程碑节点，并修正项目状态
 */
async function initMilestoneNodes() {
  try {
    await database.init();

    console.log('开始初始化里程碑节点数据...');

    // 检查里程碑节点字段是否存在
    const columns = database.all("PRAGMA table_info(projects)");
    const hasMilestoneNode = columns.some(col => col.name === 'milestone_node');

    if (!hasMilestoneNode) {
      console.log('里程碑节点字段不存在，请先运行 add_milestone_node.sql 迁移');
      return;
    }

    // 先修正项目状态：将所有包含"验收"的状态改为"已验收"
    const statusUpdateResult = database.run(
      "UPDATE projects SET status = '已验收' WHERE status LIKE '%验收%' AND status != '已验收'"
    );
    console.log(`修正了 ${statusUpdateResult.changes || 0} 个项目的状态为"已验收"`);

    // 获取所有项目（包含 milestone_node 字段）
    const projects = database.all('SELECT id, status, milestone_node FROM projects');

    if (projects.length === 0) {
      console.log('没有项目需要处理');
      return;
    }

    let updatedCount = 0;
    let acceptedCount = 0;
    let randomCount = 0;
    let skippedCount = 0; // 已有里程碑节点的项目

    // 为每个项目分配里程碑节点
    projects.forEach(project => {
      // 如果已有里程碑节点，跳过
      if (project.milestone_node) {
        skippedCount++;
        return;
      }

      let milestoneNode;

      // 已验收的项目设为"已验收"
      if (project.status === '已验收') {
        milestoneNode = 'accepted';
        acceptedCount++;
      } else {
        // 其他项目随机分配
        const randomIndex = Math.floor(Math.random() * MILESTONE_NODES.length);
        milestoneNode = MILESTONE_NODES[randomIndex];
        randomCount++;
      }

      // 更新项目
      database.run(
        'UPDATE projects SET milestone_node = ? WHERE id = ?',
        [milestoneNode, project.id]
      );
      updatedCount++;
    });

    database.save();

    console.log(`里程碑节点初始化完成！`);
    console.log(`- 修正了状态的项目: ${statusUpdateResult} 个`);
    console.log(`- 跳过已有里程碑节点的项目: ${skippedCount} 个`);
    console.log(`- 更新的项目: ${updatedCount} 个`);
    console.log(`  - 已验收项目: ${acceptedCount} 个`);
    console.log(`  - 随机分配项目: ${randomCount} 个`);

  } catch (error) {
    console.error('初始化里程碑节点失败:', error);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  initMilestoneNodes().then(() => {
    process.exit(0);
  });
}

export default initMilestoneNodes;