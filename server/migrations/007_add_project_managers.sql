-- 创建项目经理档案表
CREATE TABLE IF NOT EXISTS project_managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    level TEXT NOT NULL DEFAULT '初级', -- 初级、中级、高级、标杆
    score INTEGER DEFAULT 0, -- 百分制评分
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_managers_name ON project_managers(name);
CREATE INDEX IF NOT EXISTS idx_project_managers_level ON project_managers(level);