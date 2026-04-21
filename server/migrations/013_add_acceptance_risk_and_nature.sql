-- 添加项目验收风险等级字段
ALTER TABLE projects ADD COLUMN acceptance_risk_level TEXT DEFAULT '';

-- 添加项目性质字段（多选，存储为JSON数组字符串）
ALTER TABLE projects ADD COLUMN project_nature TEXT DEFAULT '[]';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_acceptance_risk ON projects(acceptance_risk_level);
CREATE INDEX IF NOT EXISTS idx_projects_nature ON projects(project_nature);