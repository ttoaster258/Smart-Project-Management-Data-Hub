import { ProjectResult, ProjectResultListItem, ProjectResultDetail, ModelResult, SoftwareResult, DocumentStatus } from '../types';
import { getAuthToken } from './AuthService';
import API_BASE_URL from '../config/api.config';

/**
 * 项目成果数据服务
 */
export class ProjectResultDataService {
  private static instance: ProjectResultDataService;

  private constructor() {}

  public static getInstance(): ProjectResultDataService {
    if (!ProjectResultDataService.instance) {
      ProjectResultDataService.instance = new ProjectResultDataService();
    }
    return ProjectResultDataService.instance;
  }

  /**
   * 获取项目成果列表
   */
  public async fetchProjectResults(region?: string): Promise<{ success: boolean; data: ProjectResultListItem[] }> {
    try {
      const url = region
        ? `${API_BASE_URL}/project-results?region=${encodeURIComponent(region)}`
        : `${API_BASE_URL}/project-results`;

      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data.map((item: any) => this.transformListItem(item))
        };
      }

      return { success: false, data: [] };
    } catch (error) {
      console.error('Failed to fetch project results:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * 获取单个项目成果详情
   */
  public async fetchProjectResultDetail(projectId: string): Promise<{ success: boolean; data?: ProjectResultDetail }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-results/${projectId}`, { headers });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformDetailItem(result.data)
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to fetch project result detail:', error);
      return { success: false };
    }
  }

  /**
   * 保存项目成果
   */
  public async saveProjectResult(projectId: string, data: Partial<ProjectResultDetail>): Promise<{ success: boolean; data?: ProjectResultDetail; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-results/${projectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(this.transformToApi(data))
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformDetailItem(result.data)
        };
      }

      return {
        success: false,
        error: result.error || '保存失败'
      };
    } catch (error) {
      console.error('Failed to save project result:', error);
      return {
        success: false,
        error: '保存失败'
      };
    }
  }

  /**
   * 区域总监提交评分
   * 只能更新总监评分字段，不能更新PMO评分和评议结论
   */
  public async saveDirectorScore(projectId: string, data: Partial<ProjectResultDetail>): Promise<{ success: boolean; data?: ProjectResultDetail; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-results/${projectId}/director-score`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(this.transformToApi(data))
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformDetailItem(result.data)
        };
      }

      return {
        success: false,
        error: result.error || '保存失败'
      };
    } catch (error) {
      console.error('Failed to save director score:', error);
      return {
        success: false,
        error: '保存失败'
      };
    }
  }

  /**
   * 初始化项目成果
   */
  public async initializeProjectResult(projectId: string): Promise<{ success: boolean; data?: ProjectResultDetail }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-results/${projectId}/initialize`, {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformDetailItem(result.data)
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to initialize project result:', error);
      return { success: false };
    }
  }

  /**
   * 删除项目成果
   */
  public async deleteProjectResult(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-results/${projectId}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || '删除失败'
      };
    } catch (error) {
      console.error('Failed to delete project result:', error);
      return {
        success: false,
        error: '删除失败'
      };
    }
  }

  /**
   * 转换列表项
   */
  private transformListItem(item: any): ProjectResultListItem {
    return {
      id: item.id,
      projectCode: item.project_code,
      projectName: item.project_name,
      groupCompany: item.group_company || '',
      type: item.type || '',
      industry: item.industry || '',
      level: item.level || '',
      region: item.region,
      projectManager: item.project_manager || '',
      salesManager: item.sales_manager || '',
      preSalesManager: item.pre_sales_manager || '',
      kickoffDate: item.kickoff_date || '',
      acceptanceDate: item.acceptance_date || '',
      securityLevel: item.security_level || '公开',
      modelResults: item.modelResults || [],
      softwareResults: item.softwareResults || [],
      submittedDocCount: item.submittedDocCount || 0,
      totalDocCount: item.totalDocCount || 38,
      svnAddress: item.projectResult?.svn_address || '',
      projectResult: item.projectResult ? this.transformProjectResult(item.projectResult) : null
    };
  }

  /**
   * 转换详情项
   */
  private transformDetailItem(item: any): ProjectResultDetail {
    return {
      ...this.transformListItem(item),
      documentStatus: item.documentStatus || []
    };
  }

  /**
   * 转换项目成果主数据
   */
  private transformProjectResult(data: any): ProjectResult {
    return {
      id: data.id,
      projectId: data.project_id,
      svnAddress: data.svn_address || '',
      implIsRecommended: data.impl_is_recommended === 1,
      implHardSatisfaction: data.impl_hard_satisfaction || 0,
      implHardSubmitQuality: data.impl_hard_submit_quality || 0,
      implHardRequirement: data.impl_hard_requirement || 0,
      implHardRisk: data.impl_hard_risk || 0,
      implSoftTechReason: data.impl_soft_tech_reason || '',
      implSoftTechPmoConclusion: data.impl_soft_tech_pmo_conclusion || '',
      implSoftTechScore: data.impl_soft_tech_score || 0,
      implSoftTeamReason: data.impl_soft_team_reason || '',
      implSoftTeamPmoConclusion: data.impl_soft_team_pmo_conclusion || '',
      implSoftTeamScore: data.impl_soft_team_score || 0,
      implSoftResultReason: data.impl_soft_result_reason || '',
      implSoftResultPmoConclusion: data.impl_soft_result_pmo_conclusion || '',
      implSoftResultScore: data.impl_soft_result_score || 0,
      implPmoHardDelay: data.impl_pmo_hard_delay || 0,
      implPmoHardNode: data.impl_pmo_hard_node || 0,
      implPmoHardMaterial: data.impl_pmo_hard_material || 0,
      implPmoHardDigital: data.impl_pmo_hard_digital || 0,
      implPmoHardCost: data.impl_pmo_hard_cost || 0,
      implTotalScore: data.impl_total_score || 0,
      preSalesIsRecommended: data.pre_sales_is_recommended === 1,
      preSalesHardRequirement: data.pre_sales_hard_requirement || 0,
      preSalesHardSolution: data.pre_sales_hard_solution || 0,
      preSalesHardRisk: data.pre_sales_hard_risk || 0,
      preSalesSoftTechReason: data.pre_sales_soft_tech_reason || '',
      preSalesSoftTechPmoConclusion: data.pre_sales_soft_tech_pmo_conclusion || '',
      preSalesSoftTechScore: data.pre_sales_soft_tech_score || 0,
      preSalesSoftDirectionReason: data.pre_sales_soft_direction_reason || '',
      preSalesSoftDirectionPmoConclusion: data.pre_sales_soft_direction_pmo_conclusion || '',
      preSalesSoftDirectionScore: data.pre_sales_soft_direction_score || 0,
      preSalesSoftPromotionReason: data.pre_sales_soft_promotion_reason || '',
      preSalesSoftPromotionPmoConclusion: data.pre_sales_soft_promotion_pmo_conclusion || '',
      preSalesSoftPromotionScore: data.pre_sales_soft_promotion_score || 0,
      preSalesPmoHardActivity: data.pre_sales_pmo_hard_activity || 0,
      preSalesPmoHardDigital: data.pre_sales_pmo_hard_digital || 0,
      preSalesPmoHardInput: data.pre_sales_pmo_hard_input || 0,
      preSalesTotalScore: data.pre_sales_total_score || 0
    };
  }

  /**
   * 转换为 API 请求格式
   */
  private transformToApi(data: Partial<ProjectResultDetail>): any {
    return {
      svnAddress: data.svnAddress || '',
      modelResults: data.modelResults || [],
      softwareResults: data.softwareResults || [],
      documentStatus: data.documentStatus || [],
      implIsRecommended: data.projectResult?.implIsRecommended || false,
      implHardSatisfaction: data.projectResult?.implHardSatisfaction || 0,
      implHardSubmitQuality: data.projectResult?.implHardSubmitQuality || 0,
      implHardRequirement: data.projectResult?.implHardRequirement || 0,
      implHardRisk: data.projectResult?.implHardRisk || 0,
      implSoftTechReason: data.projectResult?.implSoftTechReason || '',
      implSoftTechPmoConclusion: data.projectResult?.implSoftTechPmoConclusion || '',
      implSoftTechScore: data.projectResult?.implSoftTechScore || 0,
      implSoftTeamReason: data.projectResult?.implSoftTeamReason || '',
      implSoftTeamPmoConclusion: data.projectResult?.implSoftTeamPmoConclusion || '',
      implSoftTeamScore: data.projectResult?.implSoftTeamScore || 0,
      implSoftResultReason: data.projectResult?.implSoftResultReason || '',
      implSoftResultPmoConclusion: data.projectResult?.implSoftResultPmoConclusion || '',
      implSoftResultScore: data.projectResult?.implSoftResultScore || 0,
      implPmoHardDelay: data.projectResult?.implPmoHardDelay || 0,
      implPmoHardNode: data.projectResult?.implPmoHardNode || 0,
      implPmoHardMaterial: data.projectResult?.implPmoHardMaterial || 0,
      implPmoHardDigital: data.projectResult?.implPmoHardDigital || 0,
      implPmoHardCost: data.projectResult?.implPmoHardCost || 0,
      implTotalScore: data.projectResult?.implTotalScore || 0,
      preSalesIsRecommended: data.projectResult?.preSalesIsRecommended || false,
      preSalesHardRequirement: data.projectResult?.preSalesHardRequirement || 0,
      preSalesHardSolution: data.projectResult?.preSalesHardSolution || 0,
      preSalesHardRisk: data.projectResult?.preSalesHardRisk || 0,
      preSalesSoftTechReason: data.projectResult?.preSalesSoftTechReason || '',
      preSalesSoftTechPmoConclusion: data.projectResult?.preSalesSoftTechPmoConclusion || '',
      preSalesSoftTechScore: data.projectResult?.preSalesSoftTechScore || 0,
      preSalesSoftDirectionReason: data.projectResult?.preSalesSoftDirectionReason || '',
      preSalesSoftDirectionPmoConclusion: data.projectResult?.preSalesSoftDirectionPmoConclusion || '',
      preSalesSoftDirectionScore: data.projectResult?.preSalesSoftDirectionScore || 0,
      preSalesSoftPromotionReason: data.projectResult?.preSalesSoftPromotionReason || '',
      preSalesSoftPromotionPmoConclusion: data.projectResult?.preSalesSoftPromotionPmoConclusion || '',
      preSalesSoftPromotionScore: data.projectResult?.preSalesSoftPromotionScore || 0,
      preSalesPmoHardActivity: data.projectResult?.preSalesPmoHardActivity || 0,
      preSalesPmoHardDigital: data.projectResult?.preSalesPmoHardDigital || 0,
      preSalesPmoHardInput: data.projectResult?.preSalesPmoHardInput || 0,
      preSalesTotalScore: data.projectResult?.preSalesTotalScore || 0
    };
  }
}

export default ProjectResultDataService.getInstance();