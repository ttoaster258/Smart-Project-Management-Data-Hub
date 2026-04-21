-- 创建项目里程碑表
CREATE TABLE IF NOT EXISTS project_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  milestone_node TEXT NOT NULL,
  planned_date TEXT,
  actual_date TEXT,
  is_skipped INTEGER DEFAULT 0,
  is_required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, milestone_node)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_node ON project_milestones(milestone_node);

-- 插入初始化数据（为现有项目创建里程碑记录）
-- 注意：这里不执行插入操作，由后端初始化脚本完成