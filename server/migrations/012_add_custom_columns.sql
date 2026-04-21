-- 自定义列定义表
CREATE TABLE IF NOT EXISTS custom_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_key TEXT NOT NULL UNIQUE,     -- 列标识符（如 custom_1, custom_2）
    column_name TEXT NOT NULL,           -- 列显示名称
    data_type TEXT NOT NULL DEFAULT 'text', -- 数据类型：text / number
    sort_order INTEGER DEFAULT 0,        -- 排序顺序
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 项目自定义列数据表
CREATE TABLE IF NOT EXISTS project_custom_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    column_key TEXT NOT NULL,
    value TEXT,                          -- 存储值（文本或数字都以字符串存储）
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, column_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_custom_columns_sort ON custom_columns(sort_order);
CREATE INDEX IF NOT EXISTS idx_project_custom_data_project ON project_custom_data(project_id);
CREATE INDEX IF NOT EXISTS idx_project_custom_data_column ON project_custom_data(column_key);