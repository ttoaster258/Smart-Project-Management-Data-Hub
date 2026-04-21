-- 在 projects 表添加变更统计字段
-- change_count: 变更次数
-- last_change_date: 最近变更通过时间

-- 检查字段是否存在，如果不存在则添加
ALTER TABLE projects ADD COLUMN change_count INTEGER DEFAULT 0;

-- 检查字段是否存在，如果不存在则添加
ALTER TABLE projects ADD COLUMN last_change_date TEXT;

-- 初始化现有项目的变更统计数据
UPDATE projects SET
    change_count = (
        SELECT COUNT(*) FROM project_changes
        WHERE project_changes.project_id = projects.id
    ),
    last_change_date = (
        SELECT change_date FROM project_changes
        WHERE project_changes.project_id = projects.id
        ORDER BY change_date DESC
        LIMIT 1
    );