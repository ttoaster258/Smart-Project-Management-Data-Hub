import database from '../db.js';

// 文档类型常量（34种）
export const DOCUMENT_TYPES = [
  '立项论证报告',
  '项目建议书',
  '可研报告',
  '单项论证报告',
  '任务书/技术要求/技术协议/招标要求',
  '技术评估表',
  '报价',
  '初步设计方案/标书',
  '合同',
  '项目立项公告',
  '项目计划和预算',
  '概要设计报告',
  '详细设计报告',
  '测试大纲',
  '模型/软件开发说明',
  '测试报告',
  '用户手册',
  '代码审查记录',
  '模型/软件/硬件系统完善意见',
  '系统安装部署说明书',
  '安装调试记录',
  '应用验证报告',
  '培训材料（计划、通知、签到表等）',
  '培训通知',
  '培训教材',
  '培训记录（含签到表和现场培训照片）',
  '培训考核记录',
  '培训意见反馈表',
  '研制总结报告（WORD和PPT）',
  '验收材料交接单',
  '验收评审结论',
  '用户证明',
  '项目综合评分表',
  '跟踪维护记录',
  '项目总结PPT',
  '源代码',
  '会议纪要（启动会、计划预算、内部方案、内部验收）',
  '任务书要求的其他材料'
];

class ProjectResultService {
  /**
   * 获取所有已验收项目的成果列表
   */
  getAllProjectResults(region = null) {
    // 先获取所有已验收项目
    let sql = `
      SELECT p.* FROM projects p
      WHERE p.status IN ('已验收', 'Accepted')
    `;
    const params = [];

    if (region) {
      sql += ` AND p.region = ?`;
      params.push(region);
    }

    sql += ` ORDER BY p.acceptance_date DESC`;

    const projects = database.prepare(sql).all(params);

    // 为每个项目获取成果数据
    return projects.map(project => this.enrichProjectResult(project));
  }

  /**
   * 获取单个项目的成果详情
   */
  getProjectResultByProjectId(projectId) {
    const project = database.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get([projectId]);

    if (!project) {
      return null;
    }

    return this.enrichProjectResult(project);
  }

  /**
   * 丰富项目成果数据
   */
  enrichProjectResult(project) {
    // 获取成果主表数据
    const result = database.prepare(`
      SELECT * FROM project_results WHERE project_id = ?
    `).get([project.id]);

    // 获取模型成果
    const modelResults = database.prepare(`
      SELECT * FROM model_results WHERE project_result_id = ? ORDER BY id
    `).all([result?.id || 0]);

    // 获取软件成果
    const softwareResults = database.prepare(`
      SELECT * FROM software_results WHERE project_result_id = ? ORDER BY id
    `).all([result?.id || 0]);

    // 获取文档状态
    const documentStatus = database.prepare(`
      SELECT * FROM document_status WHERE project_result_id = ? ORDER BY document_type
    `).all([result?.id || 0]);

    // 计算已提交文档数量
    const submittedDocCount = documentStatus.filter(d => d.is_submitted === 1).length;

    return {
      ...project,
      projectResult: result || null,
      modelResults: modelResults.map(m => ({
        id: m.id,
        modelName: m.model_name,
        problemScenario: m.problem_scenario,
        valueExtraction: m.value_extraction
      })),
      softwareResults: softwareResults.map(s => ({
        id: s.id,
        softwareName: s.software_name,
        problemScenario: s.problem_scenario,
        valueExtraction: s.value_extraction
      })),
      documentStatus: documentStatus.map(d => ({
        id: d.id,
        documentType: d.document_type,
        isSubmitted: d.is_submitted === 1
      })),
      submittedDocCount,
      totalDocCount: DOCUMENT_TYPES.length
    };
  }

  /**
   * 创建或更新项目成果
   */
  upsertProjectResult(projectId, data) {
    const existing = database.prepare(`
      SELECT id FROM project_results WHERE project_id = ?
    `).get([projectId]);

    if (existing) {
      return this.updateProjectResult(projectId, data);
    } else {
      return this.createProjectResult(projectId, data);
    }
  }

  /**
   * 创建项目成果
   */
  createProjectResult(projectId, data) {
    const now = new Date().toISOString();
    const resultId = database.transaction(() => {
      // 插入主表
      database.prepare(`
        INSERT INTO project_results (
          project_id, svn_address,
          impl_is_recommended, impl_hard_satisfaction, impl_hard_submit_quality,
          impl_hard_requirement, impl_hard_risk,
          impl_soft_tech_reason, impl_soft_tech_pmo_conclusion, impl_soft_tech_score,
          impl_soft_team_reason, impl_soft_team_pmo_conclusion, impl_soft_team_score,
          impl_soft_result_reason, impl_soft_result_pmo_conclusion, impl_soft_result_score,
          impl_pmo_hard_delay, impl_pmo_hard_node, impl_pmo_hard_material,
          impl_pmo_hard_digital, impl_pmo_hard_cost, impl_total_score,
          pre_sales_is_recommended, pre_sales_hard_requirement, pre_sales_hard_solution,
          pre_sales_hard_risk,
          pre_sales_soft_tech_reason, pre_sales_soft_tech_pmo_conclusion, pre_sales_soft_tech_score,
          pre_sales_soft_direction_reason, pre_sales_soft_direction_pmo_conclusion, pre_sales_soft_direction_score,
          pre_sales_soft_promotion_reason, pre_sales_soft_promotion_pmo_conclusion, pre_sales_soft_promotion_score,
          pre_sales_pmo_hard_activity, pre_sales_pmo_hard_digital, pre_sales_pmo_hard_input,
          pre_sales_total_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId, data.svnAddress || '',
        data.implIsRecommended ? 1 : 0, data.implHardSatisfaction || 0, data.implHardSubmitQuality || 0,
        data.implHardRequirement || 0, data.implHardRisk || 0,
        data.implSoftTechReason || '', data.implSoftTechPmoConclusion || '', data.implSoftTechScore || 0,
        data.implSoftTeamReason || '', data.implSoftTeamPmoConclusion || '', data.implSoftTeamScore || 0,
        data.implSoftResultReason || '', data.implSoftResultPmoConclusion || '', data.implSoftResultScore || 0,
        data.implPmoHardDelay || 0, data.implPmoHardNode || 0, data.implPmoHardMaterial || 0,
        data.implPmoHardDigital || 0, data.implPmoHardCost || 0, data.implTotalScore || 0,
        data.preSalesIsRecommended ? 1 : 0, data.preSalesHardRequirement || 0, data.preSalesHardSolution || 0,
        data.preSalesHardRisk || 0,
        data.preSalesSoftTechReason || '', data.preSalesSoftTechPmoConclusion || '', data.preSalesSoftTechScore || 0,
        data.preSalesSoftDirectionReason || '', data.preSalesSoftDirectionPmoConclusion || '', data.preSalesSoftDirectionScore || 0,
        data.preSalesSoftPromotionReason || '', data.preSalesSoftPromotionPmoConclusion || '', data.preSalesSoftPromotionScore || 0,
        data.preSalesPmoHardActivity || 0, data.preSalesPmoHardDigital || 0, data.preSalesPmoHardInput || 0,
        data.preSalesTotalScore || 0, now, now
      );

      const id = database.prepare('SELECT last_insert_rowid() as id').get().id;

      // 插入模型成果
      if (data.modelResults && data.modelResults.length > 0) {
        const modelStmt = database.prepare(`
          INSERT INTO model_results (project_result_id, model_name, problem_scenario, value_extraction)
          VALUES (?, ?, ?, ?)
        `);
        data.modelResults.forEach(model => {
          modelStmt.run(id, model.modelName, model.problemScenario || '', model.valueExtraction || '');
        });
      }

      // 插入软件成果
      if (data.softwareResults && data.softwareResults.length > 0) {
        const softwareStmt = database.prepare(`
          INSERT INTO software_results (project_result_id, software_name, problem_scenario, value_extraction)
          VALUES (?, ?, ?, ?)
        `);
        data.softwareResults.forEach(software => {
          softwareStmt.run(id, software.softwareName, software.problemScenario || '', software.valueExtraction || '');
        });
      }

      // 初始化文档状态
      const docStmt = database.prepare(`
        INSERT INTO document_status (project_result_id, document_type, is_submitted)
        VALUES (?, ?, ?)
      `);
      DOCUMENT_TYPES.forEach(docType => {
        const existingDoc = (data.documentStatus || []).find(d => d.documentType === docType);
        docStmt.run(id, docType, existingDoc?.isSubmitted ? 1 : 0);
      });

      return id;
    });

    database.save();

    return this.getProjectResultByProjectId(projectId);
  }

  /**
   * 更新项目成果
   */
  updateProjectResult(projectId, data) {
    const existing = database.prepare(`
      SELECT id FROM project_results WHERE project_id = ?
    `).get([projectId]);

    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const resultId = existing.id;

    database.transaction(() => {
      // 计算评分合计
      const implTotalScore = this.calculateImplTotalScore(data);
      const preSalesTotalScore = this.calculatePreSalesTotalScore(data);

      // 更新主表
      database.prepare(`
        UPDATE project_results SET
          svn_address = ?,
          impl_is_recommended = ?, impl_hard_satisfaction = ?, impl_hard_submit_quality = ?,
          impl_hard_requirement = ?, impl_hard_risk = ?,
          impl_soft_tech_reason = ?, impl_soft_tech_pmo_conclusion = ?, impl_soft_tech_score = ?,
          impl_soft_team_reason = ?, impl_soft_team_pmo_conclusion = ?, impl_soft_team_score = ?,
          impl_soft_result_reason = ?, impl_soft_result_pmo_conclusion = ?, impl_soft_result_score = ?,
          impl_pmo_hard_delay = ?, impl_pmo_hard_node = ?, impl_pmo_hard_material = ?,
          impl_pmo_hard_digital = ?, impl_pmo_hard_cost = ?, impl_total_score = ?,
          pre_sales_is_recommended = ?, pre_sales_hard_requirement = ?, pre_sales_hard_solution = ?,
          pre_sales_hard_risk = ?,
          pre_sales_soft_tech_reason = ?, pre_sales_soft_tech_pmo_conclusion = ?, pre_sales_soft_tech_score = ?,
          pre_sales_soft_direction_reason = ?, pre_sales_soft_direction_pmo_conclusion = ?, pre_sales_soft_direction_score = ?,
          pre_sales_soft_promotion_reason = ?, pre_sales_soft_promotion_pmo_conclusion = ?, pre_sales_soft_promotion_score = ?,
          pre_sales_pmo_hard_activity = ?, pre_sales_pmo_hard_digital = ?, pre_sales_pmo_hard_input = ?,
          pre_sales_total_score = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.svnAddress || '',
        data.implIsRecommended ? 1 : 0, data.implHardSatisfaction || 0, data.implHardSubmitQuality || 0,
        data.implHardRequirement || 0, data.implHardRisk || 0,
        data.implSoftTechReason || '', data.implSoftTechPmoConclusion || '', data.implSoftTechScore || 0,
        data.implSoftTeamReason || '', data.implSoftTeamPmoConclusion || '', data.implSoftTeamScore || 0,
        data.implSoftResultReason || '', data.implSoftResultPmoConclusion || '', data.implSoftResultScore || 0,
        data.implPmoHardDelay || 0, data.implPmoHardNode || 0, data.implPmoHardMaterial || 0,
        data.implPmoHardDigital || 0, data.implPmoHardCost || 0, implTotalScore,
        data.preSalesIsRecommended ? 1 : 0, data.preSalesHardRequirement || 0, data.preSalesHardSolution || 0,
        data.preSalesHardRisk || 0,
        data.preSalesSoftTechReason || '', data.preSalesSoftTechPmoConclusion || '', data.preSalesSoftTechScore || 0,
        data.preSalesSoftDirectionReason || '', data.preSalesSoftDirectionPmoConclusion || '', data.preSalesSoftDirectionScore || 0,
        data.preSalesSoftPromotionReason || '', data.preSalesSoftPromotionPmoConclusion || '', data.preSalesSoftPromotionScore || 0,
        data.preSalesPmoHardActivity || 0, data.preSalesPmoHardDigital || 0, data.preSalesPmoHardInput || 0,
        preSalesTotalScore, now, resultId
      );

      // 更新模型成果
      database.prepare('DELETE FROM model_results WHERE project_result_id = ?').run([resultId]);
      if (data.modelResults && data.modelResults.length > 0) {
        const modelStmt = database.prepare(`
          INSERT INTO model_results (project_result_id, model_name, problem_scenario, value_extraction)
          VALUES (?, ?, ?, ?)
        `);
        data.modelResults.forEach(model => {
          modelStmt.run(resultId, model.modelName, model.problemScenario || '', model.valueExtraction || '');
        });
      }

      // 更新软件成果
      database.prepare('DELETE FROM software_results WHERE project_result_id = ?').run([resultId]);
      if (data.softwareResults && data.softwareResults.length > 0) {
        const softwareStmt = database.prepare(`
          INSERT INTO software_results (project_result_id, software_name, problem_scenario, value_extraction)
          VALUES (?, ?, ?, ?)
        `);
        data.softwareResults.forEach(software => {
          softwareStmt.run(resultId, software.softwareName, software.problemScenario || '', software.valueExtraction || '');
        });
      }

      // 更新文档状态
      database.prepare('DELETE FROM document_status WHERE project_result_id = ?').run([resultId]);
      const docStmt = database.prepare(`
        INSERT INTO document_status (project_result_id, document_type, is_submitted)
        VALUES (?, ?, ?)
      `);
      DOCUMENT_TYPES.forEach(docType => {
        const existingDoc = (data.documentStatus || []).find(d => d.documentType === docType);
        docStmt.run(resultId, docType, existingDoc?.isSubmitted ? 1 : 0);
      });
    });

    database.save();

    return this.getProjectResultByProjectId(projectId);
  }

  /**
   * 删除项目成果
   */
  deleteProjectResult(projectId) {
    const existing = database.prepare(`
      SELECT id FROM project_results WHERE project_id = ?
    `).get([projectId]);

    if (!existing) {
      return false;
    }

    const resultId = existing.id;

    database.transaction(() => {
      database.prepare('DELETE FROM model_results WHERE project_result_id = ?').run([resultId]);
      database.prepare('DELETE FROM software_results WHERE project_result_id = ?').run([resultId]);
      database.prepare('DELETE FROM document_status WHERE project_result_id = ?').run([resultId]);
      database.prepare('DELETE FROM project_results WHERE id = ?').run([resultId]);
    });

    database.save();

    return true;
  }

  /**
   * 计算实施团队合计分数
   */
  calculateImplTotalScore(data) {
    let total = 0;

    // 区域总监硬性分 (45分)
    total += (data.implHardSatisfaction || 0);
    total += (data.implHardSubmitQuality || 0);
    total += (data.implHardRequirement || 0);
    total += (data.implHardRisk || 0);

    // PMO硬性分 (55分)
    total += (data.implPmoHardDelay || 0);
    total += (data.implPmoHardNode || 0);
    total += (data.implPmoHardMaterial || 0);
    total += (data.implPmoHardDigital || 0);
    total += (data.implPmoHardCost || 0);

    // 软性分 (20分) - 需要勾选"是否推荐"且PMO评议结论为"通过"
    if (data.implIsRecommended) {
      if (data.implSoftTechPmoConclusion === '通过') {
        total += (data.implSoftTechScore || 0);
      }
      if (data.implSoftTeamPmoConclusion === '通过') {
        total += (data.implSoftTeamScore || 0);
      }
      if (data.implSoftResultPmoConclusion === '通过') {
        total += (data.implSoftResultScore || 0);
      }
    }

    return total;
  }

  /**
   * 计算售前团队合计分数
   */
  calculatePreSalesTotalScore(data) {
    let total = 0;

    // 区域总监硬性分 (70分)
    total += (data.preSalesHardRequirement || 0);
    total += (data.preSalesHardSolution || 0);
    total += (data.preSalesHardRisk || 0);

    // PMO硬性分 (30分)
    total += (data.preSalesPmoHardActivity || 0);
    total += (data.preSalesPmoHardDigital || 0);
    total += (data.preSalesPmoHardInput || 0);

    // 软性分 (20分) - 需要勾选"是否推荐"且PMO评议结论为"通过"
    if (data.preSalesIsRecommended) {
      if (data.preSalesSoftTechPmoConclusion === '通过') {
        total += (data.preSalesSoftTechScore || 0);
      }
      if (data.preSalesSoftDirectionPmoConclusion === '通过') {
        total += (data.preSalesSoftDirectionScore || 0);
      }
      if (data.preSalesSoftPromotionPmoConclusion === '通过') {
        total += (data.preSalesSoftPromotionScore || 0);
      }
    }

    return total;
  }

  /**
   * 为已验收项目初始化成果记录
   */
  initializeProjectResult(projectId) {
    const existing = database.prepare(`
      SELECT id FROM project_results WHERE project_id = ?
    `).get([projectId]);

    if (existing) {
      return this.getProjectResultByProjectId(projectId);
    }

    return this.createProjectResult(projectId, {});
  }
}

export default new ProjectResultService();