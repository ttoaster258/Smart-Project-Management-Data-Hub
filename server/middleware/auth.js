/**
 * auth.js - 认证中间件
 * 提供认证检查、权限检查等功能
 */

import database from '../db.js';
import PermissionService from '../services/PermissionService.js';

/**
 * 从请求中获取 token
 */
export function getTokenFromRequest(req) {
  // 1. 从 Authorization header 获取
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从查询参数获取
  if (req.query.token) {
    return req.query.token;
  }

  // 3. 从 cookie 获取（如果需要可以添加 cookie 解析）
  if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return value;
      }
    }
  }

  return null;
}

/**
 * 验证 token 并获取用户信息
 */
export function verifyTokenAndGetUser(token) {
  if (!token) {
    return null;
  }

  // 查询会话和用户信息
  const session = database.prepare(`
    SELECT s.*, u.username, u.name, u.role, u.region, u.linked_pm_name, u.status
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
    AND s.expires_at > datetime('now')
  `).get([token]);

  if (!session) {
    return null;
  }

  // 检查用户状态
  if (session.status === 'inactive') {
    return null;
  }

  return session;
}

/**
 * 认证中间件
 * 检查用户是否已登录
 */
export function authenticate(req, res, next) {
  const token = getTokenFromRequest(req);
  const user = verifyTokenAndGetUser(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: '未授权，请先登录'
    });
  }

  // 将用户信息附加到请求对象
  req.user = {
    id: user.user_id,
    username: user.username,
    name: user.name,
    role: user.role,
    region: user.region,
    linkedPmName: user.linked_pm_name
  };

  // 更新最后登录时间
  PermissionService.updateLastLogin(user.user_id);

  next();
}

/**
 * 可选认证中间件
 * 如果有 token 则验证，没有则继续
 */
export function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  const user = verifyTokenAndGetUser(token);

  if (user) {
    req.user = {
      id: user.user_id,
      username: user.username,
      name: user.name,
      role: user.role,
      region: user.region,
      linkedPmName: user.linked_pm_name
    };
  }

  next();
}

/**
 * 管理员权限中间件
 * 检查用户是否为管理员
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '未授权，请先登录'
    });
  }

  if (!PermissionService.isAdmin(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }

  next();
}

/**
 * 权限检查中间件
 * 检查用户是否拥有指定权限
 * @param {string} permissionCode - 权限代码
 */
export function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未授权，请先登录'
      });
    }

    // 管理员拥有全部权限
    if (PermissionService.isAdmin(req.user.id)) {
      return next();
    }

    if (!PermissionService.hasPermission(req.user.id, permissionCode)) {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }

    next();
  };
}

/**
 * 角色检查中间件
 * 检查用户是否拥有指定角色
 * @param {string} roleName - 角色名称
 */
export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未授权，请先登录'
      });
    }

    if (!PermissionService.hasRole(req.user.id, roleName)) {
      return res.status(403).json({
        success: false,
        error: '需要指定角色权限'
      });
    }

    next();
  };
}

/**
 * 数据范围中间件
 * 将用户的数据范围附加到请求对象
 */
export function attachDataScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '未授权，请先登录'
    });
  }

  req.dataScope = PermissionService.getUserDataScope(req.user.id);
  next();
}

/**
 * 旧版中间件别名（用于向后兼容）
 */
export const authMiddleware = authenticate;
export const adminOnlyMiddleware = [authenticate, requireAdmin];

export default {
  authenticate,
  optionalAuth,
  requireAdmin,
  requirePermission,
  requireRole,
  attachDataScope,
  getTokenFromRequest,
  verifyTokenAndGetUser,
  authMiddleware,
  adminOnlyMiddleware
};