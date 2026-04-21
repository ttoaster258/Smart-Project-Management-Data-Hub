/**
 * roles.js - 角色管理路由
 * 提供角色列表、权限配置等 API
 */

import express from 'express';
import PermissionService from '../services/PermissionService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取所有角色列表
 * GET /api/roles
 */
router.get('/', authenticate, (req, res) => {
  try {
    const roles = PermissionService.getAllRoles();

    // 为每个角色添加权限数量
    const rolesWithCount = roles.map(role => {
      const permissions = PermissionService.getRolePermissions(role.id);
      return {
        ...role,
        permissionCount: permissions.length
      };
    });

    res.json({
      success: true,
      data: rolesWithCount
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: '获取角色列表失败'
    });
  }
});

/**
 * 获取指定角色的权限列表
 * GET /api/roles/:id/permissions
 */
router.get('/:id/permissions', authenticate, (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: '角色ID无效'
      });
    }

    const permissions = PermissionService.getRolePermissions(roleId);

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      error: '获取角色权限失败'
    });
  }
});

/**
 * 更新角色权限（仅管理员）
 * PUT /api/roles/:id/permissions
 */
router.put('/:id/permissions', authenticate, requireAdmin, (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { permissions } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: '角色ID无效'
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: '权限列表格式无效'
      });
    }

    // 检查角色是否为系统角色（admin不能修改）
    const role = PermissionService.getAllRoles().find(r => r.id === roleId);
    if (role?.is_system && role?.name === 'admin') {
      return res.status(403).json({
        success: false,
        error: '超级管理员角色权限不可修改'
      });
    }

    const success = PermissionService.updateRolePermissions(roleId, permissions);

    if (success) {
      res.json({
        success: true,
        message: '角色权限更新成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '角色权限更新失败'
      });
    }
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({
      success: false,
      error: '角色权限更新失败'
    });
  }
});

/**
 * 获取所有权限列表
 * GET /api/permissions
 */
router.get('/permissions', authenticate, (req, res) => {
  try {
    const { module } = req.query;
    const permissions = PermissionService.getAllPermissions(module || null);

    // 按模块分组
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: permissions,
      grouped: groupedPermissions
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: '获取权限列表失败'
    });
  }
});

export default router;