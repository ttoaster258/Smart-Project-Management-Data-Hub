/**
 * PermissionService.js - 权限管理服务
 * 提供用户权限检查、角色管理、数据范围等功能
 */

import database from '../db.js';

/**
 * 获取用户的所有角色
 * @param {number} userId - 用户ID
 * @returns {Array} 角色列表
 */
export function getUserRoles(userId) {
  if (!userId) return [];

  const roles = database.all(`
    SELECT r.id, r.name, r.display_name, r.description, r.is_system
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.id
  `, [userId]);

  return roles || [];
}

/**
 * 获取用户的所有权限代码
 * @param {number} userId - 用户ID
 * @returns {Array} 权限代码列表
 */
export function getUserPermissions(userId) {
  if (!userId) return [];

  // 通过用户的角色获取权限
  const permissions = database.all(`
    SELECT DISTINCT p.code, p.name, p.module
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY p.module, p.code
  `, [userId]);

  return permissions || [];
}

/**
 * 检查用户是否拥有指定权限
 * @param {number} userId - 用户ID
 * @param {string} permissionCode - 权限代码
 * @returns {boolean}
 */
export function hasPermission(userId, permissionCode) {
  if (!userId || !permissionCode) return false;

  const result = database.get(`
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ? AND p.code = ?
    LIMIT 1
  `, [userId, permissionCode]);

  return !!result;
}

/**
 * 检查用户是否拥有指定角色
 * @param {number} userId - 用户ID
 * @param {string} roleName - 角色名称
 * @returns {boolean}
 */
export function hasRole(userId, roleName) {
  if (!userId || !roleName) return false;

  const result = database.get(`
    SELECT 1
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ? AND r.name = ?
    LIMIT 1
  `, [userId, roleName]);

  return !!result;
}

/**
 * 检查用户是否为管理员
 * @param {number} userId - 用户ID
 * @returns {boolean}
 */
export function isAdmin(userId) {
  return hasRole(userId, 'admin');
}

/**
 * 获取用户的数据范围
 * @param {number} userId - 用户ID
 * @returns {Object} { scope: 'all'|'region'|'own', region: string|null, pmNames: string[] }
 */
export function getUserDataScope(userId) {
  if (!userId) return { scope: 'none', region: null, pmNames: [] };

  const roles = getUserRoles(userId);
  const user = database.get('SELECT region, linked_pm_name, name, username FROM users WHERE id = ?', [userId]);

  // 超级管理员和PMO：全量数据
  if (roles.some(r => r.name === 'admin' || r.name === 'pmo')) {
    return { scope: 'all', region: null, pmNames: [] };
  }

  // 经营管理层：全量数据（只读）
  if (roles.some(r => r.name === 'executive')) {
    return { scope: 'all', region: null, pmNames: [], readOnly: true };
  }

  // 区域总监：仅所属区域
  if (roles.some(r => r.name === 'regional_director')) {
    return {
      scope: 'region',
      region: user?.region || null,
      pmNames: []
    };
  }

  // 项目经理：仅自己负责的项目
  if (roles.some(r => r.name === 'pm')) {
    // linked_pm_name 可能有多个项目经理名称（逗号分隔）
    const pmNames = user?.linked_pm_name
      ? user.linked_pm_name.split(',').map(n => n.trim()).filter(n => n)
      : [user?.name || user?.username];

    return {
      scope: 'own',
      region: null,
      pmNames: pmNames
    };
  }

  return { scope: 'none', region: null, pmNames: [] };
}

/**
 * 获取所有角色列表
 * @returns {Array}
 */
export function getAllRoles() {
  return database.all(`
    SELECT id, name, display_name, description, is_system, created_at
    FROM roles
    ORDER BY id
  `);
}

/**
 * 获取角色的权限列表
 * @param {number} roleId - 角色ID
 * @returns {Array}
 */
export function getRolePermissions(roleId) {
  if (!roleId) return [];

  return database.all(`
    SELECT p.id, p.code, p.name, p.module, p.description
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.module, p.code
  `, [roleId]);
}

/**
 * 更新角色权限
 * @param {number} roleId - 角色ID
 * @param {Array} permissionCodes - 权限代码列表
 * @returns {boolean}
 */
export function updateRolePermissions(roleId, permissionCodes) {
  if (!roleId || !Array.isArray(permissionCodes)) return false;

  try {
    database.transaction(() => {
      // 删除现有权限
      database.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      // 插入新权限
      permissionCodes.forEach(code => {
        const perm = database.get('SELECT id FROM permissions WHERE code = ?', [code]);
        if (perm) {
          database.run(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (?, ?)
          `, [roleId, perm.id]);
        }
      });
    });

    database.save();
    return true;
  } catch (error) {
    console.error('Update role permissions error:', error);
    return false;
  }
}

/**
 * 获取所有权限列表
 * @param {string} module - 模块过滤（可选）
 * @returns {Array}
 */
export function getAllPermissions(module = null) {
  let sql = `
    SELECT id, code, name, module, description, created_at
    FROM permissions
    ORDER BY module, code
  `;

  if (module) {
    sql = `
      SELECT id, code, name, module, description, created_at
      FROM permissions
      WHERE module = ?
      ORDER BY code
    `;
    return database.all(sql, [module]);
  }

  return database.all(sql);
}

/**
 * 获取所有用户列表（含角色信息）
 * @returns {Array}
 */
export function getAllUsers() {
  return database.all(`
    SELECT u.id, u.username, u.name, u.role, u.region, u.linked_pm_name, u.status, u.created_at, u.last_login_at,
      GROUP_CONCAT(r.display_name, ', ') as roles_display
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id
    ORDER BY u.id
  `);
}

/**
 * 创建用户
 * @param {Object} userData - 用户数据
 * @returns {Object|null}
 */
export function createUser(userData) {
  const { username, password, name, region, linked_pm_name, status } = userData;

  if (!username || !password) return null;

  try {
    const hashedPassword = hashPassword(password);
    const result = database.run(`
      INSERT INTO users (username, password, name, region, linked_pm_name, status, role)
      VALUES (?, ?, ?, ?, ?, ?, 'user')
    `, [username, hashedPassword, name || username, region || null, linked_pm_name || null, status || 'active']);

    database.save();
    return { id: database.getLastInsertId(), username, name };
  } catch (error) {
    console.error('Create user error:', error);
    return null;
  }
}

/**
 * 更新用户信息
 * @param {number} userId - 用户ID
 * @param {Object} userData - 更新数据
 * @returns {boolean}
 */
export function updateUser(userId, userData) {
  if (!userId) return false;

  const { name, region, linked_pm_name, status } = userData;

  try {
    database.run(`
      UPDATE users
      SET name = ?, region = ?, linked_pm_name = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [name, region || null, linked_pm_name || null, status || 'active', userId]);

    database.save();
    return true;
  } catch (error) {
    console.error('Update user error:', error);
    return false;
  }
}

/**
 * 更新用户角色
 * @param {number} userId - 用户ID
 * @param {Array} roleNames - 角色名称列表
 * @returns {boolean}
 */
export function updateUserRoles(userId, roleNames) {
  if (!userId || !Array.isArray(roleNames)) return false;

  try {
    database.transaction(() => {
      // 删除现有角色
      database.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);

      // 插入新角色
      roleNames.forEach(name => {
        const role = database.get('SELECT id FROM roles WHERE name = ?', [name]);
        if (role) {
          database.run(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES (?, ?)
          `, [userId, role.id]);
        }
      });
    });

    database.save();
    return true;
  } catch (error) {
    console.error('Update user roles error:', error);
    return false;
  }
}

/**
 * 重置用户密码
 * @param {number} userId - 用户ID
 * @param {string} newPassword - 新密码
 * @returns {boolean}
 */
export function resetUserPassword(userId, newPassword) {
  if (!userId || !newPassword) return false;

  try {
    const hashedPassword = hashPassword(newPassword);
    database.run(`
      UPDATE users
      SET password = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [hashedPassword, userId]);

    database.save();
    return true;
  } catch (error) {
    console.error('Reset password error:', error);
    return false;
  }
}

/**
 * 删除用户
 * @param {number} userId - 用户ID
 * @returns {boolean}
 */
export function deleteUser(userId) {
  if (!userId) return false;

  try {
    // 先删除用户角色关联
    database.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    // 删除用户会话
    database.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
    // 删除用户
    database.run('DELETE FROM users WHERE id = ?', [userId]);

    database.save();
    return true;
  } catch (error) {
    console.error('Delete user error:', error);
    return false;
  }
}

/**
 * 更新用户最后登录时间
 * @param {number} userId - 用户ID
 */
export function updateLastLogin(userId) {
  if (!userId) return;

  try {
    database.run(`
      UPDATE users SET last_login_at = datetime('now') WHERE id = ?
    `, [userId]);
    database.save();
  } catch (error) {
    console.error('Update last login error:', error);
  }
}

/**
 * 获取用户完整信息（含角色和权限）
 * @param {number} userId - 用户ID
 * @returns {Object|null}
 */
export function getUserFullInfo(userId) {
  if (!userId) return null;

  const user = database.get('SELECT id, username, name, region, linked_pm_name, status FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const roles = getUserRoles(userId);
  const permissions = getUserPermissions(userId);
  const dataScope = getUserDataScope(userId);

  return {
    ...user,
    roles,
    permissions: permissions.map(p => p.code),
    dataScope
  };
}

// 导入密码哈希函数
import { hashPassword } from '../utils/auth.js';

export default {
  getUserRoles,
  getUserPermissions,
  hasPermission,
  hasRole,
  isAdmin,
  getUserDataScope,
  getAllRoles,
  getRolePermissions,
  updateRolePermissions,
  getAllPermissions,
  getAllUsers,
  createUser,
  updateUser,
  updateUserRoles,
  resetUserPassword,
  deleteUser,
  updateLastLogin,
  getUserFullInfo
};