import React, { useState, useMemo } from 'react';
import { Project, MILESTONE_NODE_LABELS, MilestoneNode, MILESTONE_NODE_OPTIONS, MilestoneDateInfo, ProjectStatus, PRIMARY_REGIONS, CRITICAL_MILESTONES } from '../types';
import API_BASE_URL from '../config/api.config';

interface ProgressMonitorPageProps {
  projects: Project[];
  onNavigateToProject: (id: string) => void;
  onUpdateMilestoneData?: (projectId: string, milestoneNodeData: Record<string, MilestoneDateInfo>) => void;
}

type TabType = 'swimlane' | 'progress';

export default function ProgressMonitorPage({ projects, onNavigateToProject, onUpdateMilestoneData }: ProgressMonitorPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('swimlane');
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // 编辑相关状态
  const [editingModal, setEditingModal] = useState<{ project: Project; node: typeof MILESTONE_NODE_OPTIONS[0] } | null>(null);
  const [editData, setEditData] = useState<MilestoneDateInfo>({ plannedDate: '', actualDate: '' });

  // 隐藏已验收列
  const [hideAcceptedColumn, setHideAcceptedColumn] = useState<boolean>(false);

  // 基础筛选：区域 + 项目名称搜索
  const baseFilteredProjects = useMemo(() => {
    return projects.filter(project => {
      // 区域筛选
      if (regionFilter !== 'all') {
        if (regionFilter === '东区' && !project.region.includes('东区')) return false;
        if (regionFilter === '南区' && !project.region.includes('南区')) return false;
        if (regionFilter === '西区' && !project.region.includes('西区')) return false;
        if (regionFilter === '北区' && !project.region.includes('北区')) return false;
        if (regionFilter === '创景可视' && !project.region.includes('创景可视')) return false;
      }
      // 项目名称搜索
      if (searchQuery && !project.projectName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [projects, regionFilter, searchQuery]);

  // 按里程碑节点分组项目（泳道视图）
  const projectsByMilestone = useMemo(() => {
    const result: Record<string, Project[]> = {};

    MILESTONE_NODE_OPTIONS.forEach(node => {
      result[node.label] = [];
    });

    baseFilteredProjects.forEach(project => {
      const milestoneNode = project.milestoneNode;
      if (milestoneNode && MILESTONE_NODE_LABELS[milestoneNode]) {
        const label = MILESTONE_NODE_LABELS[milestoneNode];
        result[label].push(project);
      }
    });

    return result;
  }, [baseFilteredProjects]);

  // 过滤项目 (针对进度视图) - 已验收项目默认放在最下面
  const progressFilteredProjects = useMemo(() => {
    let filtered = baseFilteredProjects;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (statusFilter === 'ongoing') return p.status === ProjectStatus.Ongoing || p.status === ProjectStatus.Delayed;
        if (statusFilter === 'accepted') return p.status === ProjectStatus.Accepted;
        return true;
      });
    }
    // 排序：已验收项目放在最后
    return [...filtered].sort((a, b) => {
      const aAccepted = a.status === ProjectStatus.Accepted;
      const bAccepted = b.status === ProjectStatus.Accepted;
      if (aAccepted && !bAccepted) return 1;
      if (!aAccepted && bAccepted) return -1;
      return 0;
    });
  }, [baseFilteredProjects, statusFilter]);

  // 本月里程碑计划提醒 - 下一个里程碑计划完成时间在本月的项目
  const projectsWithMonthlyMilestone = useMemo(() => {
    // 获取当前月份（格式：YYYY-MM）
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 只统计正在进行和延期状态的项目
    const ongoingProjects = progressFilteredProjects.filter(p =>
      p.status === ProjectStatus.Ongoing || p.status === ProjectStatus.Delayed
    );

    return ongoingProjects.filter(project => {
      // 获取当前里程碑节点位置
      const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
      // 如果没有里程碑节点或已经是最后一个节点（已验收），则跳过
      if (currentIndex === -1 || currentIndex >= MILESTONE_NODE_OPTIONS.length - 1) return false;

      // 获取下一个里程碑节点
      const nextNode = MILESTONE_NODE_OPTIONS[currentIndex + 1];
      // 获取下一个节点的计划完成时间
      const plannedDate = project.milestoneNodeData?.[nextNode.value]?.plannedDate;

      // 如果没有计划时间，跳过
      if (!plannedDate) return false;

      // 判断计划时间是否在本月
      return plannedDate.startsWith(currentMonth);
    }).map(project => {
      // 添加下一个节点信息便于展示
      const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
      const nextNode = MILESTONE_NODE_OPTIONS[currentIndex + 1];
      const plannedDate = project.milestoneNodeData?.[nextNode.value]?.plannedDate || '';
      return {
        project,
        nextNodeLabel: nextNode.label,
        plannedDate
      };
    });
  }, [progressFilteredProjects]);

  const handleOpenEdit = async (e: React.MouseEvent, project: Project, node: typeof MILESTONE_NODE_OPTIONS[0]) => {
    e.stopPropagation();

    // 先尝试从项目中获取现有数据
    let existingData = project.milestoneNodeData?.[node.value] || { plannedDate: '', actualDate: '' };

    // 如果项目中没有数据，尝试从后端 API 获取
    if (!existingData.plannedDate && !existingData.actualDate) {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/milestones/projects/${project.id}/milestones`, {
          headers
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const milestoneData = result.data.find((m: any) => m.milestone_node === node.label);
            if (milestoneData) {
              existingData = {
                plannedDate: milestoneData.planned_date || '',
                actualDate: milestoneData.actual_date || ''
              };
            }
          }
        }
      } catch (error) {
        console.error('获取里程碑数据失败:', error);
      }
    }

    setEditingModal({ project, node });
    setEditData(existingData);
  };

  const handleSaveEdit = async () => {
    if (!editingModal) return;

    try {
      // 获取项目的现有里程碑数据
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 先获取项目现有的所有里程碑数据
      const milestonesResponse = await fetch(`${API_BASE_URL}/milestones/projects/${editingModal.project.id}/milestones`, {
        headers
      });

      if (!milestonesResponse.ok) {
        throw new Error('获取里程碑数据失败');
      }

      const milestonesResult = await milestonesResponse.json();

      // 构建要保存的里程碑数组
      const currentNodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === editingModal.project.milestoneNode);
      const milestonesToSave = MILESTONE_NODE_OPTIONS.map(node => {
        // 查找现有里程碑数据
        const existing = milestonesResult.data?.find((m: any) => m.milestone_node === node.label);

        // 判断该节点是否在项目当前节点之后（后续节点）
        const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === node.value);
        const isFutureNode = nodeIndex > currentNodeIndex;

        // 如果是当前编辑的节点，使用编辑的数据
        let plannedDate, actualDate;
        if (node.value === editingModal.node.value) {
          plannedDate = editData.plannedDate || null;
          // 后续节点不允许有实际完成时间
          actualDate = isFutureNode ? null : (editData.actualDate || null);
        } else {
          plannedDate = existing?.planned_date || null;
          // 后续节点不允许有实际完成时间
          actualDate = isFutureNode ? null : (existing?.actual_date || null);
        }

        return {
          milestone_node: node.label,
          planned_date: plannedDate,
          actual_date: actualDate
        };
      });

      // 保存里程碑数据
      const saveResponse = await fetch(`${API_BASE_URL}/milestones/projects/${editingModal.project.id}/milestones`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ milestones: milestonesToSave })
      });

      if (!saveResponse.ok) {
        throw new Error('保存里程碑数据失败');
      }

      const saveResult = await saveResponse.json();
      if (!saveResult.success) {
        throw new Error(saveResult.error || '保存里程碑数据失败');
      }

      // 保存成功后关闭弹窗
      setEditingModal(null);

      // 更新前端状态中的里程碑数据
      if (onUpdateMilestoneData) {
        const updatedMilestoneNodeData: Record<string, MilestoneDateInfo> = {};
        milestonesToSave.forEach((m: any) => {
          // 找到对应的枚举值
          const option = MILESTONE_NODE_OPTIONS.find(opt => opt.label === m.milestone_node);
          if (option) {
            updatedMilestoneNodeData[option.value] = {
              plannedDate: m.planned_date || '',
              actualDate: m.actual_date || ''
            };
          }
        });

        // 直接更新前端状态，不需要调用项目更新 API
        onUpdateMilestoneData(editingModal.project.id, updatedMilestoneNodeData);
      }
    } catch (error) {
      console.error('保存里程碑失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 判断项目是否有质量风险
  const hasQualityRisk = (project: Project): boolean => {
    const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
    if (currentIndex === -1) return false;

    // 检查重要节点是否缺少实际完成时间
    const missingCriticalNodes = CRITICAL_MILESTONES.some(milestoneNode => {
      const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === milestoneNode);
      if (nodeIndex < currentIndex) {
        const nodeData = project.milestoneNodeData?.[milestoneNode];
        return !nodeData?.actualDate;
      }
      return false;
    });

    // 检查当前节点的计划完成时间是否超过一个月
    const currentNodeData = project.milestoneNode ? project.milestoneNodeData?.[project.milestoneNode] : undefined;
    let overdue = false;
    if (currentNodeData?.plannedDate) {
      const plannedDate = new Date(currentNodeData.plannedDate);
      const today = new Date();
      const diffTime = today.getTime() - plannedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      // 超过30天（一个月）算超期
      overdue = diffDays > 30;
    }

    return missingCriticalNodes || overdue;
  };

  // 获取缺少实际完成时间的重要节点索引
  const getMissingCriticalNodes = (project: Project): number[] => {
    const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
    if (currentIndex === -1) return [];

    return CRITICAL_MILESTONES
      .map(milestoneNode => {
        const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === milestoneNode);
        const nodeData = project.milestoneNodeData?.[milestoneNode];
        if (nodeIndex < currentIndex && !nodeData?.actualDate) {
          return nodeIndex;
        }
        return -1;
      })
      .filter(idx => idx !== -1);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 标签页切换 */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab('swimlane')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'swimlane'
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          里程碑节点视图
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'progress'
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          项目进度视图
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 全局过滤器 */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6 shrink-0">
          {/* 区域筛选 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-500">区域:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部区域</option>
              <option value="东区">东区</option>
              <option value="南区">南区</option>
              <option value="西区">西区</option>
              <option value="北区">北区</option>
              <option value="创景可视">创景可视</option>
            </select>
          </div>
          {/* 项目名称搜索 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-500">项目名称:</span>
            <input
              type="text"
              placeholder="搜索项目名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          {/* 隐藏已验收列按钮 */}
          </div>

        {activeTab === 'swimlane' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="inline-flex h-full min-w-full">
              {MILESTONE_NODE_OPTIONS.filter(node => !hideAcceptedColumn || node.value !== MilestoneNode.Accepted).map(node => {
                const nodeProjects = projectsByMilestone[node.label];
                const isSelected = selectedMilestone === node.value;
                const isDimmed = selectedMilestone !== null && !isSelected;

                return (
                  <div
                    key={node.value}
                    onClick={() => setSelectedMilestone(isSelected ? null : node.value)}
                    className={`flex-shrink-0 w-80 border-r border-slate-200 flex flex-col h-full cursor-pointer ${
                      isDimmed ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    {/* 列标题 */}
                    <div className="bg-slate-100 px-4 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0 hover:bg-slate-200">
                      <span className="font-bold text-slate-800 text-base">{node.label}</span>
                      <span className="text-sm text-slate-600 bg-slate-200 px-3 py-1 rounded-full font-medium">
                        {nodeProjects.length} 个项目
                      </span>
                    </div>
                    {/* 列内容 */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {nodeProjects.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-8">暂无项目</div>
                      ) : (
                        <div className="space-y-2">
                          {nodeProjects.map(project => (
                            <div
                              key={project.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToProject(project.id);
                              }}
                              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md cursor-pointer"
                            >
                              <div className="text-sm font-semibold text-slate-900 mb-3 truncate" title={project.projectName}>
                                {project.projectName}
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">项目编号</span>
                                  <span className="text-slate-700 font-medium">{project.projectCode}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">区域</span>
                                  <span className="text-slate-700 font-medium">{project.region}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500">状态</span>
                                  <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${
                                    project.status === '已验收' ? 'bg-green-100 text-green-700' :
                                    project.status === '延期' ? 'bg-red-100 text-red-700' :
                                    project.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {project.status}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">进度</span>
                                  <span className="text-slate-700 font-medium">{project.execution?.progress || 0}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
            {/* 过滤器 */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-500 uppercase tracking-widest mr-2">项目状态筛选:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    全部项目
                  </button>
                  <button
                    onClick={() => setStatusFilter('ongoing')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      statusFilter === 'ongoing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    进行中
                  </button>
                  <button
                    onClick={() => setStatusFilter('accepted')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      statusFilter === 'accepted' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    已验收
                  </button>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400">
                当前显示: <span className="text-indigo-600">{progressFilteredProjects.length}</span> / {projects.length} 个项目
              </div>
            </div>

            {/* 本月里程碑计划提醒卡片 */}
            {projectsWithMonthlyMilestone.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl mx-6 mt-4 mb-2 p-4 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-base font-bold text-amber-800">本月里程碑计划提醒</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                    {projectsWithMonthlyMilestone.length} 个项目
                  </span>
                </div>
                <div className="bg-white/80 rounded-lg p-3 divide-y divide-amber-100">
                  {projectsWithMonthlyMilestone.map(({ project, nextNodeLabel, plannedDate }) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between py-2 hover:bg-amber-50/50 cursor-pointer transition-colors rounded"
                      onClick={() => onNavigateToProject(project.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={project.projectName}>
                          {project.projectName}
                        </span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="text-sm font-bold text-amber-700">{nextNodeLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">计划完成:</span>
                        <span className="text-sm font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                          {plannedDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-amber-500 mt-2 text-center">
                  点击项目名称可查看详情
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {progressFilteredProjects.map(project => {
                const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
                const missingCriticalNodes = getMissingCriticalNodes(project);
                const projectHasQualityRisk = hasQualityRisk(project);

                const statusColors =
                  project.status === '已验收' ? { track: 'from-violet-500 to-indigo-600', dot: 'bg-indigo-600', border: 'border-indigo-600', ring: 'ring-indigo-50' } :
                  project.status === '暂停' ? { track: 'from-slate-400 to-slate-500', dot: 'bg-slate-500', border: 'border-slate-500', ring: 'ring-slate-50' } :
                  { track: 'from-emerald-500 to-green-600', dot: 'bg-emerald-600', border: 'border-emerald-600', ring: 'ring-emerald-50' };

                return (
                  <div
                    key={project.id}
                    onClick={() => onNavigateToProject(project.id)}
                    className="bg-white rounded-lg p-4 hover:border-indigo-400 hover:shadow-md cursor-pointer border border-slate-200 transition-all"
                  >
                    {/* 项目基本信息 */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-slate-900 truncate" title={project.projectName}>
                          {project.projectName}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {project.projectCode} · {project.region} · {project.status}
                        </div>
                      </div>
                    </div>
                    {/* 里程碑"站台"进度条 */}
                    <div className="mt-12 mb-12 px-2">
                      <div className="relative">
                        {/* 轨道线 - 背景 */}
                        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-100 rounded-full transform -translate-y-1/2 overflow-hidden">
                          {/* 轨道线 - 已行驶进度（针对状态着色） */}
                          <div
                            className={`h-full bg-gradient-to-r ${statusColors.track} rounded-full`}
                            style={{ width: `${(currentIndex / (MILESTONE_NODE_OPTIONS.length - 1)) * 100}%` }}
                          />
                        </div>

                        {/* 站台节点 */}
                        <div className="relative flex justify-between items-center">
                          {MILESTONE_NODE_OPTIONS.map((node, idx) => {
                            const isCompleted = idx < currentIndex;
                            const isCurrent = idx === currentIndex;
                            const isCritical = CRITICAL_MILESTONES.includes(node.value as MilestoneNode);
                            const isMissingActual = missingCriticalNodes.includes(idx);

                            const nodeData = project.milestoneNodeData?.[node.value];
                            const hasDates = nodeData?.plannedDate || nodeData?.actualDate;

                            return (
                              <div key={node.value} className="flex flex-col items-center group relative">
                                 {/* 站台圆点 - 点击编辑 */}
                                 <div
                                  onClick={(e) => handleOpenEdit(e, project, node)}
                                  className={`w-4 h-4 rounded-full border-2 z-10 relative flex items-center justify-center cursor-pointer hover:scale-125 ${
                                    isCurrent ? `bg-white ${statusColors.border} scale-125 shadow-lg shadow-indigo-200 ring-4 ${statusColors.ring}` :
                                    isCompleted ? `${statusColors.dot} ${statusColors.border}` :
                                    'bg-white border-slate-300 hover:border-slate-400'
                                  }`}
                                 >
                                   {/* 当前位置的实心点 */}
                                   {isCurrent && (
                                     <>
                                       <div className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                                       <div className={`absolute -top-1 w-full h-full rounded-full ${statusColors.dot} opacity-20`} />
                                     </>
                                   )}
                                   {/* 已完成的打钩标识 */}
                                   {isCompleted && !isMissingActual && (
                                     <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                     </svg>
                                   )}
                                   {/* 缺失实际完成时间的红色标记 */}
                                   {isMissingActual && (
                                     <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                     </svg>
                                   )}

                                   {/* 鼠标悬浮显示的日期 Tooltip */}
                                   {hasDates && (
                                     <div className="absolute bottom-6 hidden group-hover:flex flex-col items-center z-50">
                                       <div className="bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap leading-tight">
                                         {nodeData.plannedDate && <div className="mb-0.5">计划: {nodeData.plannedDate}</div>}
                                         {nodeData.actualDate && <div>实际: {nodeData.actualDate}</div>}
                                       </div>
                                       <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800"></div>
                                     </div>
                                   )}
                                 </div>

                                 {/* 站名标签 - 重要节点加粗 */}
                                 <div
                                  className={`absolute whitespace-nowrap text-sm ${
                                    idx % 2 === 0 ? '-bottom-10' : '-top-10'
                                  } ${
                                    isCurrent ? `font-black text-slate-900 bg-white shadow-md px-2 py-1 rounded-md border-2 ${statusColors.border} -translate-y-1` :
                                    isCompleted ? (isCritical ? 'font-black text-slate-700' : 'font-bold text-slate-700') :
                                    (isCritical ? 'font-black text-slate-400' : 'text-slate-400')
                                  }`}
                                 >
                                   {node.label}
                                 </div>

                                 {/* "缺"字标记 */}
                                 {isMissingActual && (
                                   <div className="absolute -bottom-4 left-1/2 transform translate-x-1/2 text-rose-600 text-xs font-black">
                                     缺
                                   </div>
                                 )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {progressFilteredProjects.length === 0 && (
                <div className="text-center text-slate-400 py-12 bg-white rounded-xl border border-slate-100">暂无符合筛选条件的项</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingModal(null)}></div>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">编辑节点时间</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">项目：{editingModal.project.projectName} / 节点：{editingModal.node.label}</p>

            {/* 判断当前编辑的节点是否在项目当前节点之后 */}
            {(() => {
              const currentNodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === editingModal.project.milestoneNode);
              const editingNodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === editingModal.node.value);
              const isFutureNode = editingNodeIndex > currentNodeIndex;

              return (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">计划完成时间</label>
                    <input
                      type="date"
                      value={editData.plannedDate || ''}
                      onChange={(e) => setEditData({ ...editData, plannedDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>

                  {/* 只显示当前节点及之前节点的"实际完成时间"字段 */}
                  {!isFutureNode && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">实际完成时间</label>
                      <input
                        type="date"
                        value={editData.actualDate || ''}
                        onChange={(e) => setEditData({ ...editData, actualDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  )}

                  {/* 提示信息：后续节点无法填写实际完成时间 */}
                  {isFutureNode && (
                    <div className="bg-slate-100 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-slate-500">
                        该节点尚未到达，无法填写实际完成时间
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex space-x-3 mt-8">
              <button 
                onClick={() => setEditingModal(null)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-500 text-sm font-black uppercase rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white text-sm font-black uppercase rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                确定保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}