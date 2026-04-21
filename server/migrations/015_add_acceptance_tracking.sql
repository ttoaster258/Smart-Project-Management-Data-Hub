-- 015_add_acceptance_tracking.sql
-- 验收追踪相关字段

-- 验收追踪专属字段
ALTER TABLE projects ADD COLUMN is_acceptance_tracking INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN acceptance_tracking_date TEXT;
ALTER TABLE projects ADD COLUMN tracking_acceptance_risk TEXT DEFAULT '无';
ALTER TABLE projects ADD COLUMN tracking_revenue_risk TEXT DEFAULT '无';
ALTER TABLE projects ADD COLUMN is_new_tracking INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN solution_measures TEXT;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_projects_acceptance_tracking ON projects(is_acceptance_tracking);
CREATE INDEX IF NOT EXISTS idx_projects_tracking_acceptance_risk ON projects(tracking_acceptance_risk);
CREATE INDEX IF NOT EXISTS idx_projects_tracking_revenue_risk ON projects(tracking_revenue_risk);