-- 用户自定义列配置表
CREATE TABLE IF NOT EXISTS user_column_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    columns TEXT NOT NULL,  -- JSON 数组字符串
    is_default INTEGER DEFAULT 0,  -- 是否为默认配置
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_column_configs_user_id ON user_column_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_column_configs_is_default ON user_column_configs(user_id, is_default);