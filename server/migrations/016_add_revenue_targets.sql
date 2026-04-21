-- 016_add_revenue_targets.sql
-- 收入目标表（各区域各季度）

CREATE TABLE IF NOT EXISTS revenue_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK(quarter >= 1 AND quarter <= 4),
    target_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_revenue_targets_region_year ON revenue_targets(region, year);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_year_quarter ON revenue_targets(year, quarter);

-- 插入默认数据（2026年各区域各季度目标，默认为0）
INSERT INTO revenue_targets (region, year, quarter, target_amount) VALUES
    ('东区', 2026, 1, 10000000),
    ('东区', 2026, 2, 12000000),
    ('东区', 2026, 3, 15000000),
    ('东区', 2026, 4, 18000000),
    ('南区', 2026, 1, 8000000),
    ('南区', 2026, 2, 10000000),
    ('南区', 2026, 3, 12000000),
    ('南区', 2026, 4, 15000000),
    ('西区', 2026, 1, 7000000),
    ('西区', 2026, 2, 8000000),
    ('西区', 2026, 3, 9000000),
    ('西区', 2026, 4, 10000000),
    ('北区（华中）', 2026, 1, 5000000),
    ('北区（华中）', 2026, 2, 6000000),
    ('北区（华中）', 2026, 3, 7000000),
    ('北区（华中）', 2026, 4, 8000000),
    ('北区（华北，东北）', 2026, 1, 9000000),
    ('北区（华北，东北）', 2026, 2, 10000000),
    ('北区（华北，东北）', 2026, 3, 11000000),
    ('北区（华北，东北）', 2026, 4, 12000000),
    ('创景可视（内转）', 2026, 1, 4000000),
    ('创景可视（内转）', 2026, 2, 5000000),
    ('创景可视（内转）', 2026, 3, 6000000),
    ('创景可视（内转）', 2026, 4, 7000000);