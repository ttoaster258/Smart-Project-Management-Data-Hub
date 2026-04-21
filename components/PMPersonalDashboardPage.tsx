import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectChange } from '../types';
import { hasRole, getUserDataScope } from '../services/AuthService';
import API_BASE_URL from '../config/api.config';

interface ProgressUpdate {
  id: number;
  projectId: string;
  updateText: string;
  updateTime: string;
  updatePm: string;
}

interface MilestoneData {
  milestone_node: string;
  planned_date: string | null;
  actual_date: string | null;
  is_required: number;
}

interface PMPersonalDashboardPageProps {
  projects: Project[];
  onNavigateToProject: (id: string) => void;
  isAdmin?: boolean;
}

// 关键里程碑节点
const KEY_MILESTONES = ['级别确定', '项目启动', '计划预算', '概要方案', '内部验收'];

export default function PMPersonalDashboardPage({
  projects,
  onNavigateToProject,
  isAdmin = false
}: PMPersonalDashboardPageProps) {
  // 判断是否为项目经理角色
  const isPmRole = hasRole('pm');
  const dataScope = getUserDataScope();

  // 项目经理用户自动显示自己的看板（从数据范围获取 pmNames）
  // 管理员需要手动选择
  const defaultPm = isPmRole && dataScope.pmNames && dataScope.pmNames.length > 0
    ? dataScope.pmNames[0]
    : '';

  // 状态
  const [selectedPm, setSelectedPm] = useState<string>(defaultPm);
  const [pmList, setPmList] = useState<string[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProjectId, setUpdateProjectId] = useState<string>('');
  const [updateText, setUpdateText] = useState<string>('');
  const [projectMilestones, setProjectMilestones] = useState<{ [projectId: string]: MilestoneData[] }>({});
  const [projectChanges, setProjectChanges] = useState<ProjectChange[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<{ [projectId: string]: ProgressUpdate[] }>({});
  const [loading, setLoading] = useState(!defaultPm); // 如果有默认PM，loading为false

  // 下钻弹窗状态
  const [drillDownType, setDrillDownType] = useState<'milestone' | 'completion' | 'change' | null>(null);
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ProjectChange | null>(null);

  // 打开下钻弹窗
  const openDrillDown = (type: 'milestone' | 'completion' | 'change') => {
    setDrillDownType(type);
    setShowDrillDownModal(true);
    setSelectedChange(null); // 重置选中的变更
  };

  // 关闭变更详情，返回列表
  const closeChangeDetail = () => {
    setSelectedChange(null);
  };

  // 获取项目经理列表（仅管理员需要）
  useEffect(() => {
    if (isAdmin) {
      fetchPmList();
    }
  }, [isAdmin]);

  const fetchPmList = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/progress-updates/project-managers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setPmList(result.data);
      }
    } catch (error) {
      console.error('获取项目经理列表失败:', error);
    }
  };

  // 当选择项目经理后，获取相关数据
  useEffect(() => {
    if (selectedPm) {
      setLoading(true);
      fetchProjectData();
    }
  }, [selectedPm, projects]);

  const fetchProjectData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const pmProjects = projects.filter(p => p.members?.projectManager === selectedPm);

      // 获取每个项目的里程碑数据
      const milestonePromises = pmProjects.map(p =>
        fetch(`${API_BASE_URL}/milestones/projects/${p.id}/milestones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      );

      // 获取变更记录
      const changesResponse = await fetch(`${API_BASE_URL}/changes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const changesResult = await changesResponse.json();

      // 获取进展更新
      const updatePromises = pmProjects.map(p =>
        fetch(`${API_BASE_URL}/progress-updates/project/${p.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      );

      const milestoneResults = await Promise.all(milestonePromises);
      const updateResults = await Promise.all(updatePromises);

      const milestoneMap: { [projectId: string]: MilestoneData[] } = {};
      pmProjects.forEach((p, i) => {
        if (milestoneResults[i].success) {
          milestoneMap[p.id] = milestoneResults[i].data;
        }
      });

      const updateMap: { [projectId: string]: ProgressUpdate[] } = {};
      pmProjects.forEach((p, i) => {
        if (updateResults[i].success) {
          updateMap[p.id] = updateResults[i].data;
        }
      });

      setProjectMilestones(milestoneMap);
      setProgressUpdates(updateMap);

      if (changesResult.success) {
        // 筛选当前项目经理的变更记录
        const pmChanges = changesResult.data.filter((c: ProjectChange) => c.projectManager === selectedPm);
        setProjectChanges(pmChanges);
      }

      setLoading(false);
    } catch (error) {
      console.error('获取项目数据失败:', error);
      setLoading(false);
    }
  };

  // 当前项目经理的项目列表
  const pmProjects = useMemo(() => {
    if (!selectedPm) return [];
    return projects.filter(p => p.members?.projectManager === selectedPm);
  }, [selectedPm, projects]);

  // 项目状态分布
  const statusDistribution = useMemo(() => {
    const distribution = { implementing: 0, accepted: 0, delayed: 0, paused: 0 };
    pmProjects.forEach(p => {
      if (p.status === '正在进行') distribution.implementing++;
      else if (p.status === '已验收') distribution.accepted++;
      else if (p.status === '延期') distribution.delayed++;
      else if (p.status === '暂停') distribution.paused++;
    });
    return distribution;
  }, [pmProjects]);

  // 本月关键里程碑预警/已到期
  const milestoneWarnings = useMemo(() => {
    const warnings: { projectId: string; projectName: string; node: string; plannedDate: string; type: '预警' | '已到期' }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 计算30天后的日期
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    pmProjects.forEach(project => {
      const milestones = projectMilestones[project.id] || [];
      milestones.forEach(m => {
        if (!KEY_MILESTONES.includes(m.milestone_node)) return;
        if (m.actual_date) return; // 已完成的不算

        if (m.planned_date) {
          const plannedDate = new Date(m.planned_date);
          plannedDate.setHours(0, 0, 0, 0);

          // 已到期：今天已过计划时间
          if (plannedDate < today) {
            warnings.push({
              projectId: project.id,
              projectName: project.projectName,
              node: m.milestone_node,
              plannedDate: m.planned_date,
              type: '已到期'
            });
          }
          // 预警：未来30天内计划完成
          else if (plannedDate <= thirtyDaysLater) {
            warnings.push({
              projectId: project.id,
              projectName: project.projectName,
              node: m.milestone_node,
              plannedDate: m.planned_date,
              type: '预警'
            });
          }
        }
      });
    });

    // 按日期排序，已到期的在前
    warnings.sort((a, b) => {
      if (a.type === '已到期' && b.type !== '已到期') return -1;
      if (a.type !== '已到期' && b.type === '已到期') return 1;
      return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
    });

    return warnings;
  }, [pmProjects, projectMilestones]);

  // 本月关键节点完成率
  const keyMilestoneCompletionRate = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let shouldCompleteCount = 0; // 本月应完成的
    let completedCount = 0; // 本月实际完成的

    pmProjects.forEach(project => {
      const milestones = projectMilestones[project.id] || [];
      milestones.forEach(m => {
        if (!KEY_MILESTONES.includes(m.milestone_node)) return;

        if (m.planned_date) {
          const plannedDate = new Date(m.planned_date);
          const plannedMonth = plannedDate.getMonth();
          const plannedYear = plannedDate.getFullYear();

          // 本月应完成
          if (plannedYear === currentYear && plannedMonth === currentMonth) {
            shouldCompleteCount++;

            // 检查是否本月完成（实际完成时间在本月，且计划时间原本就在本月或之前）
            if (m.actual_date) {
              const actualDate = new Date(m.actual_date);
              const actualMonth = actualDate.getMonth();
              const actualYear = actualDate.getFullYear();

              if (actualYear === currentYear && actualMonth === currentMonth) {
                completedCount++;
              }
            }
          }
        }
      });
    });

    if (shouldCompleteCount === 0) {
      return null; // 没有节点，返回null表示为空
    }

    return {
      rate: (completedCount / shouldCompleteCount) * 100,
      completed: completedCount,
      total: shouldCompleteCount
    };
  }, [pmProjects, projectMilestones]);

  // 计算项目健康度
  const calculateHealth = (project: Project): 'red' | 'yellow' | 'green' => {
    const inputPercent = project.execution?.inputPercent || 0;
    const progress = project.execution?.progress || 0;
    const deviation = inputPercent - progress;

    const budgetUsed = project.budget?.budgetUsedAmount || 0;
    const budgetTotal = project.budget?.totalBudget || 0;
    const budgetRate = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

    // 红色：偏差 > 10% 或 预算率 > 100%
    if (deviation > 10 || budgetRate > 100) {
      return 'red';
    }
    // 黄色：10% > 偏差 > 0 或 90% < 预算率 <= 100%
    if ((deviation > 0 && deviation <= 10) || (budgetRate > 90 && budgetRate <= 100)) {
      return 'yellow';
    }
    // 绿色：其他情况
    return 'green';
  };

  // 获取下一个未完成的里程碑
  const getNextMilestone = (projectId: string): string => {
    const milestones = projectMilestones[projectId] || [];
    const today = new Date();

    // 按计划日期排序，找到下一个未完成的
    const pendingMilestones = milestones
      .filter(m => !m.actual_date && m.planned_date)
      .sort((a, b) => new Date(a.planned_date!).getTime() - new Date(b.planned_date!).getTime());

    if (pendingMilestones.length > 0) {
      const next = pendingMilestones[0];
      return `${next.milestone_node} (${next.planned_date})`;
    }
    return '无待完成里程碑';
  };

  // 打开更新进展弹窗
  const openUpdateModal = (projectId: string) => {
    setUpdateProjectId(projectId);
    setUpdateText('');
    setShowUpdateModal(true);
  };

  // 保存进展更新
  const handleSaveUpdate = async () => {
    if (!updateText.trim()) {
      alert('请输入进展内容');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/progress-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: updateProjectId,
          updateText: updateText,
          updatePm: selectedPm // 使用当前选中的项目经理
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowUpdateModal(false);
        // 更新本地数据
        const newUpdate = result.data;
        setProgressUpdates(prev => ({
          ...prev,
          [updateProjectId]: [newUpdate, ...(prev[updateProjectId] || [])]
        }));
        alert('进展更新成功');
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      console.error('保存进展失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
      {/* 顶部搜索栏 - 仅管理员可见 */}
      {isAdmin && (
        <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <select
                value={selectedPm}
                onChange={(e) => setSelectedPm(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-sm w-64"
              >
                <option value="">选择项目经理...</option>
                {pmList.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {selectedPm && (
              <div className="bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-200">
                <span className="text-sm font-bold text-emerald-700">
                  当前查看: <span className="font-black">{selectedPm}</span> 的个人看板
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 项目经理用户直接显示自己的看板标题 */}
      {isPmRole && selectedPm && (
        <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-widest">
              {selectedPm} 的个人看板
            </h1>
            <div className="bg-indigo-100 px-4 py-1.5 rounded-full border border-indigo-200">
              <span className="text-sm font-bold text-indigo-700">项目经理专属视图</span>
            </div>
          </div>
        </div>
      )}

      {/* 管理员未选择项目经理时的提示 */}
      {!selectedPm && isAdmin && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-20 h-20 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="text-lg font-black text-slate-400 uppercase tracking-widest">请选择项目经理查看其个人看板</div>
          </div>
        </div>
      )}

      {/* 项目经理用户无权限时的提示 */}
      {isPmRole && !selectedPm && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-20 h-20 text-rose-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-lg font-black text-rose-400 uppercase tracking-widest">未找到匹配的项目经理数据</div>
            <div className="text-sm text-slate-500 mt-2">请确认您的账户姓名与项目经理姓名一致</div>
          </div>
        </div>
      )}

      {selectedPm && (
        <>
          {/* 项目概览 */}
          <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">项目概览</h2>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {/* 负责项目总数 */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">负责项目总数</div>
                <div className="text-3xl font-black text-slate-800 mb-4">{pmProjects.length}</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg">实施中 {statusDistribution.implementing}</span>
                  <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg">已验收 {statusDistribution.accepted}</span>
                  <span className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg">已延期 {statusDistribution.delayed}</span>
                  <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg">暂停 {statusDistribution.paused}</span>
                </div>
              </div>

              {/* 里程碑预警/已到期 - 可点击下钻 */}
              <div
                className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-indigo-300"
                onClick={() => openDrillDown('milestone')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">关键里程碑预警/已到期</div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-3xl font-black text-slate-800 mb-4">{milestoneWarnings.length}</div>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {milestoneWarnings.length === 0 ? (
                    <div className="text-sm text-slate-400 italic">无预警或已到期节点</div>
                  ) : (
                    milestoneWarnings.slice(0, 5).map((w, i) => (
                      <div key={i} className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        w.type === '预警' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {w.type === '预警' ? '⚠️' : '🔴'} {w.node} - {w.projectName}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 关键节点完成率 - 可点击下钻 */}
              <div
                className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-indigo-300"
                onClick={() => openDrillDown('completion')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">本月关键节点完成率</div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                {keyMilestoneCompletionRate === null ? (
                  <div className="text-xl font-black text-slate-400 italic">无关键节点</div>
                ) : (
                  <>
                    <div className="text-3xl font-black text-slate-800 mb-4">
                      {keyMilestoneCompletionRate.rate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-slate-600">
                      已完成 {keyMilestoneCompletionRate.completed} / 应完成 {keyMilestoneCompletionRate.total}
                    </div>
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          keyMilestoneCompletionRate.rate >= 80 ? 'bg-emerald-500' :
                          keyMilestoneCompletionRate.rate >= 50 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${keyMilestoneCompletionRate.rate}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>

              {/* 变更监控 - 可点击下钻 */}
              <div
                className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-indigo-300"
                onClick={() => openDrillDown('change')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">变更监控</div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-3xl font-black text-slate-800 mb-4">{projectChanges.length}</div>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {projectChanges.length === 0 ? (
                    <div className="text-sm text-slate-400 italic">无变更记录</div>
                  ) : (
                    projectChanges.slice(0, 5).map((c, i) => (
                      <div key={i} className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        c.type === '人员变更' ? 'bg-blue-100 text-blue-700' :
                        c.type === '预算变更' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {c.type} - {c.changeDate}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 项目列表 */}
          <div className="flex-1 overflow-auto custom-scrollbar px-8 py-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">项目列表</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-lg font-black text-slate-400 uppercase tracking-widest">加载项目数据中...</div>
              </div>
            ) : pmProjects.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-lg font-black text-slate-400 uppercase tracking-widest">该项目经理暂无负责的项目</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pmProjects.map(project => {
                  const health = calculateHealth(project);
                  const healthColors = {
                    red: 'bg-rose-100 text-rose-700 border-rose-200',
                    yellow: 'bg-amber-100 text-amber-700 border-amber-200',
                    green: 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  };
                  const healthIcons = {
                    red: '🔴',
                    yellow: '🟡',
                    green: '🟢'
                  };

                  const budgetUsed = project.budget?.budgetUsedAmount || 0;
                  const budgetTotal = project.budget?.totalBudget || 0;
                  const budgetRate = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

                  const latestUpdate = progressUpdates[project.id]?.[0];

                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                      onClick={() => onNavigateToProject(project.id)}
                    >
                      {/* 卡片头部 */}
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-black text-slate-800 truncate">{project.projectName}</div>
                          <div className="text-xs text-slate-500 mt-1">{project.projectCode}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                            project.status === '已验收' ? 'bg-emerald-100 text-emerald-700' :
                            project.status === '延期' ? 'bg-rose-100 text-rose-700' :
                            project.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {project.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${healthColors[health]}`}>
                            {healthIcons[health]} 健康度
                          </span>
                        </div>
                      </div>

                      {/* 卡片内容 */}
                      <div className="px-6 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">项目阶段:</span>
                          <span className="text-sm font-semibold text-slate-800">{project.phase || '未设置'}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">近期里程碑:</span>
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                            {getNextMilestone(project.id)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">预算使用率:</span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${
                              budgetRate > 100 ? 'text-rose-700' :
                              budgetRate > 80 ? 'text-amber-700' :
                              'text-slate-800'
                            }`}>
                              {budgetRate.toFixed(1)}%
                            </span>
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-full rounded-full ${
                                  budgetRate > 100 ? 'bg-rose-500' :
                                  budgetRate > 80 ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(budgetRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* 最新进展更新 */}
                        {latestUpdate && (
                          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                            <div className="text-xs font-bold text-indigo-600 mb-1">最新进展更新</div>
                            <div className="text-xs text-slate-600 mb-1">{formatDateTime(latestUpdate.updateTime)}</div>
                            <div className="text-sm text-slate-700 line-clamp-2">{latestUpdate.updateText}</div>
                          </div>
                        )}
                      </div>

                      {/* 卡片底部 */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openUpdateModal(project.id);
                          }}
                          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                        >
                          一键更新进展
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 更新进展弹窗 */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowUpdateModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800">更新项目进展</h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-8">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">进展内容</label>
                <textarea
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                  placeholder="请输入项目进展情况，如：本周完成了系统架构设计，下周计划进行详细方案评审..."
                />
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex justify-end space-x-4 bg-slate-50 shrink-0">
              <button onClick={() => setShowUpdateModal(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                取消
              </button>
              <button onClick={handleSaveUpdate} className="px-8 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all">
                保存进展
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下钻弹窗 */}
      {showDrillDownModal && drillDownType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowDrillDownModal(false)}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
            {/* 弹窗头部 */}
            <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-800">
                {drillDownType === 'milestone' && '关键里程碑预警/已到期详情'}
                {drillDownType === 'completion' && '本月关键节点完成情况'}
                {drillDownType === 'change' && (selectedChange ? '变更详情' : '变更记录')}
              </h3>
              <button
                onClick={() => {
                  if (drillDownType === 'change' && selectedChange) {
                    closeChangeDetail();
                  } else {
                    setShowDrillDownModal(false);
                  }
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* 里程碑预警详情 */}
              {drillDownType === 'milestone' && (
                <div>
                  {milestoneWarnings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">暂无预警或已到期的关键里程碑</div>
                  ) : (
                    <div className="space-y-3">
                      {milestoneWarnings.map((w, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border ${
                            w.type === '已到期' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                          } flex items-center justify-between`}
                        >
                          <div className="flex items-center space-x-4">
                            <span className={`text-2xl ${w.type === '已到期' ? '' : ''}`}>
                              {w.type === '已到期' ? '🔴' : '⚠️'}
                            </span>
                            <div>
                              <div className="font-bold text-slate-800">{w.node}</div>
                              <div className="text-sm text-slate-600">{w.projectName}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                              w.type === '已到期' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                            }`}>
                              {w.type}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">计划: {w.plannedDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 关键节点完成情况详情 */}
              {drillDownType === 'completion' && (
                <div>
                  {keyMilestoneCompletionRate === null ? (
                    <div className="text-center py-10 text-slate-400">本月无关键节点</div>
                  ) : (
                    <div>
                      {/* 统计概览 */}
                      <div className="bg-indigo-50 rounded-2xl p-6 mb-6 border border-indigo-100">
                        <div className="grid grid-cols-3 gap-6 text-center">
                          <div>
                            <div className="text-3xl font-black text-indigo-700">{keyMilestoneCompletionRate.rate.toFixed(1)}%</div>
                            <div className="text-sm text-slate-600 mt-1">完成率</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-emerald-700">{keyMilestoneCompletionRate.completed}</div>
                            <div className="text-sm text-slate-600 mt-1">已完成</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-slate-700">{keyMilestoneCompletionRate.total}</div>
                            <div className="text-sm text-slate-600 mt-1">应完成</div>
                          </div>
                        </div>
                      </div>

                      {/* 详细列表 */}
                      <div className="space-y-3">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">关键节点明细</div>
                        {pmProjects.map(project => {
                          const milestones = projectMilestones[project.id] || [];
                          const today = new Date();
                          const currentMonth = today.getMonth();
                          const currentYear = today.getFullYear();

                          const relevantMilestones = milestones.filter(m => {
                            if (!KEY_MILESTONES.includes(m.milestone_node)) return false;
                            if (!m.planned_date) return false;
                            const plannedDate = new Date(m.planned_date);
                            return plannedDate.getMonth() === currentMonth && plannedDate.getFullYear() === currentYear;
                          });

                          if (relevantMilestones.length === 0) return null;

                          return (
                            <div key={project.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                              <div className="font-bold text-slate-800 mb-2">{project.projectName}</div>
                              <div className="space-y-2">
                                {relevantMilestones.map((m, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700">{m.milestone_node}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      m.actual_date ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {m.actual_date ? `已完成 (${m.actual_date})` : '未完成'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 变更记录详情 */}
              {drillDownType === 'change' && (
                <div>
                  {projectChanges.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">暂无变更记录</div>
                  ) : selectedChange ? (
                    /* 变更详情页 */
                    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                      {/* 返回按钮 */}
                      <button
                        onClick={closeChangeDetail}
                        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-bold">返回变更列表</span>
                      </button>

                      {/* 变更详情卡片 */}
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6 mb-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${
                            selectedChange.type === '人员变更' ? 'bg-blue-200 text-blue-800' :
                            selectedChange.type === '预算变更' ? 'bg-amber-200 text-amber-800' :
                            'bg-purple-200 text-purple-800'
                          }`}>
                            {selectedChange.type}
                          </span>
                          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full">
                            第 {selectedChange.changeCount} 次变更
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs font-bold text-slate-500 mb-1">项目名称</div>
                            <div className="text-base font-bold text-slate-800">{selectedChange.projectName || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-500 mb-1">变更日期</div>
                            <div className="text-base font-bold text-slate-800">{selectedChange.changeDate}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-500 mb-1">原因分类</div>
                            <div className="text-base font-bold text-slate-800">{selectedChange.reasonCategory}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-500 mb-1">影响绩效</div>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              selectedChange.impactsPerformance ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {selectedChange.impactsPerformance ? '是' : '否'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 变更内容 */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">变更内容</div>
                        <div className="text-sm text-slate-700 leading-relaxed">{selectedChange.content || '未填写'}</div>
                      </div>

                      {/* 变更原因 */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">变更原因</div>
                        <div className="text-sm text-slate-700 leading-relaxed italic">{selectedChange.reason || '未填写'}</div>
                      </div>

                      {/* 变更前后对比（如果有） */}
                      {(selectedChange.oldProjectManager || selectedChange.oldBudgetTotal || selectedChange.oldProjectCycle) && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">变更前后对比</div>
                          <div className="flex items-center space-x-4">
                            <div className="flex-1 bg-rose-50 rounded-xl p-4 border border-rose-100">
                              <div className="text-xs font-bold text-rose-500 mb-1">变更前</div>
                              <div className="text-sm font-bold text-rose-700">
                                {selectedChange.type === '人员变更' ? (selectedChange.oldProjectManager || '-') :
                                 selectedChange.type === '预算变更' ? (selectedChange.oldBudgetTotal ? `¥${(selectedChange.oldBudgetTotal / 10000).toFixed(2)}万` : '-') :
                                 (selectedChange.oldProjectCycle || '-')}
                              </div>
                            </div>
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <div className="flex-1 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                              <div className="text-xs font-bold text-emerald-500 mb-1">变更后</div>
                              <div className="text-sm font-bold text-emerald-700">
                                {selectedChange.type === '人员变更' ? (selectedChange.newProjectManager || '-') :
                                 selectedChange.type === '预算变更' ? (selectedChange.newBudgetTotal ? `¥${(selectedChange.newBudgetTotal / 10000).toFixed(2)}万` : '-') :
                                 (selectedChange.newProjectCycle || '-')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 变更概要卡片列表 */
                    <div className="space-y-3">
                      {projectChanges.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedChange(c)}
                          className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                c.type === '人员变更' ? 'bg-blue-100' :
                                c.type === '预算变更' ? 'bg-amber-100' :
                                'bg-purple-100'
                              }`}>
                                <svg className={`w-6 h-6 ${
                                  c.type === '人员变更' ? 'text-blue-600' :
                                  c.type === '预算变更' ? 'text-amber-600' :
                                  'text-purple-600'
                                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  {c.type === '人员变更' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  ) : c.type === '预算变更' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  )}
                                </svg>
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                  {c.projectName || '-'}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">{c.changeDate}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${
                                c.type === '人员变更' ? 'bg-blue-100 text-blue-700' :
                                c.type === '预算变更' ? 'bg-amber-100 text-amber-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {c.type}
                              </span>
                              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                第{c.changeCount}次
                              </span>
                              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="px-8 py-4 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
              <button
                onClick={() => {
                  if (drillDownType === 'change' && selectedChange) {
                    closeChangeDetail();
                  } else {
                    setShowDrillDownModal(false);
                  }
                }}
                className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all"
              >
                {drillDownType === 'change' && selectedChange ? '返回列表' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}