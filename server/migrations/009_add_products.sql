-- 创建产品表（可配置的产品列表）
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建项目-产品关联表（多对多，包含销售金额）
CREATE TABLE IF NOT EXISTS project_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    sales_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(project_id, product_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_products_project_id ON project_products(project_id);
CREATE INDEX IF NOT EXISTS idx_project_products_product_id ON project_products(product_id);

-- 初始化默认产品数据
INSERT OR IGNORE INTO products (name, sort_order) VALUES
    ('MWORKS. Sysplorer 基础平台', 1),
    ('Sysplorer', 2),
    ('Sysplorer CAD 工具箱', 3),
    ('电机模型库', 4),
    ('postEngineer', 5);