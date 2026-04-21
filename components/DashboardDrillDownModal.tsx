import React from 'react';
import { X } from 'lucide-react';
import { Project, DrillDownModalData, ProjectStatus } from '../types';

interface DashboardDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProject: (projectId: string) => void;
  drillData: DrillDownModalData | null;
}

// 格式化货币
const formatCurrency = (value: number): string => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toLocaleString();
};

// 格式化日期
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
};

// 计算毛利率
const calculateMarginRate = (project: Project): number => {
  if (project.marginRate != null && project.marginRate !== '') {
    return parseFloat(project.marginRate);
  }
  const contractAmount = project.payment.contractAmount;
  const internalCost = project.budget.internalCost;
  if (!contractAmount || contractAmount === 0) return 0;
  return ((contractAmount - internalCost) / contractAmount) * 100;
};

// 分析项目风险
const analyzeProjectRisks = (project: Project): string[] => {
  const risks: string[] = [];

  // 进度风险
  if (project.status === ProjectStatus.Delayed) {
    risks.push('进度风险');
  }
  if (project.status === ProjectStatus.Paused) {
    risks.push('进度风险');
  }

  // 成本风险
  const marginRate = calculateMarginRate(project);
  if (marginRate < 0) {
    risks.push('成本风险');
  }

  const totalBudget = project.budget?.totalBudget || 0;
  const usedBudget = project.budget?.budgetUsedAmount || 0;
  if (totalBudget > 0 && usedBudget > totalBudget) {
    risks.push('成本风险');
  }

  const plannedHours = project.manHours?.plannedTotal || 0;
  const actualHours = project.manHours?.pmoAnnualTotal || 0;
  if (plannedHours > 0) {
    const hourDeviationRate = ((actualHours - plannedHours) / plannedHours) * 100;
    if (hourDeviationRate > 20) {
      risks.push('成本风险');
    }
  }

  // 质量风险（简化判断）
  if (project.qualityRisks?.riskLevel) {
    risks.push('质量风险');
  }

  return risks;
};

const DashboardDrillDownModal: React.FC<DashboardDrillDownModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProject,
  drillData
}) => {
  if (!isOpen || !drillData) return null;

  const { title, projects, extraFields = [], filterInfo, module } = drillData;

  // 处理项目点击 - 先关闭模态框再跳转
  const handleProjectClick = (projectId: string) => {
    onClose();
    setTimeout(() => {
      onNavigateToProject(projectId);
    }, 100);
  };

  // 渲染额外字段值
  const renderExtraFieldValue = (project: Project, field: typeof extraFields[0]) => {
    switch (field.key) {
      case 'contractAmount':
        return formatCurrency(project.payment.contractAmount || 0);
      case 'confirmedRevenue':
        return formatCurrency(project.payment.annualConfirmedRevenue || 0);
      case 'kickoffDate':
        return formatDate(project.timeline.kickoffDate);
      case 'acceptanceDate':
        return formatDate(project.timeline.acceptanceDate);
      case 'marginRate':
        const mr = calculateMarginRate(project);
        return `${mr.toFixed(1)}%`;
      case 'projectType':
        if (project.isHighlight && project.isBenchmark) {
          return ['亮点工程', '标杆项目'];
        } else if (project.isHighlight) {
          return ['亮点工程'];
        } else if (project.isBenchmark) {
          return ['标杆项目'];
        }
        return [];
      case 'riskTypes':
        return analyzeProjectRisks(project);
      default:
        return '-';
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Accepted:
        return 'bg-emerald-100 text-emerald-600';
      case ProjectStatus.Delayed:
        return 'bg-rose-100 text-rose-600';
      case ProjectStatus.Paused:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  // 获取风险类型样式
  const getRiskStyle = (risk: string) => {
    if (risk.includes('进度')) return 'bg-rose-100 text-rose-600';
    if (risk.includes('成本')) return 'bg-amber-100 text-amber-600';
    if (risk.includes('质量')) return 'bg-purple-100 text-purple-600';
    return 'bg-gray-100 text-gray-600';
  };

  // 获取项目类型样式
  const getProjectTypeStyle = (type: string) => {
    if (type === '亮点工程') return 'bg-blue-100 text-blue-600';
    if (type === '标杆项目') return 'bg-indigo-100 text-indigo-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-slate-50 w-full max-w-6xl rounded-[2rem] shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
              {filterInfo && (
                <div className="text-sm text-slate-500 font-bold mt-1">{filterInfo}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400 font-bold">
              共 <span className="text-blue-600 font-black">{projects.length}</span> 个项目
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <div className="text-lg font-bold">暂无符合条件的项目</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 表头 */}
              <div className="bg-slate-100 rounded-xl px-6 py-3 flex items-center gap-6 text-xs font-black text-slate-500 uppercase tracking-wider">
                <div className="min-w-[200px] max-w-[300px] shrink-0">项目名称</div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-20 shrink-0 text-center">状态</div>
                  <div className="w-28 shrink-0">区域</div>
                  <div className="w-24 shrink-0">行业</div>
                  <div className="w-20 shrink-0">项目经理</div>
                </div>
                {extraFields.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-4 shrink-0">
                      {extraFields.map((field) => (
                        <div key={field.key} className="w-32 shrink-0">{field.label}</div>
                      ))}
                    </div>
                  </>
                )}
                <div className="w-5 shrink-0"></div>
              </div>

              {/* 项目列表 */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="bg-white rounded-2xl border border-slate-100 px-6 py-4 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group flex items-center gap-6"
                >
                  {/* 项目名称和编号 */}
                  <div className="min-w-[200px] max-w-[300px] shrink-0">
                    <div className="font-black text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate">
                      {project.projectName}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{project.projectCode}</div>
                  </div>

                  {/* 分隔线 */}
                  <div className="w-px h-10 bg-slate-100"></div>

                  {/* 基础信息 - 横向排列，固定宽度对齐 */}
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-20 shrink-0 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusStyle(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="w-28 shrink-0">
                      <span className="text-sm font-bold text-slate-700">{project.region}</span>
                    </div>
                    <div className="w-24 shrink-0">
                      <span className="text-sm font-bold text-slate-700">{project.industry || '-'}</span>
                    </div>
                    <div className="w-20 shrink-0">
                      <span className="text-sm font-bold text-slate-700">{project.members.projectManager || '-'}</span>
                    </div>
                  </div>

                  {/* 额外字段 - 横向排列，固定宽度对齐 */}
                  {extraFields.length > 0 && (
                    <>
                      <div className="w-px h-10 bg-slate-100"></div>
                      <div className="flex items-center gap-4 shrink-0">
                        {extraFields.map((field) => {
                          const value = renderExtraFieldValue(project, field);
                          return (
                            <div key={field.key} className="w-32 shrink-0">
                              {field.type === 'tags' && Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-1">
                                  {value.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 rounded text-xs font-bold ${getProjectTypeStyle(tag)}`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : field.key === 'riskTypes' && Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-1">
                                  {value.length > 0 ? value.map((risk, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 rounded text-xs font-bold ${getRiskStyle(risk)}`}
                                    >
                                      {risk}
                                    </span>
                                  )) : (
                                    <span className="text-sm text-slate-400">-</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-700">
                                  {field.type === 'currency' && typeof value === 'number' ? formatCurrency(value) : value}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* 箭头指示 */}
                  <div className="w-5 shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardDrillDownModal;