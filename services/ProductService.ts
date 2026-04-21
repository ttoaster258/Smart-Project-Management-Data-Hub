import { Product, ProjectProduct, ProductSalesStats } from '../types';
import API_BASE_URL from '../config/api.config';

// 获取认证 token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

class ProductService {
  /**
   * 获取所有产品列表
   */
  async fetchAllProducts(): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products`, { headers });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        data: [],
        error: result.error || '获取产品列表失败'
      };
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return {
        success: false,
        data: [],
        error: '获取产品列表失败'
      };
    }
  }

  /**
   * 创建产品（管理员）
   */
  async createProduct(name: string, sortOrder: number = 0): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, sort_order: sortOrder })
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
        error: result.error || '创建产品失败'
      };
    } catch (error) {
      console.error('Failed to create product:', error);
      return {
        success: false,
        error: '创建产品失败'
      };
    }
  }

  /**
   * 更新产品（管理员）
   */
  async updateProduct(id: number, data: { name?: string; sort_order?: number }): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
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
        error: result.error || '更新产品失败'
      };
    } catch (error) {
      console.error('Failed to update product:', error);
      return {
        success: false,
        error: '更新产品失败'
      };
    }
  }

  /**
   * 删除产品（管理员）
   */
  async deleteProduct(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      console.error('Failed to delete product:', error);
      return {
        success: false,
        error: '删除产品失败'
      };
    }
  }

  /**
   * 获取项目的销售产品列表
   */
  async fetchProjectProducts(projectId: string): Promise<{ success: boolean; data?: ProjectProduct[]; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products/for-project/${projectId}`, { headers });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        data: [],
        error: result.error || '获取项目产品失败'
      };
    } catch (error) {
      console.error('Failed to fetch project products:', error);
      return {
        success: false,
        data: [],
        error: '获取项目产品失败'
      };
    }
  }

  /**
   * 保存项目的销售产品
   */
  async saveProjectProducts(
    projectId: string,
    products: { product_id: number; sales_amount: number }[]
  ): Promise<{ success: boolean; data?: ProjectProduct[]; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products/for-project/${projectId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ products })
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
        error: result.error || '保存项目产品失败'
      };
    } catch (error) {
      console.error('Failed to save project products:', error);
      return {
        success: false,
        error: '保存项目产品失败'
      };
    }
  }

  /**
   * 获取产品销售统计（用于产品销售排名）
   */
  async fetchProductSalesStats(): Promise<{ success: boolean; data?: ProductSalesStats[]; error?: string }> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/products/stats/sales`, { headers });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        data: [],
        error: result.error || '获取产品销售统计失败'
      };
    } catch (error) {
      console.error('Failed to fetch product sales stats:', error);
      return {
        success: false,
        data: [],
        error: '获取产品销售统计失败'
      };
    }
  }
}

export default new ProductService();