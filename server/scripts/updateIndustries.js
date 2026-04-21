/**
 * 更新数据库中所有项目的行业字段
 * 将行业统一修改为：核能、车辆、电子信息、电力能源、高端制造、教育
 */

import database from '../db.js';

// 目标行业列表
const TARGET_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];

async function updateIndustries() {
    try {
        await database.init();

        // 获取所有项目
        const projects = database.all('SELECT id, industry FROM projects');
        console.log(`找到 ${projects.length} 个项目`);

        // 统计当前行业分布
        const currentIndustries = {};
        projects.forEach(p => {
            currentIndustries[p.industry] = (currentIndustries[p.industry] || 0) + 1;
        });
        console.log('当前行业分布:', currentIndustries);

        // 将项目均匀分配到六个行业
        // 保留原有的核能项目，其他项目均匀分配
        const nuclearProjects = projects.filter(p => p.industry === '核能');
        const otherProjects = projects.filter(p => p.industry !== '核能');

        const otherIndustries = ['车辆', '电子信息', '电力能源', '高端制造', '教育'];
        const projectsPerIndustry = Math.ceil(otherProjects.length / otherIndustries.length);

        console.log(`核能项目保持不变: ${nuclearProjects.length} 个`);
        console.log(`其他项目分配: 每行业约 ${projectsPerIndustry} 个`);

        let updateCount = 0;

        // 分配其他项目到五个行业
        otherProjects.forEach((project, index) => {
            const industryIndex = Math.floor(index / projectsPerIndustry) % otherIndustries.length;
            const newIndustry = otherIndustries[industryIndex];

            database.run('UPDATE projects SET industry = ? WHERE id = ?', [newIndustry, project.id]);
            console.log(`项目 ${project.id}: ${project.industry} → ${newIndustry}`);
            updateCount++;
        });

        // 保存数据库
        database.save();

        // 统计更新后的行业分布
        const updatedProjects = database.all('SELECT industry FROM projects');
        const newIndustries = {};
        updatedProjects.forEach(p => {
            newIndustries[p.industry] = (newIndustries[p.industry] || 0) + 1;
        });
        console.log('更新后行业分布:', newIndustries);
        console.log(`更新完成，共修改 ${updateCount} 个项目`);

    } catch (error) {
        console.error('更新失败:', error);
        process.exit(1);
    }

    process.exit(0);
}

updateIndustries();