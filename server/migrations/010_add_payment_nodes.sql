-- 新增确认收入相关字段
ALTER TABLE projects ADD COLUMN is_confirmed INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN confirmed_date TEXT;

-- 创建回款节点表
CREATE TABLE IF NOT EXISTS payment_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    node_name TEXT NOT NULL,
    expected_amount REAL NOT NULL,
    actual_amount REAL DEFAULT 0,
    payment_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);