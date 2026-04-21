import React, { useState, useMemo, useEffect } from 'react';
import { Project, ProjectStatus, PRIMARY_REGIONS, REGION_MAPPING, MILESTONE_NODE_OPTIONS, MilestoneNode, CRITICAL_MILESTONES } from '../types';
import ProjectManagerDataService, { ManagerLevel } from '../services/ProjectManagerDataService';
import { getUserDataScope, hasRole } from '../services/AuthService';

type RiskType = 'progress' | 'cost' | 'quality';

interface ProjectRisk {
  project: Project;
  riskTypes: RiskType[];
}

// 计算延期月数（与风险预警页面一致）
const calculateDelayMonths = (plannedEndDate: string): number => {
  if (!plannedEndDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(plannedEndDate);
  planned.setHours(0, 0, 0, 0);

  if (today <= planned) return 0;

  const diffTime = today.getTime() - planned.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 30);
};

// 计算工时偏差率
const calculateHourDeviationRate = (planned: number, actual: number): number => {
  if (!planned || planned === 0) return 0;
  return ((actual - planned) / planned) * 100;
};

// 分析项目风险（与风险预警页面逻辑一致）
const analyzeRisks = (project: Project): ProjectRisk => {
  const riskTypes: RiskType[] = [];

  // 进度风险：延期≥1个月且状态为"延期"，或状态为"暂停"
  const delayMonths = calculateDelayMonths(project.timeline?.plannedEndDate || '');
  if (delayMonths >= 1 && project.status === ProjectStatus.Delayed) {
    riskTypes.push('progress');
  }
  if (project.status === ProjectStatus.Paused) {
    riskTypes.push('progress');
  }

  // 成本风险：毛利率<0，预算使用超支，工时偏差率>20%
  const marginRate = parseFloat(project.marginRate || '0') || 0;
  if (marginRate < 0) {
    riskTypes.push('cost');
  }

  const totalBudget = project.budget?.totalBudget || 0;
  const usedBudget = project.budget?.budgetUsedAmount || 0;
  if (totalBudget > 0 && usedBudget > totalBudget) {
    riskTypes.push('cost');
  }

  const plannedHours = project.manHours?.plannedTotal || 0;
  const actualHours = project.manHours?.pmoAnnualTotal || 0;
  const hourDeviationRate = calculateHourDeviationRate(plannedHours, actualHours);
  if (hourDeviationRate > 20) {
    riskTypes.push('cost');
  }

  // 质量风险：重要节点缺失实际完成时间，或当前节点超期一个月以上
  const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
  let qualityRiskFound = false;

  CRITICAL_MILESTONES.forEach(milestoneNode => {
    const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === milestoneNode);
    if (nodeIndex < currentIndex) {
      const nodeData = project.milestoneNodeData?.[milestoneNode];
      if (!nodeData?.actualDate) {
        if (!qualityRiskFound) {
          riskTypes.push('quality');
          qualityRiskFound = true;
        }
      }
    }
  });

  // 检查当前节点的计划完成时间是否超过一个月
  const currentNodeData = project.milestoneNode ? project.milestoneNodeData?.[project.milestoneNode] : undefined;
  if (currentNodeData?.plannedDate && !qualityRiskFound) {
    const plannedDate = new Date(currentNodeData.plannedDate);
    const today = new Date();
    const diffTime = today.getTime() - plannedDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      riskTypes.push('quality');
    }
  }

  return { project, riskTypes };
};

interface ProjectManagerProfileProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
  isAdmin: boolean;
}

interface ManagerData {
  name: string;
  projects: Project[];
  totalProjects: number;
  acceptedCount: number;
  ongoingCount: number;
  riskCount: number;
  delayedCount: number;
  pausedCount: number;
  mainIndustry: string;
  highlightCount: number;      // 亮点工程数量
  benchmarkCount: number;      // 标杆项目数量
  majorProjectCount: number;   // 重大项目数量
  priorityProjectCount: number; // 重点项目数量
  // 新增字段
  level: ManagerLevel;
  score: number;
}

const ProjectManagerProfilePage: React.FC<ProjectManagerProfileProps> = ({
  projects,
  onNavigateToProject,
  isAdmin,
}) => {
  // 区域总监权限相关
  const isRegionalDirector = hasRole('regional_director');
  const dataScope = getUserDataScope();
  const userRegion = dataScope.scope === 'region' ? dataScope.region : null;

  // 筛选状态
  const [searchName, setSearchName] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>(isRegionalDirector && userRegion ? userRegion : '全部');
  const [selectedLevel, setSelectedLevel] = useState<string>('全部');
  const [selectedManager, setSelectedManager] = useState<ManagerData | null>(null);

  // 编辑状态
  const [editingManager, setEditingManager] = useState<ManagerData | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editLevel, setEditLevel] = useState<ManagerLevel>(ManagerLevel.Junior);
  const [isSaving, setIsSaving] = useState(false);

  // 项目经理数据映射
  const [managerDataMap, setManagerDataMap] = useState<Map<string, { level: ManagerLevel; score: number }>>(new Map());

  // 加载项目经理数据
  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
    const result = await ProjectManagerDataService.fetchAllManagers();
    if (result.success) {
      const map = new Map<string, { level: ManagerLevel; score: number }>();
      result.data.forEach(m => {
        map.set(m.name, { level: m.level, score: m.score });
      });
      setManagerDataMap(map);
    }
  };

  // 判断是否为重点/重大项目
  const isMajorProject = (project: Project): boolean => {
    return project.level === '核心项目（A类项目）' || project.level === '重大项目（B类项目）';
  };

  // 判断是否为重点项目
  const isPriorityProject = (project: Project): boolean => {
    return project.level === '重点项目（C类项目）';
  };

  // 等级颜色映射
  const getLevelColor = (level: ManagerLevel): string => {
    switch (level) {
      case ManagerLevel.Benchmark:
        return 'bg-rose-500 text-white';
      case ManagerLevel.Senior:
        return 'bg-purple-500 text-white';
      case ManagerLevel.Intermediate:
        return 'bg-blue-500 text-white';
      case ManagerLevel.Junior:
      default:
        return 'bg-slate-400 text-white';
    }
  };

  // 评分颜色映射
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  // 按项目经理分组数据
  const managerData = useMemo(() => {
    // 先按区域总监权限过滤项目
    let filteredProjects = projects;
    if (isRegionalDirector && userRegion) {
      filteredProjects = projects.filter(p => {
        const projectRegion = REGION_MAPPING[p.region] || p.region;
        return projectRegion === userRegion || projectRegion.includes(userRegion) || userRegion.includes(projectRegion);
      });
    }

    // 按项目经理分组
    const pmGroup = filteredProjects.reduce((acc, p) => {
      const pm = p.members.projectManager;
      if (!pm) return acc;
      if (!acc[pm]) acc[pm] = [];
      acc[pm].push(p);
      return acc;
    }, {} as Record<string, Project[]>);

    // 构建每个经理的数据
    return (Object.entries(pmGroup) as [string, Project[]][])
      .map(([name, projectList]) => {
        // 按区域筛选
        const filteredProjects = selectedRegion === '全部'
          ? projectList
          : projectList.filter(p => {
              const region = REGION_MAPPING[p.region] || p.region;
              return region === selectedRegion;
            });

        const acceptedCount = filteredProjects.filter(p => p.status === ProjectStatus.Accepted).length;
        const ongoingCount = filteredProjects.filter(p => p.status === ProjectStatus.Ongoing).length;
        const delayedCount = filteredProjects.filter(p => p.status === ProjectStatus.Delayed).length;
        const pausedCount = filteredProjects.filter(p => p.status === ProjectStatus.Paused).length;

        // 使用风险预警页面的逻辑计算风险项目数量
        const riskCount = filteredProjects.filter(p => analyzeRisks(p).riskTypes.length > 0).length;

        // 找出主要行业（出现最多的）
        const industryCount: Record<string, number> = {};
        filteredProjects.forEach(p => {
          if (p.industry) {
            industryCount[p.industry] = (industryCount[p.industry] || 0) + 1;
          }
        });
        const mainIndustry = Object.entries(industryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        // 统计亮点/标杆/重点/重大项目数量
        const highlightCount = filteredProjects.filter(p => p.isHighlight).length;
        const benchmarkCount = filteredProjects.filter(p => p.isBenchmark).length;
        const majorProjectCount = filteredProjects.filter(p => isMajorProject(p)).length;
        const priorityProjectCount = filteredProjects.filter(p => isPriorityProject(p)).length;

        // 获取等级和评分
        const managerInfo = managerDataMap.get(name) || { level: ManagerLevel.Junior, score: 0 };

        return {
          name,
          projects: filteredProjects,
          totalProjects: filteredProjects.length,
          acceptedCount,
          ongoingCount,
          riskCount,
          delayedCount,
          pausedCount,
          mainIndustry,
          highlightCount,
          benchmarkCount,
          majorProjectCount,
          priorityProjectCount,
          level: managerInfo.level,
          score: managerInfo.score,
        } as ManagerData;
      })
      .filter(m => m.totalProjects > 0)
      .sort((a, b) => b.totalProjects - a.totalProjects);
  }, [projects, selectedRegion, managerDataMap, isRegionalDirector, userRegion]);

  // 按名称和等级筛选
  const filteredManagers = useMemo(() => {
    let result = managerData;

    if (searchName.trim()) {
      const searchTerm = searchName.trim().toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(searchTerm));
    }

    if (selectedLevel !== '全部') {
      result = result.filter(m => m.level === selectedLevel);
    }

    return result;
  }, [managerData, searchName, selectedLevel]);

  // 处理编辑
  const handleEdit = (manager: ManagerData) => {
    setEditingManager(manager);
    setEditScore(manager.score);
    setEditLevel(manager.level);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!editingManager) return;

    setIsSaving(true);
    const result = await ProjectManagerDataService.saveManager({
      name: editingManager.name,
      level: editLevel,
      score: editScore
    });
    setIsSaving(false);

    if (result.success) {
      // 更新本地数据
      setManagerDataMap(prev => {
        const newMap = new Map(prev);
        newMap.set(editingManager.name, { level: editLevel, score: editScore });
        return newMap;
      });
      setEditingManager(null);
    } else {
      alert(result.error || '保存失败');
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingManager(null);
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex-wrap">
        {/* 区域筛选 - 区域总监显示静态标签 */}
        {isRegionalDirector && userRegion ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500">区域:</span>
            <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="text-sm font-bold text-indigo-700">{userRegion}</span>
            </div>
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-500">区域:</span>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="全部">全部</option>
            {PRIMARY_REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
        )}

        {/* 等级筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-500">等级:</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="全部">全部</option>
            <option value={ManagerLevel.Benchmark}>标杆</option>
            <option value={ManagerLevel.Senior}>高级</option>
            <option value={ManagerLevel.Intermediate}>中级</option>
            <option value={ManagerLevel.Junior}>初级</option>
          </select>
        </div>

        {/* 姓名搜索 */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm font-bold text-slate-500">姓名:</span>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="请输入项目经理姓名..."
            className="flex-1 px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-6 text-sm font-bold text-slate-500">
          <span>经理数: {filteredManagers.length}</span>
          <span>项目总数: {filteredManagers.reduce((sum, m) => sum + m.totalProjects, 0)}</span>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)]">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">项目经理</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">项目经理等级</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">项目经理评分</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">项目总数</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">进行中</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">已验收</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">风险项目</th>
              <th className="px-4 py-3 text-[18px] font-black text-slate-600 uppercase tracking-wider text-center">主要行业</th>
              {isAdmin && (
                <th className="px-4 py-3 text-[18px] font-black text-indigo-600 uppercase tracking-wider text-center">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredManagers.map((manager) => (
              <tr
                key={manager.name}
                onClick={() => setSelectedManager(manager)}
                className="hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm font-bold text-slate-800 text-center">{manager.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(manager.level)}`}>
                    {manager.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-black ${getScoreColor(manager.score)}`}>
                    {manager.score}分
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-black text-slate-600 text-center">{manager.totalProjects}</td>
                <td className="px-4 py-3 text-sm font-black text-blue-600 text-center">{manager.ongoingCount}</td>
                <td className="px-4 py-3 text-sm font-black text-emerald-600 text-center">{manager.acceptedCount}</td>
                <td className="px-4 py-3 text-sm font-black text-rose-600 text-center">{manager.riskCount}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-600 text-center">{manager.mainIndustry}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(manager);
                      }}
                      className="px-3 py-1 text-sm font-bold rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                    >
                      编辑
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 无数据提示 */}
        {filteredManagers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-2">未找到相关数据</h3>
            <p className="text-slate-400 text-sm">请调整筛选条件</p>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-black text-slate-800 mb-6">编辑项目经理信息</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">项目经理姓名</label>
                <input
                  type="text"
                  value={editingManager.name}
                  disabled
                  className="w-full px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">项目经理等级</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value as ManagerLevel)}
                  className="w-full px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={ManagerLevel.Junior}>初级</option>
                  <option value={ManagerLevel.Intermediate}>中级</option>
                  <option value={ManagerLevel.Senior}>高级</option>
                  <option value={ManagerLevel.Benchmark}>标杆</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">项目经理评分（0-100分）</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editScore}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEditScore(0);
                    } else {
                      const num = Number(value);
                      if (!isNaN(num)) {
                        setEditScore(Math.min(100, Math.max(0, num)));
                      }
                    }
                  }}
                  className="w-full px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情面板 */}
      {selectedManager && !editingManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedManager(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">{selectedManager.name}</h2>
              </div>
              <button
                onClick={() => setSelectedManager(null)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 级别和评分 */}
            <div className="bg-white px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">项目经理等级:</span>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getLevelColor(selectedManager.level)}`}>
                    {selectedManager.level}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">项目经理评分:</span>
                  <span className={`text-lg font-black ${getScoreColor(selectedManager.score)}`}>
                    {selectedManager.score}分
                  </span>
                </div>
              </div>
            </div>

            {/* 详细指标 */}
            <div className="p-6 border-b border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-slate-800">{selectedManager.totalProjects}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">项目总数</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-rose-600">{selectedManager.riskCount}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">风险项目</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-emerald-600">{selectedManager.highlightCount + selectedManager.benchmarkCount}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">亮点/标杆</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-indigo-600">{selectedManager.majorProjectCount + selectedManager.priorityProjectCount}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">重点/重大</div>
                </div>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <h3 className="text-lg font-black text-slate-800 mb-4">负责项目列表</h3>
              <div className="space-y-3">
                {selectedManager.projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      onNavigateToProject(project.id);
                      setSelectedManager(null);
                    }}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                          {project.projectCode.slice(-2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{project.projectName}</div>
                          <div className="text-xs font-bold text-slate-500">{project.projectCode}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.isBenchmark && (
                          <span className="px-2 py-1 bg-rose-100 text-rose-600 rounded text-xs font-bold">标杆</span>
                        )}
                        {project.isHighlight && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-bold">亮点</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-bold text-slate-500">
                      <span>行业: {project.industry}</span>
                      <span>合同额: {(project.payment.contractAmount / 10000).toFixed(2)}万</span>
                      <span>状态:
                        <span className={`ml-1 px-2 py-0.5 rounded ${
                          project.status === ProjectStatus.Accepted ? 'bg-emerald-100 text-emerald-700' :
                          project.status === ProjectStatus.Delayed ? 'bg-amber-100 text-amber-700' :
                          project.status === ProjectStatus.Paused ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {project.status}
                        </span>
                      </span>
                      <span>级别: {project.level}</span>
                      <span>进度: {project.execution.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagerProfilePage;