import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, MILESTONE_NODE_OPTIONS, MilestoneNode, PRIMARY_REGIONS, REGION_MAPPING, CRITICAL_MILESTONES } from '../types';

interface RiskWarningPageProps {
  projects: Project[];
  onNavigateToProject: (id: string) => void;
}

type RiskType = 'progress' | 'cost' | 'quality';

interface ProjectRisk {
  project: Project;
  riskTypes: RiskType[];
  riskDetails: {
    progress?: string[];
    cost?: string[];
    quality?: string[];
  };
  // 新增：质量风险的具体节点信息
  qualityMissingNodes?: string[];
}

export default function RiskWarningPage({ projects, onNavigateToProject }: RiskWarningPageProps) {
  // 筛选状态
  const [filters, setFilters] = useState({
    searchTerm: '',
    riskType: '',
    region: ''
  });

  // Tooltip 组件
  const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
      <div className="inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {children}
        {isVisible && (
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl z-50">
            <div className="absolute right-3 -top-1 w-2 h-2 bg-slate-900 rotate-45"></div>
            {content}
          </div>
        )}
      </div>
    );
  };

  // 获取唯一的区域列表（使用固定的区域列表）
  const regions = PRIMARY_REGIONS;

  // 计算工时偏差率
  const calculateHourDeviationRate = (planned: number, actual: number): number => {
    if (!planned || planned === 0) return 0;
    return ((actual - planned) / planned) * 100;
  };

  // 计算预算使用率
  const calculateBudgetUsageRate = (used: number, total: number): number => {
    if (!total || total === 0) return 0;
    return (used / total) * 100;
  };

  // 计算延期月数
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

  // 分析项目风险
  const analyzeRisks = (project: Project): ProjectRisk => {
    const riskTypes: RiskType[] = [];
    const riskDetails: ProjectRisk['riskDetails'] = {
      progress: [],
      cost: [],
      quality: []
    };
    const qualityMissingNodes: string[] = [];
    let qualityOverdueNode: string | null = null;

    // 进度风险
    const delayMonths = calculateDelayMonths(project.timeline?.plannedEndDate || '');
    if (delayMonths >= 1 && project.status === ProjectStatus.Delayed) {
      riskTypes.push('progress');
      riskDetails.progress?.push(`延期 ${delayMonths} 个月`);
    }
    if (project.status === ProjectStatus.Paused) {
      riskTypes.push('progress');
      riskDetails.progress?.push('项目暂停');
    }

    // 成本风险
    const marginRate = parseFloat(project.marginRate || '0');
    if (marginRate < 0) {
      riskTypes.push('cost');
      riskDetails.cost?.push('毛利率小于0');
    }

    const totalBudget = project.budget?.totalBudget || 0;
    const usedBudget = project.budget?.budgetUsedAmount || 0;
    if (totalBudget > 0 && usedBudget > totalBudget) {
      riskTypes.push('cost');
      riskDetails.cost?.push('预算使用超支');
    }

    const plannedHours = project.manHours?.plannedTotal || 0;
    const actualHours = project.manHours?.pmoAnnualTotal || 0;
    const hourDeviationRate = calculateHourDeviationRate(plannedHours, actualHours);
    if (hourDeviationRate > 20) {
      riskTypes.push('cost');
      riskDetails.cost?.push('人力严重超支');
    }

    // 质量风险判断
    const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
    let qualityRiskFound = false;

    // 检查重要节点是否缺少实际完成时间
    CRITICAL_MILESTONES.forEach(milestoneNode => {
      const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === milestoneNode);
      if (nodeIndex < currentIndex) {
        const nodeData = project.milestoneNodeData?.[milestoneNode];
        if (!nodeData?.actualDate) {
          const nodeLabel = MILESTONE_NODE_OPTIONS.find(opt => opt.value === milestoneNode)?.label;
          if (nodeLabel) {
            qualityMissingNodes.push(nodeLabel);
          }
          if (!qualityRiskFound) {
            riskTypes.push('quality');
            riskDetails.quality?.push('节点缺失');
            qualityRiskFound = true;
          }
        }
      }
    });

    // 检查当前节点的计划完成时间是否超过一个月
    const currentNodeData = project.milestoneNode && project.milestoneNodeData?.[project.milestoneNode];
    if (currentNodeData?.plannedDate && !qualityRiskFound) {
      const plannedDate = new Date(currentNodeData.plannedDate);
      const today = new Date();
      const diffTime = today.getTime() - plannedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        riskTypes.push('quality');
        riskDetails.quality?.push('节点缺失');
        const nodeLabel = MILESTONE_NODE_OPTIONS.find(opt => opt.value === project.milestoneNode)?.label;
        if (nodeLabel) {
          qualityOverdueNode = nodeLabel;
        }
      }
    }

    return { project, riskTypes, riskDetails, qualityMissingNodes };
  };

  // 计算风险统计
  const riskStats = useMemo(() => {
    const allRisks = projects.map(analyzeRisks);

    const hasProgressRisk = allRisks.filter(r => r.riskTypes.includes('progress'));
    const hasCostRisk = allRisks.filter(r => r.riskTypes.includes('cost'));
    const hasQualityRisk = allRisks.filter(r => r.riskTypes.includes('quality'));

    const uniqueRiskProjects = new Set<string>();
    allRisks.forEach(r => {
      if (r.riskTypes.length > 0) {
        uniqueRiskProjects.add(r.project.id);
      }
    });

    return {
      totalRiskProjects: uniqueRiskProjects.size,
      progressRiskCount: hasProgressRisk.length,
      costRiskCount: hasCostRisk.length,
      qualityRiskCount: hasQualityRisk.length,
      allRiskProjects: allRisks.filter(r => r.riskTypes.length > 0)
    };
  }, [projects]);

  // 筛选风险项目
  const filteredRiskProjects = useMemo(() => {
    return riskStats.allRiskProjects.filter(riskProject => {
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (
          !riskProject.project.projectName?.toLowerCase().includes(term) &&
          !riskProject.project.projectCode?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      if (filters.riskType && !riskProject.riskTypes.includes(filters.riskType as RiskType)) {
        return false;
      }

      if (filters.region) {
        const mappedRegion = REGION_MAPPING[riskProject.project.region] || riskProject.project.region;
        if (mappedRegion !== filters.region) {
          return false;
        }
      }

      return true;
    });
  }, [riskStats.allRiskProjects, filters]);

  // 栅格系统对齐
  const gridLayout = "grid grid-cols-[2fr_1.2fr_2fr_1.2fr] gap-6 px-8 py-5 items-center";

  return (
    <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden text-slate-900">
      {/* 顶部统计栏 (Premium 风格) */}
      <div className="bg-white border-b border-slate-200 shrink-0">
         <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-8">
            </div>

            <div className="grid grid-cols-4 gap-6">
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.02] transition-transform">
                  <div className="text-4xl font-black text-slate-900 mb-2 leading-none">{riskStats.totalRiskProjects}</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">风险项目总数</div>
               </div>
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.02] transition-transform relative">
                  <div className="absolute top-3 right-3">
                     <Tooltip content="进度风险判定：项目延期1个月以上或处于暂停状态">
                        <div className="text-slate-300 hover:text-rose-500 transition-colors cursor-help">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                     </Tooltip>
                  </div>
                  <div className="text-4xl font-black text-rose-600 mb-2 leading-none">{riskStats.progressRiskCount}</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">进度风险</div>
               </div>
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.02] transition-transform relative">
                  <div className="absolute top-3 right-3">
                     <Tooltip content="成本风险判定：毛利率小于0、预算使用超支、或人力偏差率超过20%">
                        <div className="text-slate-300 hover:text-amber-500 transition-colors cursor-help">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                     </Tooltip>
                  </div>
                  <div className="text-4xl font-black text-amber-600 mb-2 leading-none">{riskStats.costRiskCount}</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">成本风险</div>
               </div>
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.02] transition-transform relative">
                  <div className="absolute top-3 right-3">
                     <Tooltip content="质量风险判定：重要节点（级别确定、项目启动、计划预算、概要方案、内部验收）缺实际完成时间，或当前节点超期一个月以上">
                        <div className="text-slate-300 hover:text-purple-500 transition-colors cursor-help">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                     </Tooltip>
                  </div>
                  <div className="text-4xl font-black text-purple-600 mb-2 leading-none">{riskStats.qualityRiskCount}</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">质量风险</div>
               </div>
            </div>
         </div>
      </div>

      {/* 筛选搜索栏 (风格对齐) */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative group">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="搜索项目名称或编号..."
              className="pl-11 pr-4 py-2.5 w-72 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400"
            />
            <svg className="absolute left-4 top-3 h-4 w-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="relative">
            <select
              value={filters.riskType}
              onChange={(e) => setFilters({ ...filters, riskType: e.target.value })}
              className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all cursor-pointer shadow-sm text-slate-800"
            >
              <option value="">全部风险类型</option>
              <option value="progress">进度风险</option>
              <option value="cost">成本风险</option>
              <option value="quality">质量风险</option>
            </select>
            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all cursor-pointer shadow-sm text-slate-800"
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

          {(filters.searchTerm || filters.riskType || filters.region) && (
            <button
              onClick={() => setFilters({ searchTerm: '', riskType: '', region: '' })}
              className="px-4 py-2.5 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all uppercase tracking-widest"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 风险预警表格 (风格对齐成本监控) */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-[1280px]">
          {/* 表头 */}
          <div className={`sticky top-0 z-10 bg-white border-b-2 border-slate-200 ${gridLayout} bg-slate-50/80 backdrop-blur-md`}>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">项目信息</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">风险类型</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">风险详情</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">核心指标</div>
          </div>

          {/* 表格内容 */}
          <div className="divide-y divide-slate-100 bg-white shadow-sm mx-4 my-4 rounded-[2.5rem] border border-slate-200 overflow-hidden">
            {filteredRiskProjects.length === 0 ? (
              <div className="p-20 text-center text-sm font-black text-slate-400 uppercase tracking-widest italic leading-none">暂无预警项目，状态良好</div>
            ) : filteredRiskProjects.map(riskProject => {
              const hourDeviationRate = calculateHourDeviationRate(
                riskProject.project.manHours?.plannedTotal || 0,
                riskProject.project.manHours?.pmoAnnualTotal || 0
              );
              const budgetUsageRate = calculateBudgetUsageRate(
                riskProject.project.budget?.budgetUsedAmount || 0,
                riskProject.project.budget?.totalBudget || 0
              );
              // 获取当前节点信息（用于质量风险显示）
              const currentNodeLabel = MILESTONE_NODE_OPTIONS.find(opt => opt.value === riskProject.project.milestoneNode)?.label || '-';

              return (
                <div
                  key={riskProject.project.id}
                  onClick={() => onNavigateToProject(riskProject.project.id)}
                  className={`${gridLayout} hover:bg-slate-50 group transition-all cursor-pointer`}
                >
                  {/* 项目基本信息 */}
                  <div className="min-w-0">
                    <div className="text-base font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate mb-1 leading-none">
                      {riskProject.project.projectName}
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded leading-none">{riskProject.project.projectCode}</span>
                       <span className="text-xs font-bold text-slate-500 leading-none">{riskProject.project.region}</span>
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter leading-none ${
                         riskProject.project.status === '已验收' ? 'bg-emerald-100 text-emerald-700' :
                         riskProject.project.status === '延期' ? 'bg-rose-100 text-rose-700' :
                         riskProject.project.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                         'bg-blue-100 text-blue-700'
                       }`}>
                         {riskProject.project.status}
                       </span>
                    </div>
                  </div>

                  {/* 风险项识别 (Tags - 增加字号) */}
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    {riskProject.riskTypes.includes('progress') && (
                      <span className="text-xs font-black px-3 py-1.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-200 leading-none">进度风险</span>
                    )}
                    {riskProject.riskTypes.includes('cost') && (
                      <span className="text-xs font-black px-3 py-1.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-200 leading-none">成本风险</span>
                    )}
                    {riskProject.riskTypes.includes('quality') && (
                      <span className="text-xs font-black px-3 py-1.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-200 leading-none">质量风险</span>
                    )}
                  </div>

                  {/* 风险预警详情 (居中并大幅增强字号) */}
                  <div className="space-y-3 flex flex-col items-center">
                    {riskProject.riskDetails.progress && riskProject.riskDetails.progress.length > 0 && (
                      <div className="flex items-center space-x-2.5 text-sm font-black text-rose-600">
                         <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></span>
                         <span className="leading-none">{riskProject.riskDetails.progress.join('、')}</span>
                      </div>
                    )}
                    {riskProject.riskDetails.cost && riskProject.riskDetails.cost.length > 0 && (
                      <div className="flex items-center space-x-2.5 text-sm font-black text-amber-600">
                         <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                         <span className="leading-none">{riskProject.riskDetails.cost.join('、')}</span>
                      </div>
                    )}
                    {riskProject.riskDetails.quality && riskProject.riskDetails.quality.length > 0 && (
                      <div className="flex items-center space-x-2.5 text-sm font-black text-purple-600">
                         <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                         <span className="leading-none">{riskProject.riskDetails.quality.join('、')}</span>
                      </div>
                    )}
                  </div>

                  {/* 核心业务指标 - 根据筛选类型动态显示 */}
                  {(() => {
                    const currentRiskType = filters.riskType || riskProject.riskTypes[0];

                    // 进度风险：显示预计验收时间
                    if (currentRiskType === 'progress') {
                      return (
                        <div className="flex flex-col space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-center group/item">
                             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">预计验收</span>
                             <span className="text-base font-black font-mono transition-transform group-hover/item:scale-110 text-slate-900">
                                {riskProject.project.forecastAcceptanceDate || '-'}
                             </span>
                          </div>
                        </div>
                      );
                    }

                    // 质量风险：显示有问题的节点
                    if (currentRiskType === 'quality') {
                      if (riskProject.qualityMissingNodes && riskProject.qualityMissingNodes.length > 0) {
                        return (
                          <div className="flex flex-col space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {riskProject.qualityMissingNodes.slice(0, 3).map((node, idx) => (
                              <div key={idx} className="flex justify-between items-center group/item">
                                <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">{node}</span>
                                <span className="text-base font-black font-mono transition-transform group-hover/item:scale-110 text-purple-600">
                                  缺失
                                </span>
                              </div>
                            ))}
                            {riskProject.qualityMissingNodes.length > 3 && (
                              <div className="text-center text-[10px] font-bold text-slate-400">
                                +{riskProject.qualityMissingNodes.length - 3} 个节点
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // 超期情况：显示当前节点
                        return (
                          <div className="flex flex-col space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center group/item">
                              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">当前节点</span>
                              <span className="text-base font-black font-mono transition-transform group-hover/item:scale-110 text-purple-600">
                                {currentNodeLabel}
                              </span>
                            </div>
                            <div className="flex justify-between items-center group/item">
                              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">状态</span>
                              <span className="text-base font-black font-mono transition-transform group-hover/item:scale-110 text-purple-600">
                                超期
                              </span>
                            </div>
                          </div>
                        );
                      }
                    }

                    // 成本风险：显示原有指标
                    return (
                      <div className="flex flex-col space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center group/item">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">毛利率</span>
                           <span className={`text-base font-black font-mono transition-transform group-hover/item:scale-110 ${parseFloat(riskProject.project.marginRate || '0') < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {parseFloat(riskProject.project.marginRate || '0').toFixed(1)}%
                           </span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">预算使用率</span>
                           <span className={`text-base font-black font-mono transition-transform group-hover/item:scale-110 ${budgetUsageRate > 100 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {budgetUsageRate.toFixed(1)}%
                           </span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">工时偏差率</span>
                           <span className={`text-base font-black font-mono transition-transform group-hover/item:scale-110 ${hourDeviationRate > 20 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {hourDeviationRate.toFixed(1)}%
                           </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}