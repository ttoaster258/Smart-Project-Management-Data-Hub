-- 添加里程碑节点字段
ALTER TABLE projects ADD COLUMN milestone_node TEXT;

-- 为里程碑节点字段创建索引
CREATE INDEX IF NOT EXISTS idx_projects_milestone_node ON projects(milestone_node);