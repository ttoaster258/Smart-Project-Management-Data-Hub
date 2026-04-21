-- 添加项目亮点字段
ALTER TABLE projects ADD COLUMN project_highlight TEXT;

-- 更新已有数据的标杆/亮点项目的项目亮点字段为空字符串
UPDATE projects SET project_highlight = '' WHERE is_benchmark = 1 OR is_highlight = 1;