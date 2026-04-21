// 检查项目团队字段数据
import database from '../db.js';

console.log('检查 team_members 字段数据...\n');

try {
  // 查询所有项目的 team_members 字段
  const projects = database.prepare(`
    SELECT id, project_code, project_name, team_members
    FROM projects
  `).all();

  console.log(`共 ${projects.length} 个项目\n`);

  let hasTeamMembers = 0;
  let emptyTeamMembers = 0;

  projects.forEach(p => {
    if (p.team_members && p.team_members !== '[]' && p.team_members !== 'null') {
      hasTeamMembers++;
      console.log(`✓ ${p.project_code} - ${p.project_name}`);
      console.log(`  team_members: ${p.team_members}\n`);
    } else {
      emptyTeamMembers++;
    }
  });

  console.log('='.repeat(50));
  console.log(`有团队数据: ${hasTeamMembers} 个项目`);
  console.log(`无团队数据: ${emptyTeamMembers} 个项目`);

} catch (error) {
  console.error('查询失败:', error);
}