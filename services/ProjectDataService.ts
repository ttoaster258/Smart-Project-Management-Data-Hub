import { Project, ProjectStatus, Region, CustomColumn, CustomDataItem, ProjectCustomData } from '../types';
import { getAuthToken } from './AuthService';
import { calculateProjectStatus } from '../constants';
import API_BASE_URL from '../config/api.config';

/**
 * 项目数据服务 - 使用 SQLite 后端 API
 */
export class ProjectDataService {
  private static instance: ProjectDataService;
  private isAdmin: boolean = false;
  private clientIp: string = '';

  private constructor() {
    this.checkPermissions();
  }

  public static getInstance(): ProjectDataService {
    if (!ProjectDataService.instance) {
      ProjectDataService.instance = new ProjectDataService();
    }
    return ProjectDataService.instance;
  }

  /**
   * 获取当前权限状态
   */
  public getPermissionStatus() {
    return {
      isAdmin: this.isAdmin,
      clientIp: this.clientIp
    };
  }

  /**
   * 检查权限状态
   */
  private async checkPermissions() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/check`);
      const data = await response.json();
      if (data.success) {
        this.isAdmin = data.isAdmin;
        this.clientIp = data.clientIp || '';
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  }

  /**
   * 获取所有项目
   * @param includePastYears - 是否包含往年数据（已验收且验收年份<当前年份的项目）
   */
  public async fetchAllProjects(includePastYears = false): Promise<{ success: boolean; data: Project[]; isAdmin?: boolean }> {
    try {
      const url = `${API_BASE_URL}/projects?includePastYears=${includePastYears}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.isAdmin !== undefined) {
        this.isAdmin = result.isAdmin;
      }

      if (result.success) {
        return {
          success: true,
          data: result.data.map((p: any) => this.transformFromDb(p)),
          isAdmin: this.isAdmin
        };
      }

      return { success: false, data: [] };
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * 根据 ID 获取项目
   */
  public async fetchProjectById(id: string): Promise<Project | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`);
      const result = await response.json();

      if (result.success) {
        return this.transformFromDb(result.data);
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch project:', error);
      return null;
    }
  }

  /**
   * 创建新项目
   */
  public async createProject(project: Project): Promise<{ success: boolean; data?: Project; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 只有"暂停"和"已验收"状态需要保存到数据库
      // "延期"和"正在进行"是系统根据日期自动计算的
      const projectToSave = { ...project };
      if (
        project.status !== ProjectStatus.Paused &&
        project.status !== ProjectStatus.Accepted
      ) {
        projectToSave.status = ProjectStatus.Ongoing; // 默认状态
      }

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(projectToSave)
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformFromDb(result.data)
        };
      }

      return {
        success: false,
        error: result.error || '创建项目失败'
      };
    } catch (error) {
      console.error('Failed to create project:', error);
      return {
        success: false,
        error: '创建项目失败'
      };
    }
  }

  /**
   * 更新项目
   */
  public async updateProject(id: string, project: Project): Promise<{ success: boolean; data?: Project; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 更新项目状态逻辑：移除限制，允许所有状态都可以修改
      const projectToSave = { ...project };

      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(projectToSave)
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.transformFromDb(result.data)
        };
      }

      return {
        success: false,
        error: result.error || '更新项目失败'
      };
    } catch (error) {
      console.error('Failed to update project:', error);
      return {
        success: false,
        error: '更新项目失败'
      };
    }
  }

  /**
   * 删除项目
   */
  public async deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || '删除项目失败'
      };
    } catch (error) {
      console.error('Failed to delete project:', error);
      return {
        success: false,
        error: '删除项目失败'
      };
    }
  }

  /**
   * 批量导入项目
   */
  public async batchImportProjects(projects: Project[]): Promise<{ success: boolean; successCount?: number; failedCount?: number; errors?: any[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projects })
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          successCount: result.success,
          failedCount: result.failed,
          errors: result.errors
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to batch import projects:', error);
      return { success: false };
    }
  }

  /**
   * 导出项目数据
   */
  public async exportProjects(): Promise<Blob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/export/json`);

      if (response.ok) {
        return await response.blob();
      }

      return null;
    } catch (error) {
      console.error('Failed to export projects:', error);
      return null;
    }
  }

  /**
   * 获取项目的变更记录
   */
  public async fetchProjectChanges(projectId: string): Promise<any[]> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/changes/project/${projectId}`, {
        headers
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch project changes:', error);
      return [];
    }
  }

  /**
   * 获取自定义列定义
   */
  public async fetchCustomColumns(): Promise<{ success: boolean; data: CustomColumn[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-columns`);
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return { success: false, data: [] };
    } catch (error) {
      console.error('Failed to fetch custom columns:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * 创建自定义列
   */
  public async createCustomColumn(columnName: string, dataType: 'text' | 'number'): Promise<{ success: boolean; data?: CustomColumn; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/custom-columns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ columnName, dataType })
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error || '创建自定义列失败'
      };
    } catch (error) {
      console.error('Failed to create custom column:', error);
      return {
        success: false,
        error: '创建自定义列失败'
      };
    }
  }

  /**
   * 更新自定义列
   */
  public async updateCustomColumn(id: number, data: { columnName?: string; dataType?: 'text' | 'number'; sortOrder?: number }): Promise<{ success: boolean; data?: CustomColumn; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/custom-columns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error || '更新自定义列失败'
      };
    } catch (error) {
      console.error('Failed to update custom column:', error);
      return {
        success: false,
        error: '更新自定义列失败'
      };
    }
  }

  /**
   * 删除自定义列
   */
  public async deleteCustomColumn(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/custom-columns/${id}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || '删除自定义列失败'
      };
    } catch (error) {
      console.error('Failed to delete custom column:', error);
      return {
        success: false,
        error: '删除自定义列失败'
      };
    }
  }

  /**
   * 获取所有项目的自定义列数据
   */
  public async fetchCustomColumnData(): Promise<{ success: boolean; data: CustomDataItem[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-columns/data`);
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return { success: false, data: [] };
    } catch (error) {
      console.error('Failed to fetch custom column data:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * 更新项目的自定义列值
   */
  public async updateCustomColumnValue(projectId: string, columnKey: string, value: string | number): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/custom-columns/data/${projectId}/${columnKey}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value })
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || '更新数据失败'
      };
    } catch (error) {
      console.error('Failed to update custom column value:', error);
      return {
        success: false,
        error: '更新数据失败'
      };
    }
  }

  /**
   * 将数据库格式转换为前端 Project 类型
   */
  private transformFromDb(dbProject: any): Project {
    // 计算项目实际状态（暂停和已验收是手动状态，其他根据日期自动计算）
    const plannedEndDate = dbProject.planned_end_date || '';
    const dbStatus = dbProject.status as ProjectStatus;
    const calculatedStatus = calculateProjectStatus(dbStatus, plannedEndDate);

    // 解析 team_members - 后端 enrichProject 已解析，直接使用
    let teamMembers: { name: string; role: string }[] = [];
    if (dbProject.team_members) {
      if (Array.isArray(dbProject.team_members)) {
        teamMembers = dbProject.team_members;
      } else if (typeof dbProject.team_members === 'string') {
        try {
          teamMembers = JSON.parse(dbProject.team_members);
        } catch {
          teamMembers = [];
        }
      }
    }

    // enrichProject 已处理的数据，直接使用
    const personnelDetails: any[] = dbProject.personnelDetails || [];
    const changes: any[] = dbProject.changes || [];
    const outsourcingItems: any[] = dbProject.outsourcingItems || [];
    const paymentNodes: any[] = dbProject.paymentNodes || [];
    const milestoneNodeData: any = dbProject.milestoneNodeData || {};

    // 解析 projectHighlight
    const projectHighlight = dbProject.project_highlight || '';

    // 解析 milestoneNode
    const milestoneNode = dbProject.milestone_node || '';

    // 解析 projectNature（项目性质，多选数组）
    let projectNature: string[] = [];
    if (dbProject.project_nature) {
      if (Array.isArray(dbProject.project_nature)) {
        projectNature = dbProject.project_nature;
      } else if (typeof dbProject.project_nature === 'string') {
        try {
          const parsed = JSON.parse(dbProject.project_nature);
          projectNature = Array.isArray(parsed) ? parsed : [];
        } catch {
          projectNature = [];
        }
      }
    }

    return {
      id: dbProject.id,
      projectCode: dbProject.project_code,
      projectName: dbProject.project_name,
      securityLevel: dbProject.security_level || '公开',
      status: calculatedStatus,
      statusComment: dbProject.status_comment || '',
      milestoneNode: milestoneNode,
      milestoneNodeData: milestoneNodeData,
      forecastAcceptanceDate: dbProject.forecast_acceptance_date || '',
      mainWorkCompleted: dbProject.main_work_completed || '',
      budgetUsage: dbProject.budget_usage || '',
      marginRate: dbProject.margin_rate || '',
      changeCount: dbProject.change_count || 0,
      lastChangeDate: dbProject.last_change_date || '',
      projectCycle: dbProject.project_cycle || '',
      forecast2026Revenue: dbProject.forecast_2026_revenue || 0,
      forecast2026LossRevenue: dbProject.forecast_2026_loss_revenue || 0,
      outsourcerName: dbProject.outsourcer_name || '',
      outsourcerAmount: dbProject.outsourcer_amount || 0,
      outsourcerTechContent: dbProject.outsourcer_tech_content || '',
      equipmentSpec: dbProject.equipment_spec || '',
      outsourcerRatio: dbProject.outsourcer_ratio || '',
      receivedThankYouDate: dbProject.received_thank_you_date || '',
      documentReceivedDate: dbProject.document_received_date || '',
      remarks: dbProject.remarks || '',
      projectHighlight: projectHighlight,
      acceptanceRiskLevel: dbProject.acceptance_risk_level || '',
      projectNature: projectNature,
      phase: dbProject.phase || '',
      type: dbProject.type || '',
      nature: [], // 数据库暂无此字段，保持为空
      level: dbProject.level || '',
      industry: dbProject.industry || '',
      region: dbProject.region as Region,
      isBenchmark: dbProject.is_benchmark || false,
      isHighlight: dbProject.is_highlight || false,
      timeline: {
        kickoffDate: dbProject.kickoff_date || '',
        plannedEndDate: dbProject.planned_end_date || '',
        contractEndDate: dbProject.contract_end_date || '',
        acceptanceDate: dbProject.acceptance_date || '',
        delayMonths: dbProject.delay_months || 0,
        acceptanceYear: dbProject.acceptance_year || '',
        acceptanceControl: dbProject.acceptance_control || ''
      },
      milestones: { market: [], implementation: [], external: [] }, // 数据库暂无此字段，保持为空
      budget: {
        totalBudget: dbProject.total_budget || 0,
        human: 0, // 数据库暂无此字段
        travel: 0, // 数据库暂无此字段
        outsourcing: 0, // 数据库暂无此字段
        procurement: 0, // 数据库暂无此字段
        business: 0, // 数据库暂无此字段
        risk: 0, // 数据库暂无此字段
        review: 0, // 数据库暂无此字段
        other: 0, // 数据库暂无此字段
        initialQuote: dbProject.initial_quote || 0,
        reqEvaluationFee: dbProject.req_evaluation_fee || 0,
        internalCost: dbProject.internal_cost || 0,
        internalProfit: dbProject.internal_profit || 0,
        budgetUsedAmount: dbProject.budget_used_amount || 0,
        outsourcingItems: outsourcingItems
      },
      payment: {
        contractName: dbProject.contract_name || '',
        groupCompany: dbProject.group_company || '',
        contractAmount: dbProject.contract_amount || 0,
        historicalPaid: dbProject.historical_paid || 0,
        paid2026: dbProject.paid_2026 || 0,
        pending: dbProject.pending || 0,
        pendingThisYear: dbProject.pending_this_year || 0,
        ratio: dbProject.ratio || 0,
        totalPaid: dbProject.total_paid || 0,
        annualConfirmedRevenue: dbProject.annual_confirmed_revenue || 0,
        acceptedPendingRevenue: dbProject.accepted_pending_revenue || 0,
        // 新增确认收入和回款节点字段
        isConfirmed: dbProject.is_confirmed || false,
        confirmedDate: dbProject.confirmed_date || '',
        paymentNodes: paymentNodes
      },
      manHours: {
        plannedTotal: dbProject.planned_total || 0,
        pmoAnnualTotal: dbProject.pmo_annual_total || 0,
        personnelDetails: personnelDetails
      },
      execution: {
        progress: dbProject.progress || 0,
        inputPercent: dbProject.input_percent || 0
      },
      ratings: {
        preSalesTotal: dbProject.pre_sales_total || 0,
        executionTotal: dbProject.execution_total || 0,
        qualityScoreRaw: dbProject.quality_score_raw || 0,
        preSalesHard: [], // 数据库暂无此字段
        preSalesSoft: [], // 数据库暂无此字段
        executionHard: [], // 数据库暂无此字段
        executionSoft: [] // 数据库暂无此字段
      },
      changes: changes,
      members: {
        projectManager: dbProject.project_manager || '',
        preSalesManager: dbProject.pre_sales_manager || '',
        salesManager: dbProject.sales_manager || '',
        projectDirector: dbProject.project_director || '',
        teamMembers: teamMembers
      },
      qualityRisks: dbProject.qualityRisks || undefined,
      // ===== 验收追踪系统专属字段 =====
      isAcceptanceTracking: dbProject.is_acceptance_tracking || false,
      acceptanceTrackingDate: dbProject.acceptance_tracking_date || '',
      trackingAcceptanceRisk: dbProject.tracking_acceptance_risk || '无',
      trackingRevenueRisk: dbProject.tracking_revenue_risk || '无',
      isNewTracking: dbProject.is_new_tracking || false,
      solutionMeasures: dbProject.solution_measures || '',
      riskReason: dbProject.risk_reason || ''
    };
  }
}

export default ProjectDataService.getInstance();