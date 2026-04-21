import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PRIMARY_REGIONS, REGION_MAPPING, Project as FullProject } from '../types';
import ProjectDataService from '../services/ProjectDataService';
import ProjectDetailPanel from './ProjectDetailPanel';
import { getUserDataScope, hasRole } from '../services/AuthService';

// 简化的项目类型用于卡片展示
interface SimpleProject {
  id: string;
  project_code: string;
  project_name: string;
  project_manager: string;
  region: string;
  level: string;
  industry: string;
  contract_amount: number;
  paid_2026: number;
  status: string;
  acceptance_date: string;
  isBenchmark: boolean;
  isHighlight: boolean;
  projectHighlight: string;
}

const TYPE_OPTIONS = [
  { label: '类型', value: '全部' },
  { label: '标杆项目', value: '标杆项目' },
  { label: '亮点工程', value: '亮点工程' }
];

// 固定行业列表
const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];

export default function HighlightPage() {
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [fullProjects, setFullProjects] = useState<FullProject[]>([]); // 存储完整项目数据用于详情
  const [selectedRegion, setSelectedRegion] = useState('全部');
  const [selectedType, setSelectedType] = useState('全部');
  const [selectedProject, setSelectedProject] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);

  // 区域总监权限相关
  const isRegionalDirector = hasRole('regional_director');
  const dataScope = getUserDataScope();
  const userRegion = dataScope.scope === 'region' ? dataScope.region : null;

  // 区域总监强制锁定到自己的区域
  const effectiveRegion = isRegionalDirector && userRegion ? userRegion : selectedRegion;

  // 获取项目列表
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const result = await ProjectDataService.fetchAllProjects();
      if (result.success) {
        // 存储完整项目数据
        setFullProjects(result.data);
        // 转换为简单格式供卡片展示使用
        const simplifiedProjects = result.data.map(p => ({
          id: p.id,
          project_code: p.projectCode,
          project_name: p.projectName,
          project_manager: p.members?.projectManager || '',
          region: p.region,
          level: p.level,
          industry: p.industry,
          contract_amount: p.payment?.contractAmount || 0,
          paid_2026: p.payment?.paid2026 || 0,
          status: p.status || '',
          acceptance_date: p.timeline?.acceptanceDate || '',
          isBenchmark: p.isBenchmark,
          isHighlight: p.isHighlight,
          projectHighlight: p.projectHighlight || ''
        }));
        setProjects(simplifiedProjects);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 点击卡片时，从完整项目数据中查找对应项目
  const handleProjectClick = (simpleProject: SimpleProject) => {
    const fullProject = fullProjects.find(p => p.id === simpleProject.id);
    if (fullProject) {
      setSelectedProject(fullProject);
    }
  };

  // 获取标准化区域名称
  const getStandardRegion = (region: string) => {
    return REGION_MAPPING[region] || region;
  };

  // 筛选项目（区域总监使用 effectiveRegion）
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => p.isBenchmark || p.isHighlight);

    // 按区域筛选（区域总监使用强制区域，普通用户使用选择的区域）
    const regionToFilter = isRegionalDirector && userRegion ? userRegion : selectedRegion;
    if (regionToFilter !== '全部') {
      result = result.filter(p => {
        const region = getStandardRegion(p.region);
        return region === regionToFilter || region.includes(regionToFilter) || regionToFilter.includes(region);
      });
    }

    // 按类型筛选
    if (selectedType === '标杆项目') {
      result = result.filter(p => p.isBenchmark);
    } else if (selectedType === '亮点工程') {
      result = result.filter(p => p.isHighlight);
    }

    // 按验收日期降序排列
    return result.sort((a, b) => {
      const dateA = new Date(a.acceptance_date || '1900-01-01').getTime();
      const dateB = new Date(b.acceptance_date || '1900-01-01').getTime();
      return dateB - dateA;
    });
  }, [projects, selectedRegion, selectedType, isRegionalDirector, userRegion]);

  // 统计数据（区域总监只统计自己区域的数据）
  const stats = useMemo(() => {
    // 对于区域总监，只统计其区域内的项目
    const baseProjects = isRegionalDirector && userRegion
      ? projects.filter(p => {
          const region = getStandardRegion(p.region);
          return region === userRegion || region.includes(userRegion) || userRegion.includes(region);
        })
      : projects;

    const highlightOnlyProjects = baseProjects.filter(p => p.isHighlight); // 只统计纯亮点工程
    const benchmarkProjects = baseProjects.filter(p => p.isBenchmark); // 统计标杆项目

    return {
      highlightCount: highlightOnlyProjects.length,
      benchmarkCount: benchmarkProjects.length
    };
  }, [projects, isRegionalDirector, userRegion]);

  // 区域统计数据（区域总监只显示自己的区域）
  const regionStats = useMemo(() => {
    const highlightOnlyByRegion: Record<string, number> = {};
    const benchmarkByRegion: Record<string, number> = {};

    // 对于区域总监，只统计其区域
    const regionsToShow = isRegionalDirector && userRegion ? [userRegion] : PRIMARY_REGIONS;

    regionsToShow.forEach(region => {
      highlightOnlyByRegion[region] = 0;
      benchmarkByRegion[region] = 0;
    });

    // 对于区域总监，只遍历其区域内的项目
    const projectsToAnalyze = isRegionalDirector && userRegion
      ? projects.filter(p => {
          const region = getStandardRegion(p.region);
          return region === userRegion || region.includes(userRegion) || userRegion.includes(region);
        })
      : projects;

    projectsToAnalyze.forEach(project => {
      const standardRegion = getStandardRegion(project.region);
      // 对于区域总监，直接使用其区域名称
      const targetRegion = isRegionalDirector && userRegion ? userRegion : standardRegion;

      if (regionsToShow.includes(targetRegion) || (standardRegion && regionsToShow.includes(standardRegion))) {
        const effectiveRegion = isRegionalDirector && userRegion ? userRegion : standardRegion;
        if (project.isHighlight && highlightOnlyByRegion[effectiveRegion] !== undefined) {
          highlightOnlyByRegion[effectiveRegion]++;
        }
        if (project.isBenchmark && benchmarkByRegion[effectiveRegion] !== undefined) {
          benchmarkByRegion[effectiveRegion]++;
        }
      }
    });

    return regionsToShow.map(region => ({
      region,
      亮点工程: highlightOnlyByRegion[region],
      标杆项目: benchmarkByRegion[region]
    }));
  }, [projects, isRegionalDirector, userRegion]);

  // 行业统计数据（区域总监只统计自己区域的数据）
  const industryStats = useMemo(() => {
    const highlightByIndustry: Record<string, number> = {};
    const benchmarkByIndustry: Record<string, number> = {};

    FIXED_INDUSTRIES.forEach(industry => {
      highlightByIndustry[industry] = 0;
      benchmarkByIndustry[industry] = 0;
    });

    // 对于区域总监，只遍历其区域内的项目
    const projectsToAnalyze = isRegionalDirector && userRegion
      ? projects.filter(p => {
          const region = getStandardRegion(p.region);
          return region === userRegion || region.includes(userRegion) || userRegion.includes(region);
        })
      : projects;

    projectsToAnalyze.forEach(project => {
      if (project.isBenchmark) {
        const industry = project.industry || '未知';
        if (FIXED_INDUSTRIES.includes(industry)) {
          benchmarkByIndustry[industry]++;
        }
      }

      if (project.isHighlight) {
        const industry = project.industry || '未知';
        if (FIXED_INDUSTRIES.includes(industry)) {
          highlightByIndustry[industry]++;
        }
      }
    });

    const sortedIndustries = [...FIXED_INDUSTRIES].sort((a, b) => {
      const totalA = highlightByIndustry[a] + benchmarkByIndustry[a];
      const totalB = highlightByIndustry[b] + benchmarkByIndustry[b];
      return totalB - totalA;
    });

    return sortedIndustries.map(industry => ({
      industry,
      亮点工程: highlightByIndustry[industry] || 0,
      标杆项目: benchmarkByIndustry[industry] || 0
    }));
  }, [projects, isRegionalDirector, userRegion]);

  // 计算最大数量用于统一量程
  const maxCount = useMemo(() => {
    const regionMax = Math.max(...regionStats.map(r => Math.max(r.亮点工程, r.标杆项目)));
    const industryMax = Math.max(...industryStats.map(i => Math.max(i.亮点工程, i.标杆项目)));
    return Math.max(regionMax, industryMax, 5); // 至少为5保证视觉效果
  }, [regionStats, industryStats]);

  // 重置按钮是否显示（区域总监不需要重置区域）
  const showResetButton = !isRegionalDirector && (selectedRegion !== '全部' || selectedType !== '全部');

  return (
    <div className="h-full flex flex-col bg-slate-50/40 overflow-hidden text-slate-900">
      {/* 顶部统计栏 (Premium 风格) */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-8 py-8">
           <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                {isRegionalDirector && userRegion ? `${userRegion} 亮点工程看板` : '亮点工程看板'}
              </h1>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.01] transition-all">
                 <div className="flex items-center justify-between mb-2">
                    <div className="text-5xl font-black text-blue-600 leading-none">{stats.highlightCount}</div>
                    <div className="p-3 bg-blue-50 rounded-2xl">
                       <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                       </svg>
                    </div>
                 </div>
                 <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">亮点工程总数</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg shadow-slate-200/30 group hover:scale-[1.01] transition-all">
                 <div className="flex items-center justify-between mb-2">
                    <div className="text-5xl font-black text-emerald-600 leading-none">{stats.benchmarkCount}</div>
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                       <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                       </svg>
                    </div>
                 </div>
                 <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">标杆项目数</div>
              </div>
           </div>
        </div>
      </div>

      {/* 滚动内容区 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="px-8 py-8 space-y-8">

          {/* 图表展示区 */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                  {isRegionalDirector && userRegion ? `${userRegion} 分布图` : '区域维度分布图'}
                </h3>
                <div className="flex space-x-2">
                   <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">亮点</span>
                   </div>
                   <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">标杆</span>
                   </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={regionStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 700, fontSize: 12}} />
                  <YAxis domain={[0, 4]} ticks={[0, 2, 4]} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 700, fontSize: 12}} allowDecimals={false} />
                  <Tooltip
                    cursor={{fill: '#F8FAFC'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  />
                  <Bar dataKey="亮点工程" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="标杆项目" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">行业维度分布图</h3>
                <div className="flex space-x-2">
                   <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">亮点</span>
                   </div>
                   <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">标杆</span>
                   </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={industryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="industry" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 700, fontSize: 12}} />
                  <YAxis domain={[0, 4]} ticks={[0, 2, 4]} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 700, fontSize: 12}} allowDecimals={false} />
                  <Tooltip
                    cursor={{fill: '#F8FAFC'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  />
                  <Bar dataKey="亮点工程" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="标杆项目" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 筛选功能区 */}
          <div className="bg-white border border-slate-200 px-8 py-5 rounded-3xl shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              {/* 区域筛选 - 区域总监隐藏此下拉框，显示区域标签 */}
              {isRegionalDirector && userRegion ? (
                <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <span className="text-sm font-black text-indigo-700">{userRegion}</span>
                </div>
              ) : (
                <div className="relative group flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="appearance-none w-full pl-12 pr-10 py-3 text-sm font-black bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-sm text-slate-800"
                  >
                    <option value="全部">区域</option>
                    {PRIMARY_REGIONS.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              )}

              {/* 类型筛选 - 所有用户可见 */}
              <div className="relative group flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none w-full pl-12 pr-10 py-3 text-sm font-black bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-sm text-slate-800"
                >
                  {TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* 重置按钮 - 区域总监只显示类型重置 */}
              {showResetButton && (
                <button
                  onClick={() => { setSelectedRegion('全部'); setSelectedType('全部'); }}
                  className="px-6 py-3 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-2xl transition-all uppercase tracking-[0.2em]"
                >
                  重置条件
                </button>
              )}
              {/* 区域总监的类型重置按钮 */}
              {isRegionalDirector && selectedType !== '全部' && (
                <button
                  onClick={() => setSelectedType('全部')}
                  className="px-6 py-3 text-sm font-black text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-2xl transition-all uppercase tracking-[0.2em]"
                >
                  重置类型
                </button>
              )}

              <div className="ml-auto text-sm font-black text-slate-400 uppercase tracking-widest italic shrink-0">
                匹配到 <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">{filteredProjects.length}</span> 个项目
              </div>
            </div>
          </div>

          {/* 项目展示网格 */}
          <div className="pb-20">
            {loading ? (
               <div className="py-20 text-center text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic animate-pulse">
                  同步精选项目库中...
               </div>
            ) : filteredProjects.length === 0 ? (
               <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
                  <div className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">
                    该筛选条件下暂无成果项目录入
                  </div>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredProjects.map(project => (
                   <div
                     key={project.id}
                     onClick={() => handleProjectClick(project)}
                     className="bg-white rounded-3xl border border-slate-200 p-7 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500 group transition-all relative overflow-hidden"
                   >
                     {/* 装饰性背景 */}
                     <div className="absolute -right-12 -top-12 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors duration-500"></div>

                     <div className="relative z-10">
                        {/* 标签区 */}
                        <div className="flex gap-2.5 mb-5">
                          {project.isBenchmark && (
                            <span className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200">
                              标杆项目
                            </span>
                          )}
                          {project.isHighlight && (
                            <span className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-blue-100 text-blue-700 uppercase tracking-widest border border-blue-200">
                              亮点工程
                            </span>
                          )}
                        </div>

                        {/* 项目关键 ID */}
                        <div className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                           {project.project_code}
                        </div>

                        {/* 项目名称 */}
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-700 transition-colors mb-5 leading-snug min-h-[3.5rem] line-clamp-2">
                           {project.project_name}
                        </h3>

                        {/* 核心指标栅格 */}
                        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-slate-100 mt-auto">
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">行业</div>
                              <div className="text-base font-bold text-slate-700">{project.industry || '-'}</div>
                           </div>
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">项目经理</div>
                              <div className="text-base font-bold text-slate-700">{project.project_manager}</div>
                           </div>
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">区域</div>
                              <div className="text-base font-bold text-slate-700">{getStandardRegion(project.region)}</div>
                           </div>
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">合同金额</div>
                              <div className="text-base font-bold text-slate-700 whitespace-nowrap">¥{(project.contract_amount / 10000).toFixed(1)} 万</div>
                           </div>
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">回款额</div>
                              <div className="text-base font-bold text-slate-700 whitespace-nowrap">¥{(project.paid_2026 / 10000).toFixed(1)} 万</div>
                           </div>
                           <div>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">项目状态</div>
                              <div className="text-base font-bold text-slate-700">{project.status || '-'}</div>
                           </div>
                        </div>

                        <div className="mt-5 flex items-center justify-end">
                           <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300">
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                           </div>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 项目详情面板 */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={(updatedProject) => {
            setSelectedProject(updatedProject);
            // 更新 fullProjects 和 projects 数组
            setFullProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? {
              ...p,
              project_code: updatedProject.projectCode,
              project_name: updatedProject.projectName,
              project_manager: updatedProject.members?.projectManager || '',
              region: updatedProject.region,
              level: updatedProject.level,
              industry: updatedProject.industry,
              contract_amount: updatedProject.payment?.contractAmount || 0,
              paid_2026: updatedProject.payment?.paid2026 || 0,
              status: updatedProject.status || '',
              acceptance_date: updatedProject.timeline?.acceptanceDate || '',
              isBenchmark: updatedProject.isBenchmark,
              isHighlight: updatedProject.isHighlight,
              projectHighlight: updatedProject.projectHighlight || ''
            } : p));
          }}
        />
      )}
    </div>
  );
}