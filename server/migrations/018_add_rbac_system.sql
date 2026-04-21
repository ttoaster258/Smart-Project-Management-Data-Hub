-- =====================================================
-- 018_add_rbac_system.sql
-- RBAC (基于角色的权限访问控制) 系统迁移
-- =====================================================

-- 1. 角色表
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- admin, executive, pmo, regional_director, pm
    display_name TEXT NOT NULL,          -- 超级管理员, 经营管理层, PMO管理办, 区域总监, 项目经理
    description TEXT,
    is_system INTEGER DEFAULT 0,         -- 系统内置角色不可删除
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,           -- 权限代码如 'project:create', 'project:edit'
    name TEXT NOT NULL,                  -- 权限名称
    module TEXT NOT NULL,                -- 模块：project, dashboard, report, system
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. 角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 4. 用户-角色关联表（支持多角色）
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 5. 扩展用户表：添加区域字段（用于区域总监）
ALTER TABLE users ADD COLUMN region TEXT;

-- 尝试添加 linked_pm_name 列（用于项目经理关联）
ALTER TABLE users ADD COLUMN linked_pm_name TEXT;

-- 尝试添加 status 列（用户状态：active/inactive）
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

-- 尝试添加 last_login_at 列
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- =====================================================
-- 插入默认角色数据
-- =====================================================
INSERT OR IGNORE INTO roles (name, display_name, description, is_system) VALUES
('admin', '超级管理员', '拥有全量功能和全量数据权限，可配置其他角色权限', 1),
('executive', '经营管理层', '查看经营决策看板和区域看板，全量查看权，无增删改权限', 1),
('pmo', 'PMO管理办', '全量数据的编辑、审核、风险预警处理权限', 1),
('regional_director', '区域总监', '仅查看和管理所属区域的项目和区域看板', 1),
('pm', '项目经理', '仅管理自己负责的项目，查看个人看板', 1);

-- =====================================================
-- 插入权限定义
-- =====================================================
-- 项目模块权限
INSERT OR IGNORE INTO permissions (code, name, module, description) VALUES
('project:view', '查看项目', 'project', '查看项目基本信息'),
('project:view_all', '查看全量项目', 'project', '查看所有项目数据'),
('project:view_region', '查看区域项目', 'project', '查看所属区域的项目'),
('project:view_own', '查看自己的项目', 'project', '查看自己负责的项目'),
('project:create', '新增项目', 'project', '创建新项目'),
('project:edit', '编辑项目', 'project', '编辑项目信息'),
('project:edit_all', '编辑全量项目', 'project', '编辑所有项目'),
('project:edit_region', '编辑区域项目', 'project', '编辑所属区域的项目'),
('project:edit_own', '编辑自己的项目', 'project', '编辑自己负责的项目'),
('project:delete', '删除项目', 'project', '删除项目'),
('project:delete_all', '删除全量项目', 'project', '删除任意项目'),
('project:delete_region', '删除区域项目', 'project', '删除所属区域项目'),
('project:delete_own', '删除自己的项目', 'project', '删除自己负责的项目'),

-- 看板模块权限
('dashboard:business', '访问经营决策看板', 'dashboard', '访问项目经营看板'),
('dashboard:regional', '访问区域经营看板', 'dashboard', '访问区域经营看板（全量区域）'),
('dashboard:regional_own', '访问自己区域的看板', 'dashboard', '访问所属区域经营看板'),
('dashboard:pmo', '访问PMO项目管理看板', 'dashboard', '访问PMO项目管理看板'),
('dashboard:pmo_progress', '访问进度监控', 'dashboard', '访问进度监控页面'),
('dashboard:pmo_cost', '访问成本监控', 'dashboard', '访问成本监控页面'),
('dashboard:pmo_change', '访问变更管理', 'dashboard', '访问变更管理页面'),
('dashboard:pmo_risk', '访问风险预警', 'dashboard', '访问风险预警页面'),
('dashboard:acceptance', '访问验收追踪看板', 'dashboard', '访问验收追踪看板'),
('dashboard:highlight', '访问亮点工程看板', 'dashboard', '访问亮点工程看板'),
('dashboard:pm_personal', '访问项目经理个人看板', 'dashboard', '访问项目经理个人看板'),
('dashboard:pm_own', '访问自己的个人看板', 'dashboard', '访问自己的项目经理个人看板'),
('dashboard:full', '访问全量项目看板', 'dashboard', '访问全量项目看板（PMO）'),
('dashboard:pm_profile', '访问项目经理档案', 'dashboard', '访问项目经理档案页面'),
('dashboard:project_result', '访问项目成果看板', 'dashboard', '访问项目成果看板'),
('dashboard:report', '访问智能报告', 'dashboard', '访问智能报告页面'),

-- 报告模块权限
('report:generate', '生成报告', 'report', '生成项目报告'),
('report:view', '查看报告', 'report', '查看生成的报告'),

-- 系统模块权限
('system:config', '系统配置', 'system', '访问系统配置页面'),
('system:user_view', '查看用户列表', 'system', '查看系统用户列表'),
('system:user_manage', '用户管理', 'system', '创建、编辑、删除用户'),
('system:user_reset_password', '重置密码', 'system', '重置用户密码'),
('system:role_view', '查看角色列表', 'system', '查看系统角色列表'),
('system:role_manage', '角色管理', 'system', '配置角色权限'),
('system:ip_manage', 'IP白名单管理', 'system', '管理管理员IP白名单');

-- =====================================================
-- 配置角色默认权限
-- =====================================================

-- 超级管理员：拥有全部权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- 经营管理层：查看权限 + 经营看板 + 区域看板
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'executive'
AND p.code IN (
    'project:view', 'project:view_all',
    'dashboard:business', 'dashboard:regional',
    'dashboard:highlight', 'dashboard:pm_profile',
    'report:view'
);

-- PMO管理办：全量编辑 + 全量看板 + 报告生成
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'pmo'
AND p.code IN (
    'project:view', 'project:view_all',
    'project:create', 'project:edit', 'project:edit_all',
    'project:delete', 'project:delete_all',
    'dashboard:business', 'dashboard:regional',
    'dashboard:pmo', 'dashboard:pmo_progress', 'dashboard:pmo_cost',
    'dashboard:pmo_change', 'dashboard:pmo_risk',
    'dashboard:acceptance', 'dashboard:highlight',
    'dashboard:full', 'dashboard:pm_profile', 'dashboard:project_result',
    'dashboard:report',
    'report:generate', 'report:view'
);

-- 区域总监：区域数据 + 区域看板
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'regional_director'
AND p.code IN (
    'project:view', 'project:view_region',
    'project:edit', 'project:edit_region',
    'dashboard:regional_own',
    'dashboard:pmo_progress', 'dashboard:pmo_cost', 'dashboard:pmo_risk',
    'dashboard:acceptance', 'dashboard:highlight',
    'report:view'
);

-- 项目经理：自己的项目 + 个人看板
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'pm'
AND p.code IN (
    'project:view', 'project:view_own',
    'project:edit', 'project:edit_own',
    'dashboard:pm_own',
    'dashboard:pmo_progress',
    'report:view'
);

-- =====================================================
-- 为现有 admin 用户分配 admin 角色
-- =====================================================
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.role = 'admin' AND r.name = 'admin';

-- =====================================================
-- 创建索引
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
CREATE INDEX IF NOT EXISTS idx_users_linked_pm ON users(linked_pm_name);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =====================================================
-- 更新现有用户表的 role 字段说明
-- 保留原有的 role 字段用于兼容，但实际权限通过 user_roles 表管理
-- =====================================================

-- 打印迁移完成信息（通过 SELECT 实现）
SELECT 'RBAC 系统迁移完成：创建了 ' || COUNT(*) || ' 个角色' FROM roles;
SELECT '创建了 ' || COUNT(*) || ' 个权限定义' FROM permissions;