-- =====================================================
-- 项目成果相关表迁移
-- 创建时间: 2026-04-08
-- 描述: 创建项目成果、模型成果、软件成果、文档状态四张表
-- =====================================================

-- 1. 项目成果主表
CREATE TABLE IF NOT EXISTS project_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL UNIQUE,

    -- SVN地址
    svn_address TEXT,

    -- ========== 实施团队评分 ==========
    -- 区域总监硬性分 (45分)
    impl_is_recommended INTEGER DEFAULT 0,
    impl_hard_satisfaction INTEGER DEFAULT 0,        -- 质量控制-满意度 (15分)
    impl_hard_submit_quality INTEGER DEFAULT 0,      -- 质量控制-提交物质量 (10分)
    impl_hard_requirement INTEGER DEFAULT 0,         -- 需求控制情况 (10分)
    impl_hard_risk INTEGER DEFAULT 0,                -- 风险控制情况 (10分)

    -- 实施团队软性分 (20分)
    impl_soft_tech_reason TEXT,                      -- 技术提升-推荐理由
    impl_soft_tech_pmo_conclusion TEXT,              -- 技术提升-PMO评议结论
    impl_soft_tech_score INTEGER DEFAULT 0,          -- 技术提升-得分 (8分)
    impl_soft_team_reason TEXT,                      -- 团队建设-推荐理由
    impl_soft_team_pmo_conclusion TEXT,              -- 团队建设-PMO评议结论
    impl_soft_team_score INTEGER DEFAULT 0,          -- 团队建设-得分 (6分)
    impl_soft_result_reason TEXT,                    -- 成果积累-推荐理由
    impl_soft_result_pmo_conclusion TEXT,            -- 成果积累-PMO评议结论
    impl_soft_result_score INTEGER DEFAULT 0,        -- 成果积累-得分 (6分)

    -- PMO硬性分 (55分)
    impl_pmo_hard_delay INTEGER DEFAULT 0,           -- 进度控制-延期 (15分)
    impl_pmo_hard_node INTEGER DEFAULT 0,            -- 进度控制-节点 (15分)
    impl_pmo_hard_material INTEGER DEFAULT 0,        -- 质量控制-材料提交 (5分)
    impl_pmo_hard_digital INTEGER DEFAULT 0,         -- 数字化执行 (10分)
    impl_pmo_hard_cost INTEGER DEFAULT 0,            -- 成本控制 (10分)

    -- 实施团队合计
    impl_total_score INTEGER DEFAULT 0,

    -- ========== 售前团队评分 ==========
    -- 区域总监硬性分 (70分)
    pre_sales_is_recommended INTEGER DEFAULT 0,
    pre_sales_hard_requirement INTEGER DEFAULT 0,    -- 需求把控 (30分)
    pre_sales_hard_solution INTEGER DEFAULT 0,       -- 售前方案质量 (25分)
    pre_sales_hard_risk INTEGER DEFAULT 0,           -- 风险识别 (15分)

    -- 售前团队软性分 (20分)
    pre_sales_soft_tech_reason TEXT,                 -- 技术产品牵引-推荐理由
    pre_sales_soft_tech_pmo_conclusion TEXT,         -- 技术产品牵引-PMO评议结论
    pre_sales_soft_tech_score INTEGER DEFAULT 0,     -- 技术产品牵引-得分 (8分)
    pre_sales_soft_direction_reason TEXT,            -- 新方向拓展-推荐理由
    pre_sales_soft_direction_pmo_conclusion TEXT,    -- 新方向拓展-PMO评议结论
    pre_sales_soft_direction_score INTEGER DEFAULT 0,-- 新方向拓展-得分 (6分)
    pre_sales_soft_promotion_reason TEXT,            -- 成果推广-推荐理由
    pre_sales_soft_promotion_pmo_conclusion TEXT,    -- 成果推广-PMO评议结论
    pre_sales_soft_promotion_score INTEGER DEFAULT 0,-- 成果推广-得分 (6分)

    -- PMO硬性分 (30分)
    pre_sales_pmo_hard_activity INTEGER DEFAULT 0,   -- 售前活动执行 (10分)
    pre_sales_pmo_hard_digital INTEGER DEFAULT 0,    -- 数字化执行 (5分)
    pre_sales_pmo_hard_input INTEGER DEFAULT 0,      -- 投入评估 (15分)

    -- 售前团队合计
    pre_sales_total_score INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 2. 模型成果表
CREATE TABLE IF NOT EXISTS model_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_result_id INTEGER NOT NULL,
    model_name TEXT NOT NULL,                        -- 定制模型库名称
    problem_scenario TEXT,                           -- 项目解决的问题及应用场景
    value_extraction TEXT,                           -- 价值提炼
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_result_id) REFERENCES project_results(id) ON DELETE CASCADE
);

-- 3. 软件成果表
CREATE TABLE IF NOT EXISTS software_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_result_id INTEGER NOT NULL,
    software_name TEXT NOT NULL,                     -- 定制软件或工具箱名称
    problem_scenario TEXT,                           -- 项目解决的问题及应用场景
    value_extraction TEXT,                           -- 价值提炼
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_result_id) REFERENCES project_results(id) ON DELETE CASCADE
);

-- 4. 文档状态表
CREATE TABLE IF NOT EXISTS document_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_result_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,                     -- 文档类型名称
    is_submitted INTEGER DEFAULT 0,                  -- 是否已提交 (0: 未提交, 1: 已提交)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_result_id) REFERENCES project_results(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_results_project_id ON project_results(project_id);
CREATE INDEX IF NOT EXISTS idx_model_results_project_result_id ON model_results(project_result_id);
CREATE INDEX IF NOT EXISTS idx_software_results_project_result_id ON software_results(project_result_id);
CREATE INDEX IF NOT EXISTS idx_document_status_project_result_id ON document_status(project_result_id);
CREATE INDEX IF NOT EXISTS idx_document_status_type ON document_status(document_type);