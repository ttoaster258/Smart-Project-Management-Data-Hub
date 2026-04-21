-- 项目主表
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_code TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    security_level TEXT,
    status TEXT NOT NULL,
    status_comment TEXT,
    risk_reason TEXT,
    forecast_acceptance_date TEXT,
    main_work_completed TEXT,
    budget_usage TEXT,
    margin_rate TEXT,
    forecast_2026_revenue REAL,
    forecast_2026_loss_revenue REAL,
    outsourcer_name TEXT,
    outsourcer_amount REAL,
    outsourcer_tech_content TEXT,
    equipment_spec TEXT,
    outsourcer_ratio TEXT,
    received_thank_you_date TEXT,
    document_received_date TEXT,
    remarks TEXT,
    project_highlight TEXT,
    phase TEXT,
    type TEXT,
    level TEXT,
    industry TEXT,
    region TEXT NOT NULL,
    is_benchmark INTEGER DEFAULT 0,
    is_highlight INTEGER DEFAULT 0,
    kickoff_date TEXT,
    planned_end_date TEXT,
    contract_end_date TEXT,
    acceptance_date TEXT,
    delay_months INTEGER DEFAULT 0,
    acceptance_year TEXT,
    acceptance_control TEXT,
    contract_name TEXT,
    group_company TEXT,
    contract_amount REAL,
    historical_paid REAL,
    paid_2026 REAL,
    pending REAL,
    pending_this_year REAL,
    ratio REAL,
    total_paid REAL,
    annual_confirmed_revenue REAL,
    accepted_pending_revenue REAL,
    initial_quote REAL,
    req_evaluation_fee REAL,
    internal_cost REAL,
    internal_profit REAL,
    total_budget REAL,
    budget_used_amount REAL,
    planned_total REAL,
    pmo_annual_total REAL,
    progress REAL,
    input_percent REAL,
    pre_sales_total REAL,
    execution_total REAL,
    quality_score_raw REAL,
    project_manager TEXT,
    pre_sales_manager TEXT,
    sales_manager TEXT,
    project_director TEXT,
    team_members TEXT,
    milestone_node TEXT,
    is_confirmed INTEGER DEFAULT 0,
    confirmed_date TEXT,
    change_count INTEGER DEFAULT 0,
    last_change_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 人员工时明细表
CREATE TABLE IF NOT EXISTS person_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    monthly_data TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 项目变更记录表
CREATE TABLE IF NOT EXISTS project_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    content TEXT,
    before TEXT,
    after TEXT,
    impacts_performance INTEGER DEFAULT 0,
    change_date TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 外协采购明细表
CREATE TABLE IF NOT EXISTS outsourcing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    spec TEXT,
    quantity INTEGER,
    supplier TEXT,
    total_amount REAL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',  -- admin 或 user
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 管理员 IP 白名单表
CREATE TABLE IF NOT EXISTS admin_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认本地管理员 IP
INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('::1', 'Localhost IPv6');
INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('127.0.0.1', 'Localhost IPv4');
INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('::ffff:127.0.0.1', 'Localhost IPv4 Mapping');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_region ON projects(region);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_kickoff ON projects(kickoff_date);
CREATE INDEX IF NOT EXISTS idx_person_hours_project ON person_hours(project_id);
CREATE INDEX IF NOT EXISTS idx_project_changes_project ON project_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_outsourcing_items_project ON outsourcing_items(project_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_ips_address ON admin_ips(ip_address);