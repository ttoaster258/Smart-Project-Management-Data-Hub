/**
 * users.js - 用户管理路由
 * 提供用户 CRUD、角色分配等 API
 */

import express from 'express';
import PermissionService from '../services/PermissionService.js';
import { authenticate, requireAdmin, requirePermission } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';

const router = express.Router();

/**
 * 获取所有用户列表（仅管理员）
 * GET /api/users
 */
router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const users = PermissionService.getAllUsers();

    // 为每个用户添加角色详情
    const usersWithRoles = users.map(user => {
      const roles = PermissionService.getUserRoles(user.id);
      return {
        ...user,
        roles: roles.map(r => r.name)
      };
    });

    res.json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

/**
 * 创建新用户（仅管理员）
 * POST /api/users
 */
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { username, password, name, region, linked_pm_name, roles, status } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    // 检查用户名是否已存在
    const existingUser = PermissionService.getAllUsers().find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: '用户名已存在'
      });
    }

    // 创建用户
    const user = PermissionService.createUser({
      username,
      password,
      name: name || username,
      region: region || null,
      linked_pm_name: linked_pm_name || null,
      status: status || 'active'
    });

    if (!user) {
      return res.status(500).json({
        success: false,
        error: '创建用户失败'
      });
    }

    // 分配角色
    if (roles && Array.isArray(roles) && roles.length > 0) {
      PermissionService.updateUserRoles(user.id, roles);
    }

    res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

/**
 * 获取用户详情
 * GET /api/users/:id
 */
router.get('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID无效'
      });
    }

    const user = PermissionService.getUserFullInfo(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

/**
 * 更新用户信息（仅管理员）
 * PUT /api/users/:id
 */
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, region, linked_pm_name, status } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID无效'
      });
    }

    const success = PermissionService.updateUser(userId, {
      name,
      region,
      linked_pm_name,
      status
    });

    if (success) {
      res.json({
        success: true,
        message: '用户信息更新成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '用户信息更新失败'
      });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: '用户信息更新失败'
    });
  }
});

/**
 * 更新用户角色（仅管理员）
 * PUT /api/users/:id/roles
 */
router.put('/:id/roles', authenticate, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { roles } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID无效'
      });
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        error: '角色列表格式无效'
      });
    }

    // 检查是否为最后一个管理员
    const currentRoles = PermissionService.getUserRoles(userId);
    const isCurrentAdmin = currentRoles.some(r => r.name === 'admin');
    const willRemoveAdmin = isCurrentAdmin && !roles.includes('admin');

    if (willRemoveAdmin) {
      // 检查是否还有其他管理员
      const allUsers = PermissionService.getAllUsers();
      const otherAdmins = allUsers.filter(u => u.id !== userId && u.roles_display?.includes('超级管理员'));
      if (otherAdmins.length === 0) {
        return res.status(403).json({
          success: false,
          error: '不能移除最后一个超级管理员角色'
        });
      }
    }

    const success = PermissionService.updateUserRoles(userId, roles);

    if (success) {
      res.json({
        success: true,
        message: '用户角色更新成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '用户角色更新失败'
      });
    }
  } catch (error) {
    console.error('Update user roles error:', error);
    res.status(500).json({
      success: false,
      error: '用户角色更新失败'
    });
  }
});

/**
 * 重置用户密码（仅管理员）
 * PUT /api/users/:id/password
 */
router.put('/:id/password', authenticate, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID无效'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '密码长度至少6位'
      });
    }

    const success = PermissionService.resetUserPassword(userId, newPassword);

    if (success) {
      res.json({
        success: true,
        message: '密码重置成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '密码重置失败'
      });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: '密码重置失败'
    });
  }
});

/**
 * 删除用户（仅管理员）
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID无效'
      });
    }

    // 不能删除自己
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        error: '不能删除自己的账户'
      });
    }

    // 检查是否为最后一个管理员
    const userRoles = PermissionService.getUserRoles(userId);
    const isAdmin = userRoles.some(r => r.name === 'admin');

    if (isAdmin) {
      const allUsers = PermissionService.getAllUsers();
      const otherAdmins = allUsers.filter(u => u.id !== userId && u.roles_display?.includes('超级管理员'));
      if (otherAdmins.length === 0) {
        return res.status(403).json({
          success: false,
          error: '不能删除最后一个超级管理员'
        });
      }
    }

    const success = PermissionService.deleteUser(userId);

    if (success) {
      res.json({
        success: true,
        message: '用户删除成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '用户删除失败'
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: '用户删除失败'
    });
  }
});

/**
 * 获取当前用户的权限信息
 * GET /api/users/me/permissions
 */
router.get('/me/permissions', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    const userFullInfo = PermissionService.getUserFullInfo(userId);

    res.json({
      success: true,
      data: userFullInfo
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({
      success: false,
      error: '获取权限信息失败'
    });
  }
});

export default router;