import React from 'react';
import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { Project, ProjectStatus, MilestoneNode } from '../types';

interface ProjectRisk {
  project: Project;
  riskTypes: ('progress' | 'cost' | 'quality')[];
  riskDetails: {
    progress?: string[];
    cost?: string[];
    quality?: string[];
  };
}

interface RiskPenetrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProject: (projectId: string) => void;
  riskProjects: ProjectRisk[];
  riskRegionStats: { region: string; riskCount: number; total: number; percent: number }[];
  stats: {
    totalRisks: number;
    progressRiskCount: number;
    costRiskCount: number;
    qualityRiskCount: number;
  };
}

const RiskPenetrationModal: React.FC<RiskPenetrationModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProject,
  riskProjects,
  riskRegionStats,
  stats
}) => {
  if (!isOpen) return null;

  const handleProjectClick = (projectId: string) => {
    onClose();
    setTimeout(() => {
      onNavigateToProject(projectId);
    }, 100);
  };

  const getRiskStyle = (type: string) => {
    if (type === 'progress') return { bg: 'bg-rose-100', text: 'text-rose-600', label: '进度风险' };
    if (type === 'cost') return { bg: 'bg-amber-100', text: 'text-amber-600', label: '成本风险' };
    if (type === 'quality') return { bg: 'bg-purple-100', text: 'text-purple-600', label: '质量风险' };
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: '未知' };
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-slate-50 w-full max-w-7xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">风险穿透详情</h3>
              <div className="text-sm text-slate-500 font-bold mt-1">风险情况概览 · 区域风险项目情况 · 风险项目明细清单</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 space-y-6">
          {/* 第一行：风险情况概览 + 区域风险项目情况 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 风险情况概览 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="text-lg font-black text-slate-800 mb-4">风险情况概览</h4>

              {/* 总风险项目 */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-6 mb-4 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-red-400 uppercase tracking-wider">当前风险项目</div>
                    <div className="text-5xl font-black text-red-600 mt-2">{stats.totalRisks}</div>
                  </div>
                  <div className="p-4 bg-red-100 rounded-2xl">
                    <AlertTriangle size={32} className="text-red-500" />
                  </div>
                </div>
              </div>

              {/* 三种风险类型 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="font-bold text-slate-700">进度风险</span>
                  </div>
                  <span className="text-xl font-black text-rose-600">{stats.progressRiskCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="font-bold text-slate-700">成本风险</span>
                  </div>
                  <span className="text-xl font-black text-amber-600">{stats.costRiskCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="font-bold text-slate-700">质量风险</span>
                  </div>
                  <span className="text-xl font-black text-purple-600">{stats.qualityRiskCount}</span>
                </div>
              </div>
            </div>

            {/* 区域风险项目情况 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="text-lg font-black text-slate-800 mb-4">区域风险项目情况</h4>

              {riskRegionStats.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <div className="text-center font-bold">暂无区域风险数据</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskRegionStats.map(item => (
                    <div key={item.region} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-700">{item.region}</span>
                        <span className="text-xs font-bold text-slate-400">{item.riskCount}/{item.total} 个</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${item.riskCount > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(item.percent, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-black ${item.riskCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 第二行：风险项目明细清单 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-slate-800">风险项目明细清单</h4>
              <div className="text-sm font-bold text-slate-400">
                共 <span className="text-red-600 font-black">{riskProjects.length}</span> 个风险项目
              </div>
            </div>

            {riskProjects.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
                  <div className="font-bold">暂无风险项目</div>
                </div>
              </div>
            ) : (
              <div className="overflow-auto">
                {/* 表头 */}
                <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <div className="w-48 shrink-0">项目名称</div>
                  <div className="w-20 shrink-0 text-center">状态</div>
                  <div className="w-24 shrink-0">区域</div>
                  <div className="w-28 shrink-0">风险类型</div>
                  <div className="flex-1">风险详情</div>
                  <div className="w-8 shrink-0"></div>
                </div>

                {/* 项目列表 */}
                <div className="mt-2 space-y-2">
                  {riskProjects.map((riskItem, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleProjectClick(riskItem.project.id)}
                      className="bg-white rounded-xl border border-slate-100 px-4 py-3 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer group flex items-center gap-4"
                    >
                      {/* 项目名称 */}
                      <div className="w-48 shrink-0">
                        <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate">
                          {riskItem.project.projectName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{riskItem.project.projectCode}</div>
                      </div>

                      {/* 状态 */}
                      <div className="w-20 shrink-0 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          riskItem.project.status === ProjectStatus.Delayed ? 'bg-rose-100 text-rose-600' :
                          riskItem.project.status === ProjectStatus.Paused ? 'bg-gray-100 text-gray-600' :
                          riskItem.project.status === ProjectStatus.Accepted ? 'bg-emerald-100 text-emerald-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {riskItem.project.status}
                        </span>
                      </div>

                      {/* 区域 */}
                      <div className="w-24 shrink-0 text-sm font-bold text-slate-600">
                        {riskItem.project.region}
                      </div>

                      {/* 风险类型 */}
                      <div className="w-28 shrink-0">
                        <div className="flex flex-wrap gap-1">
                          {riskItem.riskTypes.map((type) => {
                            const style = getRiskStyle(type);
                            return (
                              <span key={type} className={`text-xs font-bold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* 风险详情 */}
                      <div className="flex-1 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {riskItem.riskDetails.progress && riskItem.riskDetails.progress.map((d, i) => (
                            <span key={`progress-${i}`} className="text-rose-600 font-bold">{d}</span>
                          ))}
                          {riskItem.riskDetails.cost && riskItem.riskDetails.cost.map((d, i) => (
                            <span key={`cost-${i}`} className="text-amber-600 font-bold">{d}</span>
                          ))}
                          {riskItem.riskDetails.quality && riskItem.riskDetails.quality.map((d, i) => (
                            <span key={`quality-${i}`} className="text-purple-600 font-bold">{d}</span>
                          ))}
                        </div>
                      </div>

                      {/* 箭头 */}
                      <div className="w-8 shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskPenetrationModal;