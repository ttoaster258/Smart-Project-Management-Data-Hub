import express from 'express';
import projectService from '../services/ProjectService.js';
import { adminOnlyMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 获取管理员 IP 列表
 * GET /api/admin/ips
 */
router.get('/ips', adminOnlyMiddleware, (req, res) => {
  try {
    const ips = projectService.getAdminIps();
    res.json({
      success: true,
      data: ips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 添加管理员 IP
 * POST /api/admin/ips
 */
router.post('/ips', adminOnlyMiddleware, (req, res) => {
  try {
    const { ipAddress, description } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP 地址不能为空'
      });
    }

    const success = projectService.addAdminIp(ipAddress, description);

    if (!success) {
      return res.status(409).json({
        success: false,
        error: 'IP 地址已存在'
      });
    }

    res.status(201).json({
      success: true,
      message: '管理员 IP 添加成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除管理员 IP
 * DELETE /api/admin/ips/:id
 */
router.delete('/ips/:id', adminOnlyMiddleware, (req, res) => {
  try {
    projectService.removeAdminIp(req.params.id);
    res.json({
      success: true,
      message: '管理员 IP 删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 检查当前 IP 是否为管理员
 * GET /api/admin/check
 */
router.get('/check', (req, res) => {
  try {
    const isAdmin = projectService.isAdminIp(req.ip);
    res.json({
      success: true,
      isAdmin,
      clientIp: req.ip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;