import React, { useState, useEffect, useMemo } from 'react';
import { ChangeType, ReasonCategory, PRIMARY_REGIONS, REGION_MAPPING } from '../types';
import { getUserDataScope, hasRole } from '../services/AuthService';
import API_BASE_URL from '../config/api.config';

interface ProjectChange {
  id: number;
  projectId: string;
  projectName: string;
  projectCode: string;
  projectManager: string;
  region: string;
  level: string;
  type: ChangeType;
  reasonCategory: ReasonCategory;
  reason: string;
  content: string;
  impactsPerformance: boolean;
  changeDate: string;
  changeCount: number;
  before?: string;
  after?: string;
  newProjectManager?: string;
  oldProjectManager?: string;
  newBudgetTotal?: number;
  oldBudgetTotal?: number;
  newOutsourcerAmount?: number;
  oldOutsourcerAmount?: number;
  newProjectCycle?: string;
  oldProjectCycle?: string;
  status?: string;
}

interface ChangeManagementPageProps {
  projects?: any[];
}

export default function ChangeManagementPage({ projects = [] }: ChangeManagementPageProps) {
  const [changes, setChanges] = useState<ProjectChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingChange, setEditingChange] = useState<ProjectChange | null>(null);
  const [viewingChange, setViewingChange] = useState<ProjectChange | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // 区域总监权限相关
  const isRegionalDirector = hasRole('regional_director');
  const dataScope = getUserDataScope();
  const userRegion = dataScope.scope === 'region' ? dataScope.region : null;

  // 项目搜索状态
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // 筛选状态
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: '',
    region: ''
  });

  // 变更类型切换选项
  const changeTypeTabs = [
    { label: '全部变更', value: '' },
    { label: '人员变更', value: ChangeType.Personnel },
    { label: '预算变更', value: ChangeType.Budget },
    { label: '进度变更', value: ChangeType.Schedule }
  ];

  // 表单状态
  const [formData, setFormData] = useState({
    projectId: '',
    type: ChangeType.Personnel,
    reasonCategory: ReasonCategory.External,
    reason: '',
    content: '',
    impactsPerformance: false,
    changeDate: new Date().toISOString().split('T')[0],
    newProjectManager: '',
    newBudgetTotal: '',
    newOutsourcerAmount: '',
    newProjectCycleStart: '',
    newProjectCycleEnd: ''
  });

  // 获取项目列表（区域总监只显示其区域的项目）
  const projectOptions = useMemo(() => {
    let filteredProjects = projects.map(p => ({
      id: p.id,
      name: p.projectName,
      code: p.projectCode,
      region: p.region,
      status: p.status
    }));

    // 区域总监只能选择自己区域的项目
    if (isRegionalDirector && userRegion) {
      filteredProjects = filteredProjects.filter(p => {
        const projectRegion = p.region || '';
        return projectRegion.includes(userRegion) || userRegion.includes(projectRegion);
      });
    }

    return filteredProjects;
  }, [projects, isRegionalDirector, userRegion]);

  // 根据搜索词筛选项目
  const filteredProjectOptions = useMemo(() => {
    if (!projectSearchTerm.trim()) return projectOptions;
    const term = projectSearchTerm.toLowerCase();
    return projectOptions.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.code?.toLowerCase().includes(term)
    );
  }, [projectOptions, projectSearchTerm]);

  // 获取当前选中的项目名称
  const selectedProjectName = useMemo(() => {
    const project = projectOptions.find(p => p.id === formData.projectId);
    return project ? `${project.name} (${project.code})` : '';
  }, [projectOptions, formData.projectId]);

  // 获取当前项目的所有变更记录（按变更日期排序）
  const projectChangesList = useMemo(() => {
    if (!viewingChange) return [];
    return changes
      .filter(c => c.projectId === viewingChange.projectId)
      .sort((a, b) => new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime());
  }, [changes, viewingChange]);

  // 计算当前变更的位置（第几次变更）
  const currentChangeIndex = useMemo(() => {
    if (!viewingChange || projectChangesList.length === 0) return -1;
    return projectChangesList.findIndex(c => c.id === viewingChange.id);
  }, [projectChangesList, viewingChange]);

  // 上一次变更
  const previousChange = useMemo(() => {
    if (currentChangeIndex <= 0) return null;
    return projectChangesList[currentChangeIndex - 1];
  }, [projectChangesList, currentChangeIndex]);

  // 下一次变更
  const nextChange = useMemo(() => {
    if (currentChangeIndex < 0 || currentChangeIndex >= projectChangesList.length - 1) return null;
    return projectChangesList[currentChangeIndex + 1];
  }, [projectChangesList, currentChangeIndex]);

  // 跳转到上一次/下一次变更
  const navigateToChange = (change: ProjectChange | null) => {
    if (change) {
      setViewingChange(change);
    }
  };

  // 获取唯一的区域列表（使用固定的区域列表）
  const regions = PRIMARY_REGIONS;

  // 获取变更记录
  useEffect(() => {
    fetchChanges();
  }, [selectedProjectId]);

  const fetchChanges = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const url = selectedProjectId
        ? `${API_BASE_URL}/changes/project/${selectedProjectId}`
        : `${API_BASE_URL}/changes`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setChanges(result.data);
      }
    } catch (error) {
      console.error('获取变更记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选变更记录（区域总监只看自己区域的变更）
  const filteredChanges = useMemo(() => {
    // 首先按区域总监权限过滤
    let baseChanges = changes;
    if (isRegionalDirector && userRegion) {
      baseChanges = changes.filter(change => {
        const mappedRegion = REGION_MAPPING[change.region] || change.region;
        return mappedRegion === userRegion || mappedRegion.includes(userRegion) || userRegion.includes(mappedRegion);
      });
    }

    return baseChanges.filter(change => {
      // 搜索词筛选
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (
          !change.projectName?.toLowerCase().includes(term) &&
          !change.projectCode?.toLowerCase().includes(term) &&
          !change.reason?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // 类型筛选
      if (filters.type && change.type !== filters.type) {
        return false;
      }

      // 区域筛选（区域总监不使用此筛选，因为他们已经被锁定）
      if (!isRegionalDirector && filters.region) {
        const mappedRegion = REGION_MAPPING[change.region] || change.region;
        if (mappedRegion !== filters.region) {
          return false;
        }
      }

      return true;
    });
  }, [changes, filters, isRegionalDirector, userRegion]);

  // 打开新增/编辑弹窗
  const openModal = (change: ProjectChange | null = null) => {
    if (change) {
      setEditingChange(change);
      // 解析项目周期（格式：YYYY-MM 至 YYYY-MM）
      let cycleStart = '';
      let cycleEnd = '';
      if (change.newProjectCycle) {
        const parts = change.newProjectCycle.split(' 至 ');
        if (parts.length === 2) {
          cycleStart = parts[0].trim();
          cycleEnd = parts[1].trim();
        }
      }
      // 编辑时：预算字段需要从元转换为万元显示（除以10000）
      setFormData({
        projectId: change.projectId,
        type: change.type as ChangeType,
        reasonCategory: change.reasonCategory as ReasonCategory,
        reason: change.reason || '',
        content: change.content || '',
        impactsPerformance: change.impactsPerformance,
        changeDate: change.changeDate,
        newProjectManager: change.newProjectManager || '',
        newBudgetTotal: change.newBudgetTotal ? (change.newBudgetTotal / 10000).toString() : '',
        newOutsourcerAmount: change.newOutsourcerAmount ? (change.newOutsourcerAmount / 10000).toString() : '',
        newProjectCycleStart: cycleStart,
        newProjectCycleEnd: cycleEnd
      });
    } else {
      setEditingChange(null);
      setFormData({
        projectId: selectedProjectId || '',
        type: ChangeType.Personnel,
        reasonCategory: ReasonCategory.External,
        reason: '',
        content: '',
        impactsPerformance: false,
        changeDate: new Date().toISOString().split('T')[0],
        newProjectManager: '',
        newBudgetTotal: '',
        newOutsourcerAmount: '',
        newProjectCycleStart: '',
        newProjectCycleEnd: ''
      });
    }
    setShowModal(true);
  };

  // 打开详情弹窗
  const openDetailModal = (change: ProjectChange) => {
    setViewingChange(change);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // 组合项目周期（两个日期合并为一个字符串）
      let newProjectCycle = '';
      if (formData.newProjectCycleStart && formData.newProjectCycleEnd) {
        newProjectCycle = `${formData.newProjectCycleStart} 至 ${formData.newProjectCycleEnd}`;
      }
      // 预算变更：将万元转换为元（乘以10000）
      const payload = {
        projectId: formData.projectId,
        type: formData.type,
        reasonCategory: formData.reasonCategory,
        reason: formData.reason,
        content: formData.content,
        impactsPerformance: formData.impactsPerformance,
        changeDate: formData.changeDate,
        newProjectManager: formData.newProjectManager,
        newBudgetTotal: formData.newBudgetTotal ? parseFloat(formData.newBudgetTotal) * 10000 : null,
        newOutsourcerAmount: formData.newOutsourcerAmount ? parseFloat(formData.newOutsourcerAmount) * 10000 : null,
        newProjectCycle: newProjectCycle || null
      };

      const url = editingChange
        ? `${API_BASE_URL}/changes/${editingChange.id}`
        : `${API_BASE_URL}/changes`;

      const response = await fetch(url, {
        method: editingChange ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        fetchChanges();
      } else {
        alert('保存失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('保存变更记录失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条变更记录吗？')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/changes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        fetchChanges();
      }
    } catch (error) {
      console.error('删除变更记录失败:', error);
    }
  };

  const gridLayout = "grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] gap-6 px-8 py-5 items-center";

  return (
    <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden text-slate-900">
      {/* 头部装饰与筛选 */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-8 py-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                  <span className="text-sm font-bold text-slate-500">
                    {isRegionalDirector && userRegion ? `${userRegion} ` : ''}
                    共录入 <span className="text-indigo-600 font-black">{filteredChanges.length}</span> 条变更记录
                  </span>
               </div>
               <button
                  onClick={() => openModal()}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  新增变更
                </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative group">
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                placeholder="搜索项目或变更项..."
                className="pl-11 pr-4 py-2.5 w-72 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400"
              />
              <svg className="absolute left-4 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 区域筛选 - 区域总监隐藏下拉框，显示区域标签 */}
            {isRegionalDirector && userRegion ? (
              <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-sm font-black text-indigo-700">{userRegion}</span>
              </div>
            ) : (
            <div className="relative">
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-sm text-slate-800"
              >
                <option value="">全部区域</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            )}

            {/* 重置按钮 - 区域总监不显示区域重置 */}
            {!isRegionalDirector && (filters.searchTerm || filters.type || filters.region) && (
              <button
                onClick={() => setFilters({ searchTerm: '', type: '', region: '' })}
                className="px-4 py-2.5 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all uppercase tracking-widest"
              >
                重置
              </button>
            )}
            {isRegionalDirector && (filters.searchTerm || filters.type) && (
              <button
                onClick={() => setFilters({ searchTerm: '', type: '', region: '' })}
                className="px-4 py-2.5 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all uppercase tracking-widest"
              >
                重置
              </button>
            )}
          </div>

          {/* 变更类型切换标签 */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">变更类型</span>
            {changeTypeTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilters({ ...filters, type: tab.value })}
                className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.type === tab.value
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 项目列表表格 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-[1280px]">
          <div className={`sticky top-0 z-10 bg-white border-b-2 border-slate-200 ${gridLayout} bg-slate-50/80 backdrop-blur-md`}>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">项目基本信息</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">变更类型/次数</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">变更生效日期</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">变更原因</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">操作</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white shadow-sm mx-4 my-4 rounded-3xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-20 text-center text-sm font-black text-slate-400 uppercase tracking-widest italic">同步变更数据中...</div>
            ) : filteredChanges.length === 0 ? (
              <div className="p-20 text-center text-sm font-black text-slate-400 uppercase tracking-widest italic">暂无变更记录</div>
            ) : filteredChanges.map(change => {
              const project = projectOptions.find(p => p.id === change.projectId);
              return (
                <div
                  key={change.id}
                  onClick={() => openDetailModal(change)}
                  className={`${gridLayout} hover:bg-slate-50 group transition-all cursor-pointer`}
                >
                  <div className="min-w-0">
                    <div className="text-base font-black text-slate-800 group-hover:text-indigo-700 transition-colors truncate mb-2">
                      {project?.name || change.projectName}
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-xs font-bold text-slate-500">{change.region}</span>
                       {project?.status && (
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                           project.status === '已验收' ? 'bg-emerald-100 text-emerald-700' :
                           project.status === '延期' ? 'bg-rose-100 text-rose-700' :
                           project.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                           'bg-blue-100 text-blue-700'
                         }`}>
                           {project.status}
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`text-base font-black mb-1 ${
                       change.type === ChangeType.Personnel ? 'text-blue-700' :
                       change.type === ChangeType.Budget ? 'text-amber-700' :
                       'text-purple-700'
                    }`}>
                      {change.type}
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">第 {change.changeCount} 回记录</div>
                  </div>

                  <div className="text-center px-4">
                    <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-sm font-black text-slate-800 text-center">
                       {change.changeDate}
                    </div>
                  </div>

                  <div className="px-4 text-center">
                     <div className="text-sm font-bold text-slate-700">
                        {change.reasonCategory}
                     </div>
                  </div>

                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetailModal(change); }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(change); }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, change.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 变更新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                {editingChange ? '修改项目变更' : '新增项目变更'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">项目名称 *</label>
                {editingChange ? (
                  <div className="w-full px-5 py-3 bg-slate-100 border border-slate-200 rounded-xl text-base font-semibold text-slate-700">
                    {selectedProjectName || formData.projectId}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={showProjectDropdown ? projectSearchTerm : selectedProjectName}
                      onChange={(e) => {
                        setProjectSearchTerm(e.target.value);
                        setShowProjectDropdown(true);
                      }}
                      onFocus={() => {
                        setProjectSearchTerm('');
                        setShowProjectDropdown(true);
                      }}
                      onBlur={() => {
                        // 延迟关闭，让点击事件有时间执行
                        setTimeout(() => setShowProjectDropdown(false), 200);
                      }}
                      placeholder="输入项目名称或编号搜索..."
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900"
                    />
                    <svg className="absolute right-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>

                    {showProjectDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                        {filteredProjectOptions.length === 0 ? (
                          <div className="px-5 py-4 text-sm text-slate-400 text-center">未找到匹配项目</div>
                        ) : (
                          filteredProjectOptions.map(project => (
                            <div
                              key={project.id}
                              onClick={() => {
                                setFormData({ ...formData, projectId: project.id });
                                setProjectSearchTerm('');
                                setShowProjectDropdown(false);
                              }}
                              className={`px-5 py-3 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                                formData.projectId === project.id ? 'bg-indigo-50' : ''
                              }`}
                            >
                              <div className="text-sm font-bold text-slate-800">{project.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{project.code} · {project.region}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更类型 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ChangeType })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900"
                  >
                    {Object.values(ChangeType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更原因 *</label>
                  <select
                    value={formData.reasonCategory}
                    onChange={(e) => setFormData({ ...formData, reasonCategory: e.target.value as ReasonCategory })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900"
                  >
                    {Object.values(ReasonCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">生效日期</label>
                  <input
                    type="date"
                    value={formData.changeDate}
                    onChange={(e) => setFormData({ ...formData, changeDate: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
                <div className="flex items-end pb-1.5">
                   <label className="flex items-center cursor-pointer p-3.5 bg-slate-50 rounded-xl border border-slate-200 w-full hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.impactsPerformance}
                        onChange={(e) => setFormData({ ...formData, impactsPerformance: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-slate-700">影响绩效评估</span>
                   </label>
                </div>
              </div>

              {/* 动态输入 */}
              <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                {formData.type === ChangeType.Personnel && (
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">新任项目经理</label>
                    <input
                      type="text"
                      value={formData.newProjectManager}
                      onChange={(e) => setFormData({ ...formData, newProjectManager: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 text-slate-900"
                      placeholder="录入正式姓名"
                    />
                  </div>
                )}

                {formData.type === ChangeType.Budget && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">变更后总预算 (万元)</label>
                      <input
                        type="number"
                        value={formData.newBudgetTotal}
                        onChange={(e) => setFormData({ ...formData, newBudgetTotal: e.target.value })}
                        className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">变更后外协费 (万元)</label>
                      <input
                        type="number"
                        value={formData.newOutsourcerAmount}
                        onChange={(e) => setFormData({ ...formData, newOutsourcerAmount: e.target.value })}
                        className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {formData.type === ChangeType.Schedule && (
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">新项目周期</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="month"
                        value={formData.newProjectCycleStart}
                        onChange={(e) => setFormData({ ...formData, newProjectCycleStart: e.target.value })}
                        className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 text-slate-900"
                      />
                      <input
                        type="month"
                        value={formData.newProjectCycleEnd}
                        onChange={(e) => setFormData({ ...formData, newProjectCycleEnd: e.target.value })}
                        className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={2}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更原因</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="px-10 py-6 border-t border-slate-100 flex justify-end space-x-4 bg-slate-50 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">取消</button>
              <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-xl transition-all">提交变更记录</button>
            </div>
          </div>
        </div>
      )}

      {/* 专用详情详情窗口 (布局对齐新增页) */}
      {showDetailModal && viewingChange && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center space-x-4">
                  {/* 导航按钮 - 上一次变更 */}
                  <button
                    onClick={() => navigateToChange(previousChange)}
                    disabled={!previousChange}
                    className={`p-2 rounded-xl transition-all ${
                      previousChange
                        ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        : 'text-slate-200 cursor-not-allowed'
                    }`}
                    title={previousChange ? `上一次变更 (${previousChange.changeDate})` : '没有更早的变更'}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
                  </button>

                  <div>
                     <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">变更记录</span>
                        {projectChangesList.length > 0 && currentChangeIndex >= 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-indigo-100 text-indigo-700">
                            第 {currentChangeIndex + 1} 次 / 共 {projectChangesList.length} 次
                          </span>
                        )}
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                        {viewingChange.projectName}
                      </h3>
                  </div>

                  {/* 导航按钮 - 下一次变更 */}
                  <button
                    onClick={() => navigateToChange(nextChange)}
                    disabled={!nextChange}
                    className={`p-2 rounded-xl transition-all ${
                      nextChange
                        ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        : 'text-slate-200 cursor-not-allowed'
                    }`}
                    title={nextChange ? `下一次变更 (${nextChange.changeDate})` : '没有更新的变更'}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
                  </button>
               </div>
               <button onClick={() => setShowDetailModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 border border-slate-100 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6">
               {/* 对齐新增页的项目选择布局 */}
               <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">项目名称</label>
                  <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-800">
                    {viewingChange.projectCode} | {viewingChange.projectName}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更类型</label>
                     <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-800">
                        {viewingChange.type}
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">原因分类</label>
                     <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-800">
                        {viewingChange.reasonCategory}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更通过日期</label>
                     <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-800">
                        {viewingChange.changeDate}
                     </div>
                  </div>
                  <div className="flex items-end pb-1.5">
                     <div className="flex items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200 w-full">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${viewingChange.impactsPerformance ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                           {viewingChange.impactsPerformance && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="ml-3 text-sm font-semibold text-slate-700">影响绩效</span>
                     </div>
                  </div>
               </div>

               {/* 动态详情展示 (对齐新增页的背景块布局) */}
               <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  {viewingChange.type === ChangeType.Personnel && (
                    <div>
                      <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">新任项目经理</label>
                      <div className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-bold text-slate-900">
                        {viewingChange.newProjectManager || '未分配'}
                      </div>
                    </div>
                  )}

                  {viewingChange.type === ChangeType.Budget && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">最新总预算 (万元)</label>
                        <div className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-bold text-slate-900">
                          {(viewingChange.newBudgetTotal ? viewingChange.newBudgetTotal / 10000 : 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">最新外协费 (万元)</label>
                        <div className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-bold text-slate-900">
                          {(viewingChange.newOutsourcerAmount ? viewingChange.newOutsourcerAmount / 10000 : 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {viewingChange.type === ChangeType.Schedule && (
                    <div>
                      <label className="block text-xs font-semibold text-indigo-700 uppercase mb-2">新项目周期</label>
                      <div className="w-full px-5 py-3 bg-white border border-indigo-200 rounded-xl text-base font-bold text-slate-900">
                        {viewingChange.newProjectCycle || '未调整'}
                      </div>
                    </div>
                  )}
               </div>

               {/* 数据对比对照区 (保留有用信息) */}
               {(viewingChange.oldProjectManager || viewingChange.oldBudgetTotal || viewingChange.oldProjectCycle) && (
                  <div className="py-2 border-y border-slate-100">
                     <div className="flex items-center space-x-6">
                        <div className="flex-1">
                           <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 text-center font-black">变更前数据</label>
                           <div className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-700 text-center">
                              {viewingChange.type === ChangeType.Personnel ? (viewingChange.oldProjectManager || '无') :
                               viewingChange.type === ChangeType.Budget ? (viewingChange.oldBudgetTotal ? (viewingChange.oldBudgetTotal / 10000).toFixed(2) + ' 万' : '0.00') :
                               (viewingChange.oldProjectCycle || '无')}
                           </div>
                        </div>
                        <div className="flex-shrink-0 text-slate-300">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 5l7 7-7 7" /></svg>
                        </div>
                        <div className="flex-1">
                           <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 text-center font-black">变更后数据</label>
                           <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 text-center">
                              {viewingChange.type === ChangeType.Personnel ? (viewingChange.newProjectManager || '无') :
                               viewingChange.type === ChangeType.Budget ? (viewingChange.newBudgetTotal ? (viewingChange.newBudgetTotal / 10000).toFixed(2) + ' 万' : '0.00') :
                               (viewingChange.newProjectCycle || '无')}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更内容</label>
                  <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 leading-relaxed">
                    {viewingChange.content || '未有内容记录'}
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">变更原因</label>
                  <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 italic leading-relaxed">
                    {viewingChange.reason || '未细述'}
                  </div>
               </div>
            </div>

            <div className="px-10 py-6 border-t border-slate-100 flex justify-center bg-slate-50 shrink-0">
               <button onClick={() => setShowDetailModal(false)} className="px-16 py-2.5 bg-slate-900 text-white text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-all">
                  关闭档案
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}