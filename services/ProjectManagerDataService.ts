import API_BASE_URL from '../config/api.config';

/**
 * 项目经理等级枚举
 */
export enum ManagerLevel {
  Junior = '初级',
  Intermediate = '中级',
  Senior = '高级',
  Benchmark = '标杆'
}

/**
 * 项目经理数据接口
 */
export interface ProjectManagerData {
  id?: number;
  name: string;
  level: ManagerLevel;
  score: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 项目经理数据服务
 */
class ProjectManagerDataService {
  /**
   * 获取所有项目经理数据
   */
  async fetchAllManagers(): Promise<{ success: boolean; data: ProjectManagerData[]; error?: string }> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-managers`, {
        headers
      });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            level: m.level as ManagerLevel,
            score: m.score || 0,
            created_at: m.created_at,
            updated_at: m.updated_at
          }))
        };
      }

      return { success: false, data: [], error: result.error };
    } catch (error) {
      console.error('获取项目经理数据失败:', error);
      return { success: false, data: [], error: '获取项目经理数据失败' };
    }
  }

  /**
   * 根据姓名获取项目经理数据
   */
  async fetchManagerByName(name: string): Promise<ProjectManagerData | null> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-managers/${encodeURIComponent(name)}`, {
        headers
      });
      const result = await response.json();

      if (result.success) {
        return {
          id: result.data.id,
          name: result.data.name,
          level: result.data.level as ManagerLevel,
          score: result.data.score || 0,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
      }

      return null;
    } catch (error) {
      console.error('获取项目经理数据失败:', error);
      return null;
    }
  }

  /**
   * 保存项目经理数据
   */
  async saveManager(data: ProjectManagerData): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-managers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: data.name,
          level: data.level,
          score: data.score
        })
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return { success: false, error: result.error || '保存失败' };
    } catch (error) {
      console.error('保存项目经理数据失败:', error);
      return { success: false, error: '保存项目经理数据失败' };
    }
  }

  /**
   * 初始化项目经理数据（从项目中提取）
   */
  async initializeManagers(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/project-managers/initialize`, {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, message: result.message };
      }

      return { success: false, error: result.error || '初始化失败' };
    } catch (error) {
      console.error('初始化项目经理数据失败:', error);
      return { success: false, error: '初始化项目经理数据失败' };
    }
  }
}

export default new ProjectManagerDataService();