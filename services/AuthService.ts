const API_BASE = '/api';

/**
 * 获取认证 token
 */
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * 检查是否已登录
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * 清除认证缓存（登出时调用）
 */
export function clearAuthCache() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userPermissions');
  localStorage.removeItem('userRoles');
  localStorage.removeItem('userDataScope');
}

/**
 * 检查当前用户是否拥有指定权限
 */
export function hasPermission(permissionCode: string): boolean {
  const permissionsStr = localStorage.getItem('userPermissions');
  if (!permissionsStr) return false;

  try {
    const permissions: string[] = JSON.parse(permissionsStr);
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
 * 获取当前用户的数据范围
 */
export function getUserDataScope(): { scope: 'all' | 'region' | 'own' | 'none'; region?: string | null; pmNames?: string[]; readOnly?: boolean } {
  const scopeStr = localStorage.getItem('userDataScope');
  if (!scopeStr) return { scope: 'none' };

  try {
    return JSON.parse(scopeStr);
  } catch {
    return { scope: 'none' };
  }
}

/**
 * 根据数据范围过滤项目列表
 */
export function filterProjectsByDataScope(projects: any[]): any[] {
  const scope = getUserDataScope();

  if (scope.scope === 'all') {
    return projects;
  }

  if (scope.scope === 'region' && scope.region) {
    return projects.filter(p => {
      const projectRegion = p.region || '';
      return projectRegion.includes(scope.region) || scope.region.includes(projectRegion);
    });
  }

  if (scope.scope === 'own' && scope.pmNames && scope.pmNames.length > 0) {
    return projects.filter(p => {
      const pm = p.members?.projectManager || p.project_manager || '';
      return scope.pmNames.some(name => pm.includes(name) || name.includes(pm));
    });
  }

  return [];
}

/**
 * 检查当前用户是否为管理员
 * (兼容旧版本，优先使用 hasRole('admin'))
 */
export function isAdminUser(): boolean {
  // 首先检查 RBAC 角色
  if (hasRole('admin')) return true;

  // 回退到旧版检查
  const user = getCurrentUser();
  return user?.role === 'admin';
}

// 兼容别名 - 供旧版代码使用
export const isAdmin = isAdminUser;

/**
 * 带认证的 fetch 请求
 */
export async function authFetch(url: string, options: { headers?: Record<string, string>; method?: string; body?: string } & RequestInit = {}) {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 如果返回 401，清除认证信息并跳转到登录页
  if (response.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('未授权');
  }

  return response;
}

/**
 * 用户登录
 */
export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  throw new Error(data.error || '登录失败');
}

/**
 * 用户登出
 */
export async function logout() {
  try {
    const token = getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
  } catch (error) {
    // 即使登出失败，也清除本地存储
  } finally {
    clearAuthCache();
  }
}

/**
 * 获取当前用户信息（从服务器）
 */
export async function fetchCurrentUser() {
  const response = await authFetch(`${API_BASE}/auth/me`);
  const data = await response.json();

  if (data.success) {
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }

  throw new Error(data.error || '获取用户信息失败');
}

/**
 * 修改密码
 */
export async function changePassword(oldPassword: string, newPassword: string) {
  const response = await authFetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || '修改密码失败');
  }

  return data;
}