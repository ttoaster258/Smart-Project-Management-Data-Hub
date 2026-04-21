-- 017_add_acceptance_tracking_config.sql
-- 验收追踪全局配置表

CREATE TABLE IF NOT EXISTS acceptance_tracking_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_tracking_config_key ON acceptance_tracking_config(config_key);

-- 初始化默认配置
INSERT INTO acceptance_tracking_config (config_key, config_value, description) VALUES
    ('expected_revenue', '0', '预期收入（全局指标）'),
    ('forecast_revenue', '0', '预测收入（全局指标）'),
    ('visible_columns', 'projectName,trackingFocusLevel,level,region,projectManager,contractAmount,trackingStatus,controllability', '列表显示的列'),
    ('column_order', 'projectName,trackingFocusLevel,level,region,projectManager,contractAmount,trackingStatus,controllability', '列顺序');