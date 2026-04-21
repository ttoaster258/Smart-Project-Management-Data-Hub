import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, PRIMARY_REGIONS, REGION_MAPPING } from '../types';

interface CostMonitorPageProps {
  projects: Project[];
  onNavigateToProject: (id: string) => void;
}

export default function CostMonitorPage({ projects, onNavigateToProject }: CostMonitorPageProps) {
  // 筛选状态
  const [filters, setFilters] = useState({
    searchTerm: '',
    region: '',
    status: ''
  });

  // 获取唯一的区域列表（使用固定的区域列表）
  const regions = PRIMARY_REGIONS;

  // 获取唯一的状态列表
  const statuses = useMemo(() => {
    return ['正在进行', '延期', '已验收', '暂停'];
  }, []);

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

  // 格式化为万元，保留两位小数
  const formatToWanYuan = (amount: number): string => {
    return (amount / 10000).toFixed(2);
  };

  // 筛选项目
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // 搜索词筛选
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (
          !project.projectName?.toLowerCase().includes(term) &&
          !project.projectCode?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // 区域筛选
      if (filters.region) {
        const mappedRegion = REGION_MAPPING[project.region] || project.region;
        if (mappedRegion !== filters.region) {
          return false;
        }
      }

      // 状态筛选
      if (filters.status && project.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [projects, filters]);

  // 响应式栅格系统
  const gridLayout = "grid grid-cols-[2fr_1.2fr_1fr_1.5fr_1fr] gap-6 px-8 py-5 items-center";

  return (
    <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
      {/* 头部装饰与筛选 */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-8 py-6 flex flex-col space-y-4">

          <div className="flex flex-wrap gap-4 items-center">
            {/* 搜索框 */}
            <div className="relative group">
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                placeholder="搜索项目名称或编号..."
                className="pl-11 pr-4 py-2.5 w-72 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400"
              />
              <svg className="absolute left-4 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 区域筛选 */}
            <div className="relative">
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-sm"
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

            {/* 状态筛选 */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-sm"
              >
                <option value="">全部状态</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* 清除筛选 */}
            {(filters.searchTerm || filters.region || filters.status) && (
              <button
                onClick={() => setFilters({ searchTerm: '', region: '', status: '' })}
                className="px-4 py-2.5 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all uppercase tracking-widest"
              >
                重置筛选
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 项目列表表格 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-[1280px]">
          {/* 表头 - 字体加大且加粗 */}
          <div className={`sticky top-0 z-10 bg-white border-b-2 border-slate-200 ${gridLayout} bg-slate-50/80 backdrop-blur-md`}>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">项目基本信息</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">工时统计 (人周)</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">工时偏差率</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">预算使用情况 (万元)</div>
            <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-center">预算使用率</div>
          </div>

          {/* 表格内容 */}
          <div className="divide-y divide-slate-100 bg-white shadow-sm mx-4 my-4 rounded-3xl border border-slate-200 overflow-hidden">
            {filteredProjects.map(project => {
              const plannedHours = project.manHours?.plannedTotal || 0;
              const actualHours = project.manHours?.pmoAnnualTotal || 0;
              const hourDeviationRate = calculateHourDeviationRate(plannedHours, actualHours);

              const totalBudget = project.budget?.totalBudget || 0;
              const usedBudget = project.budget?.budgetUsedAmount || 0;
              const remainingBudget = totalBudget - usedBudget;
              const budgetUsageRate = calculateBudgetUsageRate(usedBudget, totalBudget);

              return (
                <div
                  key={project.id}
                  onClick={() => onNavigateToProject(project.id)}
                  className={`${gridLayout} hover:bg-slate-50 group transition-all cursor-pointer`}
                >
                  {/* 项目基本信息 */}
                  <div className="min-w-0">
                    <div className="text-base font-black text-slate-800 group-hover:text-emerald-700 transition-colors truncate mb-1">
                      {project.projectName}
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{project.projectCode}</span>
                       <span className="text-xs font-bold text-slate-500">{project.region}</span>
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                         project.status === '已验收' ? 'bg-emerald-100 text-emerald-700' :
                         project.status === '延期' ? 'bg-rose-100 text-rose-700' :
                         project.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                         'bg-blue-100 text-blue-700'
                       }`}>
                         {project.status}
                       </span>
                    </div>
                  </div>

                  {/* 工时情况统计 */}
                  <div className="px-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">计划投入</span>
                        <span className="text-sm font-black text-slate-800">{plannedHours.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-600">实际已用</span>
                        <span className="text-sm font-black text-indigo-700">{actualHours.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 工时偏差率 */}
                  <div className="text-center flex flex-col items-center">
                    <div className={`text-lg font-black ${
                      hourDeviationRate > 20 ? 'text-rose-600' :
                      hourDeviationRate > 0 ? 'text-amber-600' :
                      hourDeviationRate < -20 ? 'text-emerald-600' :
                      'text-slate-700'
                    }`}>
                      {hourDeviationRate > 0 ? '+' : ''}{hourDeviationRate.toFixed(1)}%
                    </div>
                    {hourDeviationRate > 0 && (
                      <div className="mt-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">人力超支</div>
                    )}
                    {hourDeviationRate < 0 && (
                      <div className="mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">人力节省</div>
                    )}
                  </div>

                  {/* 预算情况统计 (万元) */}
                  <div className="px-4">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                       <div className="flex justify-between items-center text-sm font-bold">
                         <span className="text-xs text-slate-500">总额:</span>
                         <span className="text-slate-800 font-black ml-2 text-base">{formatToWanYuan(totalBudget)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-bold">
                         <span className="text-xs text-slate-500">已用:</span>
                         <span className="text-emerald-600 font-black ml-2 text-base">{formatToWanYuan(usedBudget)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-slate-200">
                         <span className="text-xs text-slate-500">剩余:</span>
                         <span className={`${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-800'} font-black ml-2 text-base`}>
                           {formatToWanYuan(remainingBudget)}
                         </span>
                       </div>
                    </div>
                  </div>

                  {/* 预算状态进度条 */}
                  <div className="text-center">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{budgetUsageRate.toFixed(1)}%</span>
                       {usedBudget > totalBudget && totalBudget > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 rounded uppercase border border-rose-200">Over</span>}
                    </div>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-3 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetUsageRate > 100 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                          budgetUsageRate > 80 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(budgetUsageRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-white mx-4 rounded-3xl border border-slate-200 border-dashed">
              <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-base font-black text-slate-400 uppercase tracking-widest">未找到匹配的项目</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}