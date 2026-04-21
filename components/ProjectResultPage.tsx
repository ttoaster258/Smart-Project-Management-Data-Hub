import React, { useState, useEffect, useMemo } from 'react';
import { ProjectResultListItem, Region } from '../types';
import ProjectResultDataService from '../services/ProjectResultDataService';
import ProjectResultDetailModal from './ProjectResultDetailModal';
import { hasRole, hasPermission, getUserDataScope } from '../services/AuthService';

const ProjectResultPage: React.FC = () => {
  const [projectResults, setProjectResults] = useState<ProjectResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 区域总监权限相关
  const isRegionalDirector = hasRole('regional_director');
  const dataScope = getUserDataScope();
  const userRegion = dataScope.scope === 'region' ? dataScope.region : null;

  // 计算用户权限
  const userRole = useMemo(() => {
    const roleStr = localStorage.getItem('userRoles');
    if (roleStr) {
      const roles = JSON.parse(roleStr);
      if (roles.includes('regional_director')) return 'regional_director';
      if (roles.includes('pmo')) return 'pmo';
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('executive')) return 'executive';
    }
    return 'pm';  // 默认项目经理角色
  }, []);

  // 是否可以编辑PMO评分
  const canEditPmoScore = useMemo(() => {
    return hasRole('pmo') || hasRole('admin');
  }, []);

  // 是否可以编辑评议结论
  const canEditConclusion = useMemo(() => {
    return hasRole('pmo') || hasRole('admin');
  }, []);

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await ProjectResultDataService.fetchProjectResults();
      if (result.success) {
        setProjectResults(result.data);
      }
    } catch (error) {
      console.error('获取项目成果数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 区域过滤数据（区域总监锁定到自己区域）
  const filteredData = useMemo(() => {
    // 对于区域总监，只显示其区域的数据
    if (isRegionalDirector && userRegion) {
      return projectResults.filter(p => {
        const projectRegion = p.region || '';
        return projectRegion === userRegion || projectRegion.includes(userRegion) || userRegion.includes(projectRegion);
      });
    }
    // 普通用户使用选择的区域筛选
    if (!selectedRegion) return projectResults;
    return projectResults.filter(p => p.region === selectedRegion);
  }, [projectResults, selectedRegion, isRegionalDirector, userRegion]);

  // 最终表格展示数据
  const finalData = filteredData;

  const regions: Region[] = [
    Region.East,
    Region.South,
    Region.West,
    Region.NorthCentral,
    Region.NorthNortheast,
    Region.InnovationTrans
  ];

  const handleRowClick = (project: ProjectResultListItem) => {
    setSelectedProjectId(project.id);
  };

  const handleSave = () => {
    fetchData();
    setSelectedProjectId(null);
  };

  const selectedProject = useMemo(() => 
    projectResults.find(p => p.id === selectedProjectId),
    [projectResults, selectedProjectId]
  );

  return (
    <div className="h-screen bg-[#f3f4f7] p-6 text-slate-800 flex flex-col overflow-hidden">
      {/* 头部展示区 */}
      <div className="bg-white rounded-3xl p-5 mb-6 border border-slate-200 shadow-lg relative overflow-hidden shrink-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          {/* 区域快捷过滤 - 区域总监显示静态标签 */}
          {isRegionalDirector && userRegion ? (
            <div className="bg-indigo-50 p-1.5 rounded-xl border border-indigo-200">
              <div className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-lg">
                {userRegion}
              </div>
            </div>
          ) : (
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedRegion(null)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                selectedRegion === null
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              全部区域
            </button>
            {regions.map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  selectedRegion === region
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* 主数据列表卡片 */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
             </div>
             <div>
                <h2 className="text-base font-bold text-slate-800">项目成果列表</h2>
             </div>
          </div>
          <div className="bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 flex items-center space-x-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase">统计结果:</span>
             <span className="text-xs font-bold text-slate-700">{finalData.length} 个项目</span>
          </div>
        </div>

        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full"></div>
              <p className="text-slate-400 text-xs font-bold">加载数据中...</p>
            </div>
          ) : finalData.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
               <h3 className="text-lg font-bold text-slate-800 mb-1">暂无项目数据</h3>
               <p className="text-slate-400 text-sm">请尝试调整筛选条件</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">项目基础信息</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">立项时间</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">验收时间</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">区域</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">项目经理</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">集团公司</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">项目类型</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100">行业</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100 text-center">密级</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100 text-center">文档进度</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100 text-center">售前评价</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 border-b border-slate-100 text-center">实施评价</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finalData.map(project => (
                  <tr
                    key={project.id}
                    onClick={() => handleRowClick(project)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-slate-800 mb-0.5">{project.projectName}</div>
                      <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{project.projectCode}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-600">{project.kickoffDate || '-'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-600">{project.acceptanceDate || '-'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-600">{project.region}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-600">{project.projectManager}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-600 truncate max-w-[120px]">{project.groupCompany || '-'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-600">{project.type || '-'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-600">{project.industry || '-'}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        project.securityLevel === '机密' ? 'bg-red-50 text-red-600' :
                        project.securityLevel === '涉密' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {project.securityLevel || '公开'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="text-xs font-bold text-slate-600 mb-1 tabular-nums">
                        {project.submittedDocCount}/{project.totalDocCount}
                      </div>
                      <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${(project.submittedDocCount / project.totalDocCount) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        (project.projectResult?.preSalesTotalScore || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {project.projectResult?.preSalesTotalScore ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        (project.projectResult?.implTotalScore || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {project.projectResult?.implTotalScore ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedProjectId && selectedProject && (
        <ProjectResultDetailModal
          projectId={selectedProjectId}
          project={selectedProject}
          onClose={() => setSelectedProjectId(null)}
          onSave={handleSave}
          canEditPmoScore={canEditPmoScore}
          canEditConclusion={canEditConclusion}
          userRole={userRole}
        />
      )}

      {/* 滚动条样式 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
};

export default ProjectResultPage;