import express from 'express';
import projectResultService from '../services/ProjectResultService.js';
import { optionalAuth, authenticate, requireAdmin, requirePermission, attachDataScope } from '../middleware/auth.js';
import { hasRole } from '../services/PermissionService.js';

const router = express.Router();

/**
 * 获取项目成果列表
 * GET /api/project-results
 * Query: region (可选)
 */
router.get('/', optionalAuth, attachDataScope, (req, res) => {
  try {
    const { region } = req.query;
    let results = projectResultService.getAllProjectResults(region || null);

    // 应用数据范围过滤
    if (req.dataScope && req.dataScope.scope !== 'all') {
      if (req.dataScope.scope === 'region' && req.dataScope.region) {
        results = results.filter(r => {
          const projectRegion = r.region || '';
          return projectRegion.includes(req.dataScope.region) || req.dataScope.region.includes(projectRegion);
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('获取项目成果列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个项目成果详情
 * GET /api/project-results/:projectId
 */
router.get('/:projectId', optionalAuth, (req, res) => {
  try {
    const result = projectResultService.getProjectResultByProjectId(req.params.projectId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '项目成果不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取项目成果详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建或更新项目成果
 * POST /api/project-results/:projectId
 */
router.post('/:projectId', authenticate, requireAdmin, (req, res) => {
  try {
    const result = projectResultService.upsertProjectResult(req.params.projectId, req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('保存项目成果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新项目成果
 * PUT /api/project-results/:projectId
 */
router.put('/:projectId', authenticate, requireAdmin, (req, res) => {
  try {
    const result = projectResultService.upsertProjectResult(req.params.projectId, req.body);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '项目成果不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('更新项目成果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除项目成果
 * DELETE /api/project-results/:projectId
 */
router.delete('/:projectId', authenticate, requireAdmin, (req, res) => {
  try {
    const success = projectResultService.deleteProjectResult(req.params.projectId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '项目成果不存在'
      });
    }

    res.json({
      success: true,
      message: '项目成果已删除'
    });
  } catch (error) {
    console.error('删除项目成果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 初始化项目成果
 * POST /api/project-results/:projectId/initialize
 */
router.post('/:projectId/initialize', authenticate, requireAdmin, (req, res) => {
  try {
    const result = projectResultService.initializeProjectResult(req.params.projectId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('初始化项目成果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 区域总监提交评分
 * PUT /api/project-results/:projectId/director-score
 *
 * 权限规则：
 * - 区域总监：只能更新区域总监评分字段 + 推荐理由
 * - PMO：只能更新 PMO 评分字段 + 评议结论（仅限已推荐项目）
 * - 管理员：可以更新所有字段
 */
router.put('/:projectId/director-score', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const isRegionalDirector = hasRole(userId, 'regional_director');
    const isPmo = hasRole(userId, 'pmo');
    const isAdmin = hasRole(userId, 'admin');

    if (!isRegionalDirector && !isPmo && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '只有区域总监、PMO或管理员才能提交评分'
      });
    }

    // 区域总监评分字段（PMO不可修改）
    const directorScoreFields = [
      // 实施团队总监硬性评分
      'implHardSatisfaction', 'implHardSubmitQuality', 'implHardRequirement', 'implHardRisk',
      // 售前团队总监硬性评分
      'preSalesHardRequirement', 'preSalesHardSolution', 'preSalesHardRisk',
      // 是否推荐（区域总监决定）
      'implIsRecommended', 'preSalesIsRecommended',
      // 推荐理由（区域总监填写）
      'implSoftTechReason', 'implSoftTeamReason', 'implSoftResultReason',
      'preSalesSoftTechReason', 'preSalesSoftDirectionReason', 'preSalesSoftPromotionReason',
    ];

    // PMO评分字段
    const pmoScoreFields = [
      // PMO硬性评分
      'implPmoHardDelay', 'implPmoHardNode', 'implPmoHardMaterial', 'implPmoHardDigital', 'implPmoHardCost',
      'preSalesPmoHardActivity', 'preSalesPmoHardDigital', 'preSalesPmoHardInput',
      // 软性评分得分
      'implSoftTechScore', 'implSoftTeamScore', 'implSoftResultScore',
      'preSalesSoftTechScore', 'preSalesSoftDirectionScore', 'preSalesSoftPromotionScore'
    ];

    // 评议结论字段（PMO仅对推荐项目可修改）
    const pmoConclusionFields = [
      'implSoftTechPmoConclusion', 'implSoftTeamPmoConclusion', 'implSoftResultPmoConclusion',
      'preSalesSoftTechPmoConclusion', 'preSalesSoftDirectionPmoConclusion', 'preSalesSoftPromotionPmoConclusion'
    ];

    // 根据角色确定允许更新的字段
    let allowedFields = [];

    if (isAdmin) {
      // 管理员可以更新所有字段
      allowedFields = [...directorScoreFields, ...pmoScoreFields, ...pmoConclusionFields];
    } else if (isRegionalDirector) {
      // 区域总监只能更新区域总监评分字段
      allowedFields = [...directorScoreFields];
    } else if (isPmo) {
      // PMO只能更新 PMO评分字段
      allowedFields = [...pmoScoreFields];

      // PMO可以更新评议结论，但需要检查项目是否被推荐
      const existingResult = projectResultService.getProjectResultByProjectId(req.params.projectId);
      if (existingResult) {
        // 如果实施或售前团队被推荐，允许更新对应的评议结论
        if (existingResult.implIsRecommended) {
          allowedFields.push('implSoftTechPmoConclusion', 'implSoftTeamPmoConclusion', 'implSoftResultPmoConclusion');
        }
        if (existingResult.preSalesIsRecommended) {
          allowedFields.push('preSalesSoftTechPmoConclusion', 'preSalesSoftDirectionPmoConclusion', 'preSalesSoftPromotionPmoConclusion');
        }
      }
    }

    // 过滤请求体中的字段
    const filteredData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    }

    // 添加svnAddress, modelResults, softwareResults, documentStatus（如果有）
    if (req.body.svnAddress !== undefined) filteredData.svnAddress = req.body.svnAddress;
    if (req.body.modelResults !== undefined) filteredData.modelResults = req.body.modelResults;
    if (req.body.softwareResults !== undefined) filteredData.softwareResults = req.body.softwareResults;
    if (req.body.documentStatus !== undefined) filteredData.documentStatus = req.body.documentStatus;

    const result = projectResultService.upsertProjectResult(req.params.projectId, filteredData);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '项目成果不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('区域总监评分失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;