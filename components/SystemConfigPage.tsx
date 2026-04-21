/**
 * SystemConfigPage.tsx - 系统配置页面
 * 包含用户管理、角色管理、权限设置三个 Tab
 */

import React, { useState, useEffect, useMemo } from 'react';
import PermissionService, { Role, Permission, UserWithRoles, DataScope } from '../services/PermissionService';
import { PRIMARY_REGIONS } from '../types';

interface SystemConfigPageProps {
  isAdmin: boolean;
}

type TabKey = 'users' | 'roles' | 'permissions';

export default function SystemConfigPage({ isAdmin }: SystemConfigPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用户管理状态
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    region: '',
    linked_pm_name: '',
    roles: [] as string[],
    status: 'active'
  });

  // 角色管理状态
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  // 当前用户权限信息
  const [currentUserInfo, setCurrentUserInfo] = useState<UserWithRoles | null>(null);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'users') {
        const result = await PermissionService.fetchUsers();
        if (result.success && result.data) {
          setUsers(result.data);
        } else {
          setError(result.error || '获取用户列表失败');
        }
      } else if (activeTab === 'roles') {
        const rolesResult = await PermissionService.fetchRoles();
        if (rolesResult.success && rolesResult.data) {
          setRoles(rolesResult.data);
        }
      } else if (activeTab === 'permissions') {
        const permsResult = await PermissionService.fetchCurrentUserPermissions();
        if (permsResult.success && permsResult.data) {
          setCurrentUserInfo(permsResult.data);
        }
      }
    } catch (err) {
      setError('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载权限列表（用于角色配置）
  const loadPermissions = async () => {
    const result = await PermissionService.fetchPermissions();
    if (result.success && result.data) {
      setPermissions(result.data);
      setGroupedPermissions(result.grouped || {});
    }
  };

  // 打开用户编辑弹窗
  const openUserModal = (user?: UserWithRoles) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        name: user.name || '',
        region: user.region || '',
        linked_pm_name: user.linked_pm_name || '',
        roles: user.roles || [],
        status: user.status || 'active'
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        name: '',
        region: '',
        linked_pm_name: '',
        roles: [],
        status: 'active'
      });
    }
    setShowUserModal(true);
  };

  // 保存用户
  const saveUser = async () => {
    if (!userForm.username) {
      setError('用户名不能为空');
      return;
    }
    if (!editingUser && !userForm.password) {
      setError('密码不能为空');
      return;
    }

    try {
      if (editingUser) {
        // 更新用户
        const updateResult = await PermissionService.updateUser(editingUser.id, {
          name: userForm.name,
          region: userForm.region,
          linked_pm_name: userForm.linked_pm_name,
          status: userForm.status
        });
        if (!updateResult.success) {
          setError(updateResult.error || '更新用户失败');
          return;
        }
        // 更新角色
        if (userForm.roles.length > 0) {
          const rolesResult = await PermissionService.updateUserRoles(editingUser.id, userForm.roles);
          if (!rolesResult.success) {
            setError(rolesResult.error || '更新角色失败');
            return;
          }
        }
        // 重置密码
        if (userForm.password) {
          const pwdResult = await PermissionService.resetUserPassword(editingUser.id, userForm.password);
          if (!pwdResult.success) {
            setError(pwdResult.error || '重置密码失败');
            return;
          }
        }
      } else {
        // 创建用户
        const result = await PermissionService.createUser(userForm);
        if (!result.success) {
          setError(result.error || '创建用户失败');
          return;
        }
      }

      setShowUserModal(false);
      loadData();
    } catch (err) {
      setError('保存用户失败');
    }
  };

  // 删除用户
  const deleteUser = async (userId: number) => {
    if (!confirm('确定要删除该用户吗？')) return;

    const result = await PermissionService.deleteUser(userId);
    if (result.success) {
      loadData();
    } else {
      setError(result.error || '删除用户失败');
    }
  };

  // 打开角色权限配置弹窗
  const openRoleModal = async (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);

    // 加载角色当前权限
    const result = await PermissionService.fetchRolePermissions(role.id);
    if (result.success && result.data) {
      setRolePermissions(result.data.map(p => p.code));
    }

    // 加载全部权限列表
    await loadPermissions();
  };

  // 保存角色权限
  const saveRolePermissions = async () => {
    if (!editingRole) return;

    const result = await PermissionService.updateRolePermissions(editingRole.id, rolePermissions);
    if (result.success) {
      setShowRoleModal(false);
      loadData();
    } else {
      setError(result.error || '更新角色权限失败');
    }
  };

  // 切换权限选中状态
  const togglePermission = (code: string) => {
    setRolePermissions(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // Tab 配置
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'users', label: '用户管理', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'roles', label: '角色管理', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'permissions', label: '我的权限', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l3.618-3.618A6 6 0 1119 9z' }
  ];

  // 获取状态标签样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700';
      case 'inactive':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  // 获取角色显示颜色
  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'bg-rose-100 text-rose-700';
      case 'executive':
        return 'bg-indigo-100 text-indigo-700';
      case 'pmo':
        return 'bg-amber-100 text-amber-700';
      case 'regional_director':
        return 'bg-cyan-100 text-cyan-700';
      case 'pm':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  // 角色渲染辅助函数 - 安全处理字符串或对象格式
  const getRoleKey = (role: string | Role): string => {
    return typeof role === 'string' ? role : role.name;
  };

  const getRoleDisplayName = (role: string | Role): string => {
    if (typeof role === 'string') {
      return roles.find(r => r.name === role)?.display_name || role;
    }
    return role.display_name || role.name;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">系统配置</h1>
            <p className="text-sm text-slate-500 mt-1">管理用户、角色和权限</p>
          </div>

          {/* Tab 切换 */}
          <div className="flex space-x-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-8 mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* 用户管理 Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {isAdmin && (
                  <button
                    onClick={() => openUserModal()}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>新增用户</span>
                  </button>
                )}

                {/* 用户列表 */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">用户名</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">姓名</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">角色</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">区域</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">最后登录</th>
                        {isAdmin && (
                          <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">操作</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{user.username}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{user.name || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.roles?.map(role => (
                                <span key={getRoleKey(role)} className={`px-2 py-1 rounded-full text-xs font-bold ${getRoleColor(getRoleKey(role))}`}>
                                  {getRoleDisplayName(role)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{user.region || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusStyle(user.status)}`}>
                              {user.status === 'active' ? '正常' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{user.last_login_at || '-'}</td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => openUserModal(user)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
                              >
                                删除
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 角色管理 Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                {/* 角色列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map(role => (
                    <div key={role.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-800">{role.display_name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                        </div>
                        {role.is_system ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">系统</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold">自定义</span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          {role.permissionCount || 0} 个权限
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => openRoleModal(role)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            配置权限
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 我的权限 Tab */}
            {activeTab === 'permissions' && currentUserInfo && (
              <div className="space-y-6">
                {/* 用户信息 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-black text-slate-800 mb-4">账户信息</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">用户名</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{currentUserInfo.username}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">姓名</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{currentUserInfo.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">角色</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentUserInfo.roles?.map(role => (
                          <span key={getRoleKey(role)} className={`px-2 py-1 rounded-full text-xs font-bold ${getRoleColor(getRoleKey(role))}`}>
                            {getRoleDisplayName(role)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">区域</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{currentUserInfo.region || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 数据范围 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-black text-slate-800 mb-4">数据范围</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 rounded-lg font-bold ${
                      currentUserInfo.dataScope?.scope === 'all' ? 'bg-emerald-100 text-emerald-700' :
                      currentUserInfo.dataScope?.scope === 'region' ? 'bg-cyan-100 text-cyan-700' :
                      currentUserInfo.dataScope?.scope === 'own' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {currentUserInfo.dataScope?.scope === 'all' ? '全量数据' :
                       currentUserInfo.dataScope?.scope === 'region' ? `区域数据 (${currentUserInfo.dataScope?.region})` :
                       currentUserInfo.dataScope?.scope === 'own' ? '个人数据' :
                       '无数据权限'}
                    </span>
                    {currentUserInfo.dataScope?.readOnly && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">只读</span>
                    )}
                  </div>
                </div>

                {/* 权限列表 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-black text-slate-800 mb-4">拥有的权限</h3>
                  <div className="space-y-4">
                    {['project', 'dashboard', 'report', 'system'].map(module => {
                      // 安全处理 permissions - 可能是字符串数组或对象数组
                      const modulePerms = currentUserInfo.permissions?.filter(p => {
                        const permCode = typeof p === 'string' ? p : (p as Permission).code;
                        return permCode?.startsWith(module + ':');
                      }) || [];

                      if (modulePerms.length === 0) return null;

                      const moduleLabels: Record<string, string> = {
                        project: '项目管理',
                        dashboard: '看板访问',
                        report: '报告管理',
                        system: '系统管理'
                      };

                      return (
                        <div key={module}>
                          <h4 className="text-sm font-bold text-slate-600 mb-2">{moduleLabels[module]}</h4>
                          <div className="flex flex-wrap gap-2">
                            {modulePerms.map(perm => {
                              const permCode = typeof perm === 'string' ? perm : (perm as Permission).code;
                              const permName = typeof perm === 'string' ? perm.split(':')[1] : (perm as Permission).name;
                              return (
                                <span key={permCode} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                  {permName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 用户编辑弹窗 */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowUserModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
            <h2 className="text-xl font-black text-slate-800 mb-4">
              {editingUser ? '编辑用户' : '新增用户'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">用户名</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  placeholder="输入用户名"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">
                  密码 {editingUser && <span className="text-slate-400 text-xs">(留空则不修改)</span>}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入密码"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">姓名</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">所属区域</label>
                <select
                  value={userForm.region}
                  onChange={(e) => setUserForm({ ...userForm, region: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">无</option>
                  {PRIMARY_REGIONS.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">关联项目经理</label>
                <input
                  type="text"
                  value={userForm.linked_pm_name}
                  onChange={(e) => setUserForm({ ...userForm, linked_pm_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入项目经理名称（多个用逗号分隔）"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">角色</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setUserForm(prev => ({
                          ...prev,
                          roles: prev.roles.includes(role.name)
                            ? prev.roles.filter(r => r !== role.name)
                            : [...prev.roles, role.name]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        userForm.roles.includes(role.name)
                          ? getRoleColor(role.name)
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {role.display_name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">状态</label>
                <select
                  value={userForm.status}
                  onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">正常</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveUser}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 角色权限配置弹窗 */}
      {showRoleModal && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10 max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-black text-slate-800 mb-4">
              配置角色权限 - {editingRole.display_name}
            </h2>

            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, perms]) => {
                const moduleLabels: Record<string, string> = {
                  project: '项目管理',
                  dashboard: '看板访问',
                  report: '报告管理',
                  system: '系统管理'
                };

                return (
                  <div key={module}>
                    <h3 className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">
                      {moduleLabels[module] || module}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map(perm => (
                        <button
                          key={perm.code}
                          onClick={() => togglePermission(perm.code)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                            rolePermissions.includes(perm.code)
                              ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <svg className={`w-4 h-4 ${rolePermissions.includes(perm.code) ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {rolePermissions.includes(perm.code) ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            )}
                          </svg>
                          <span>{perm.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveRolePermissions}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                保存权限
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}