/**
 * 智能报告生成 API 路由
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import generateReport from '../services/report/ReportGenerator.js';
import { executeTool } from '../services/report/ToolExecutor.js';
import db from '../db.js';

const router = express.Router();

/**
 * POST /api/reports/generate
 * 生成报告
 *
 * Request Body:
 * {
 *   reportType: 'weekly' | 'monthly',
 *   scope: 'global' | 'region' | 'personal',
 *   startDate: 'YYYY-MM-DD',
 *   endDate: 'YYYY-MM-DD',
 *   region: '东区' 等（仅 scope=region 时需要）,
 *   projectManager: '张三' 等（仅 scope=personal 时需要）,
 *   exportFormat: 'markdown' | 'docx' | 'pdf'
 * }
 */
router.post('/generate', authenticate, async (req, res) => {

  try {
    const {
      reportType,
      scope,
      startDate,
      endDate,
      region,
      projectManager,
      exportFormat = 'markdown'
    } = req.body;

    console.log('[Reports API] 收到生成请求：', req.body);

    // 参数校验
    if (!reportType || !['weekly', 'monthly'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: 'reportType 参数错误，必须是 weekly 或 monthly'
      });
    }

    if (!scope || !['global', 'region', 'personal'].includes(scope)) {
      return res.status(400).json({
        success: false,
        error: 'scope 参数错误，必须是 global、region 或 personal'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '缺少 startDate 或 endDate 参数'
      });
    }

    if (scope === 'region' && !region) {
      return res.status(400).json({
        success: false,
        error: '区域报告需要指定 region 参数'
      });
    }

    if (scope === 'personal' && !projectManager) {
      return res.status(400).json({
        success: false,
        error: '个人报告需要指定 projectManager 参数'
      });
    }

    // 权限检查（超级管理员）
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '权限不足，只有管理员可以使用智能报告功能'
      });
    }

    // 生成报告
    const result = await generateReport({
      reportType,
      scope,
      startDate,
      endDate,
      region,
      projectManager,
      exportFormat
    });

    console.log('[Reports API] 报告生成成功');

    // 根据导出格式返回
    if (exportFormat === 'markdown') {
      // 返回JSON数据供前端预览
      const toolCallsSummary = result.toolCallsLog.map(log => ({
        tool: log.tool,
        round: log.round
      }));

      res.json({
        success: true,
        data: {
          markdown: result.markdown,
          content: result.content,
          format: 'markdown',
          toolCallsLog: toolCallsSummary,
          roundCount: result.roundCount,
          generatedAt: result.generatedAt
        }
      });
    } else if (exportFormat === 'docx') {
      // 返回 Word 文件
      const filename = `report_${Date.now()}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result.content);
    }

  } catch (error) {
    console.error('[Reports API] 生成失败：', error);
    res.status(500).json({
      success: false,
      error: error.message || '报告生成失败'
    });
  }
});

/**
 * GET /api/reports/regions
 * 获取区域列表（用于前端选择）
 */
router.get('/regions', authenticate, async (req, res) => {

  try {
    const results = db.prepare(`
      SELECT DISTINCT region
      FROM projects
      WHERE region IS NOT NULL AND region != ''
      ORDER BY region
    `).all();

    res.json({
      success: true,
      data: results.map(r => r.region)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/project-managers
 * 获取项目经理列表（用于前端选择）
 */
router.get('/project-managers', authenticate, async (req, res) => {

  try {
    const results = db.prepare(`
      SELECT DISTINCT project_manager as name
      FROM projects
      WHERE project_manager IS NOT NULL
        AND project_manager != ''
        AND project_manager != '-'
      ORDER BY project_manager
    `).all();

    res.json({
      success: true,
      data: results.map(r => r.name)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/config
 * 获取 AI 配置状态（检查 API Key 是否配置）
 */
router.get('/config', authenticate, async (req, res) => {

  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const configPath = path.join(__dirname, '../../APIKEY');

    let hasApiKey = false;

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const apiKeyMatch = configContent.match(/ANTHROPIC_API_KEY=(.+)/);
      if (apiKeyMatch && apiKeyMatch[1].trim() && apiKeyMatch[1].trim() !== 'your_api_key_here') {
        hasApiKey = true;
      }
    }

    res.json({
      success: true,
      data: {
        configured: hasApiKey,
        model: 'glm-5',
        baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/test-tools
 * 测试工具返回的真实数据（调试用）
 */
router.get('/test-tools', authenticate, async (req, res) => {

  try {
    // 测试各种工具
    const projectStats = await executeTool('get_project_stats', {
      startDate: '2026-04-10',
      endDate: '2026-04-17',
      scope: 'global'
    });

    const regionPerformance = await executeTool('get_region_performance', {});

    const industryDistribution = await executeTool('get_industry_distribution', {
      scope: 'global'
    });

    const milestoneStatus = await executeTool('get_milestone_status', {
      scope: 'global'
    });

    const keyProjects = await executeTool('get_key_projects', {
      scope: 'global',
      limit: 5
    });

    res.json({
      success: true,
      data: {
        projectStats,
        regionPerformance,
        industryDistribution,
        milestoneStatus,
        keyProjects
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;