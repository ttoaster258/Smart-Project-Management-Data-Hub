/**
 * PermissionService.ts - 前端权限服务
 * 提供权限检查、用户管理等功能
 */

const API_BASE = '/api';

// 权限代码类型
export type PermissionCode = string;

// 角色类型
export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  is_system: number;
  permissionCount?: number;
}

// 权限类型
export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string;
}

// 用户类型（扩展）
export interface UserWithRoles {
  id: number;
  username: string;
  name: string;
  role: string;
  region?: string;
  linked_pm_name?: string;
  status: string;
  roles: string[];
  roles_display?: string;
  permissions?: PermissionCode[];
  dataScope?: DataScope;
  created_at?: string;
  last_login_at?: string;
}

// 数据范围类型
export interface DataScope {
  scope: 'all' | 'region' | 'own' | 'none';
  region?: string | null;
  pmNames?: string[];
  readOnly?: boolean;
}

// 获取认证 token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * 获取所有角色列表
 */
export async function fetchRoles(): Promise<{ success: boolean; data?: Role[]; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/roles`, { headers });
    const result = await response.json();

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error || '获取角色列表失败' };
  } catch (error) {
    console.error('Fetch roles error:', error);
    return { success: false, error: '获取角色列表失败' };
  }
}

/**
 * 获取角色的权限列表
 */
export async function fetchRolePermissions(roleId: number): Promise<{ success: boolean; data?: Permission[]; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/roles/${roleId}/permissions`, { headers });
    const result = await response.json();

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error || '获取角色权限失败' };
  } catch (error) {
    console.error('Fetch role permissions error:', error);
    return { success: false, error: '获取角色权限失败' };
  }
}

/**
 * 更新角色权限
 */
export async function updateRolePermissions(
  roleId: number,
  permissions: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ permissions })
    });
    const result = await response.json();

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Update role permissions error:', error);
    return { success: false, error: '更新角色权限失败' };
  }
}

/**
 * 获取所有权限列表
 */
export async function fetchPermissions(module?: string): Promise<{ success: boolean; data?: Permission[]; grouped?: Record<string, Permission[]>; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = module ? `${API_BASE}/roles/permissions?module=${module}` : `${API_BASE}/roles/permissions`;
    const response = await fetch(url, { headers });
    const result = await response.json();

    if (result.success) {
      return { success: true, data: result.data, grouped: result.grouped };
    }

    return { success: false, error: result.error || '获取权限列表失败' };
  } catch (error) {
    console.error('Fetch permissions error:', error);
    return { success: false, error: '获取权限列表失败' };
  }
}

/**
 * 获取所有用户列表
 */
export async function fetchUsers(): Promise<{ success: boolean; data?: UserWithRoles[]; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users`, { headers });
    const result = await response.json();

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error || '获取用户列表失败' };
  } catch (error) {
    console.error('Fetch users error:', error);
    return { success: false, error: '获取用户列表失败' };
  }
}

/**
 * 创建用户
 */
export async function createUser(userData: {
  username: string;
  password: string;
  name?: string;
  region?: string;
  linked_pm_name?: string;
  roles?: string[];
  status?: string;
}): Promise<{ success: boolean; data?: UserWithRoles; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    });
    const result = await response.json();

    return { success: result.success, data: result.data, error: result.error };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: '创建用户失败' };
  }
}

/**
 * 获取用户详情
 */
export async function fetchUser(userId: number): Promise<{ success: boolean; data?: UserWithRoles; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/${userId}`, { headers });
    const result = await response.json();

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error || '获取用户信息失败' };
  } catch (error) {
    console.error('Fetch user error:', error);
    return { success: false, error: '获取用户信息失败' };
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(
  userId: number,
  userData: {
    name?: string;
    region?: string;
    linked_pm_name?: string;
    status?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(userData)
    });
    const result = await response.json();

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: '更新用户信息失败' };
  }
}

/**
 * 更新用户角色
 */
export async function updateUserRoles(
  userId: number,
  roles: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ roles })
    });
    const result = await response.json();

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Update user roles error:', error);
    return { success: false, error: '更新用户角色失败' };
  }
}

/**
 * 重置用户密码
 */
export async function resetUserPassword(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/${userId}/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ newPassword })
    });
    const result = await response.json();

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: '重置密码失败' };
  }
}

/**
 * 删除用户
 */
export async function deleteUser(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers
    });
    const result = await response.json();

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: '删除用户失败' };
  }
}

/**
 * 获取当前用户的权限信息
 */
export async function fetchCurrentUserPermissions(): Promise<{ success: boolean; data?: UserWithRoles; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/users/me/permissions`, { headers });
    const result = await response.json();

    if (result.success) {
      // 缓存用户权限信息到 localStorage
      localStorage.setItem('userPermissions', JSON.stringify(result.data.permissions || []));
      localStorage.setItem('userDataScope', JSON.stringify(result.data.dataScope || { scope: 'none' }));
      localStorage.setItem('userRoles', JSON.stringify(result.data.roles || []));
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error || '获取权限信息失败' };
  } catch (error) {
    console.error('Fetch current user permissions error:', error);
    return { success: false, error: '获取权限信息失败' };
  }
}

/**
 * 检查当前用户是否拥有指定权限
 */
export function hasPermission(permissionCode: PermissionCode): boolean {
  // 从缓存中获取权限列表
  const permissionsStr = localStorage.getItem('userPermissions');
  if (!permissionsStr) return false;

  try {
    const permissions: PermissionCode[] = JSON.parse(permissionsStr);
    return permissions.includes(permissionCode);
  } catch {
    return false;
  }
}

/**
 * 检查当前用户是否拥有指定角色
 */
export function hasRole(roleName: string): boolean {
  const rolesStr = localStorage.getItem('userRoles');
  if (!rolesStr) return false;

  try {
    const roles: string[] = JSON.parse(rolesStr);
    return roles.includes(roleName);
  } catch {
    return false;
  }
}

/**
 * 检查当前用户是否为管理员
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}

/**
 * 获取当前用户的数据范围
 */
export function getDataScope(): DataScope {
  const scopeStr = localStorage.getItem('userDataScope');
  if (!scopeStr) return { scope: 'none' };

  try {
    return JSON.parse(scopeStr);
  } catch {
    return { scope: 'none' };
  }
}

/**
 * 清除权限缓存
 */
export function clearPermissionCache(): void {
  localStorage.removeItem('userPermissions');
  localStorage.removeItem('userDataScope');
  localStorage.removeItem('userRoles');
}

export default {
  fetchRoles,
  fetchRolePermissions,
  updateRolePermissions,
  fetchPermissions,
  fetchUsers,
  createUser,
  fetchUser,
  updateUser,
  updateUserRoles,
  resetUserPassword,
  deleteUser,
  fetchCurrentUserPermissions,
  hasPermission,
  hasRole,
  isAdmin,
  getDataScope,
  clearPermissionCache
};