import express from 'express';
import database from '../db.js';
import { hashPassword, verifyPassword, generateToken, getSessionExpiry } from '../utils/auth.js';
import { getUserRoles, getUserPermissions, getUserDataScope } from '../services/PermissionService.js';

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('=== 登录调试 ===');
    console.log('接收到的数据:', { username, password: password ? '***' : '(empty)' });

    if (!username || !password) {
      console.log('用户名或密码为空');
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    // 查找用户（不区分大小写）
    const user = database.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get([username]);

    console.log('查询用户结果:', user ? { id: user.id, username: user.username, password_length: user.password?.length } : '未找到');

    if (!user) {
      console.log('用户不存在');
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 验证密码
    const passwordValid = verifyPassword(password, user.password);
    console.log('密码验证结果:', passwordValid);

    if (!passwordValid) {
      console.log('密码验证失败');
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    console.log('登录成功，创建会话...');

    // 创建会话
    const token = generateToken();
    const expiresAt = getSessionExpiry();

    database.run(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [user.id, token, expiresAt]);

    database.save();

    console.log('会话创建成功，token:', token.substring(0, 10) + '...');

    // 获取用户角色和权限
    const roles = getUserRoles(user.id);
    const permissions = getUserPermissions(user.id);
    const dataScope = getUserDataScope(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      roles,
      permissions,
      dataScope
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '登录失败'
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (token) {
      database.prepare('DELETE FROM sessions WHERE token = ?').run([token]);
      database.save();
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || '登出失败'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', (req, res) => {
  try {
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const session = database.prepare(`
      SELECT u.id, u.username, u.name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
      AND s.expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    res.json({
      success: true,
      user: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || '获取用户信息失败'
    });
  }
});

/**
 * 修改密码
 * PUT /api/auth/change-password
 */
router.put('/change-password', (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const token = req.headers['authorization']?.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '旧密码和新密码不能为空'
      });
    }

    // 获取用户信息
    const session = database.prepare(`
      SELECT u.id, u.password
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
      AND s.expires_at > datetime('now')
    `).get([token]);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: '会话已过期，请重新登录'
      });
    }

    // 验证旧密码
    if (!verifyPassword(oldPassword, session.password)) {
      return res.status(401).json({
        success: false,
        error: '旧密码错误'
      });
    }

    // 更新密码
    const hashedNewPassword = hashPassword(newPassword);
    database.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?')
      .run([hashedNewPassword, session.id]);

    database.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || '修改密码失败'
    });
  }
});

export default router;