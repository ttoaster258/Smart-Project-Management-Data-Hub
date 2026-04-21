import React, { useState, useEffect, useMemo } from 'react';
import {
  Project,
  ProjectChange,
  MILESTONE_NODE_LABELS,
  ProjectProduct
} from '../types';
import { normalizeSecurityLevel } from '../constants';
import ProjectDataService from '../services/ProjectDataService';
import ProductService from '../services/ProductService';
import API_BASE_URL from '../config/api.config';

interface ProgressUpdate {
  id: number;
  projectId: string;
  updateText: string;
  updateTime: string;
  updatePm: string;
}

interface DetailPanelProps {
  project: Project;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
  onEdit?: (project: Project) => void;
  isAdmin?: boolean;
}

const ProjectDetailPanel: React.FC<DetailPanelProps> = ({ project, onClose, onEdit, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'timeline' | 'financial' | 'execution'>('basic');
  const [projectChanges, setProjectChanges] = useState<ProjectChange[]>([]);
  const [selectedChange, setSelectedChange] = useState<ProjectChange | null>(null);
  const [projectProducts, setProjectProducts] = useState<ProjectProduct[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [showAnnotation, setShowAnnotation] = useState(true);

  // 获取项目变更记录
  useEffect(() => {
    if (project.id) {
      ProjectDataService.fetchProjectChanges(project.id).then(setProjectChanges);
    }
  }, [project.id]);

  // 获取项目销售产品数据（仅销售项目和混合项目）
  useEffect(() => {
    if (project.id && (project.type === '销售项目' || project.type === '混合项目')) {
      ProductService.fetchProjectProducts(project.id).then(result => {
        if (result.success) {
          setProjectProducts(result.data);
        }
      });
    } else {
      setProjectProducts([]);
    }
  }, [project.id, project.type]);

  // 获取项目进展更新记录
  useEffect(() => {
    if (project.id) {
      const token = localStorage.getItem('authToken');
      fetch(`${API_BASE_URL}/progress-updates/project/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            setProgressUpdates(result.data);
          }
        })
        .catch(err => console.error('获取进展更新失败:', err));
    }
  }, [project.id]);

  // 获取该项目的所有变更记录（用于上次/下次变更）
  const projectChangesList = useMemo(() => {
    if (!selectedChange) return [];
    return projectChanges.sort((a, b) => (a.changeCount || 0) - (b.changeCount || 0));
  }, [projectChanges, selectedChange]);

  // 查找上次变更
  const previousChange = useMemo(() => {
    if (!selectedChange) return null;
    const currentIndex = projectChangesList.findIndex(c => c.id === selectedChange.id);
    if (currentIndex > 0) {
      return projectChangesList[currentIndex - 1];
    }
    return null;
  }, [projectChangesList, selectedChange]);

  // 查找下次变更
  const nextChange = useMemo(() => {
    if (!selectedChange) return null;
    const currentIndex = projectChangesList.findIndex(c => c.id === selectedChange.id);
    if (currentIndex < projectChangesList.length - 1) {
      return projectChangesList[currentIndex + 1];
    }
    return null;
  }, [projectChangesList, selectedChange]);

  // 计算延期天数（今天日期 - 计划结束日期）
  const calculatedDelayDays = useMemo(() => {
    const plannedEndDate = project.timeline?.plannedEndDate;
    if (!plannedEndDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planned = new Date(plannedEndDate);
    planned.setHours(0, 0, 0, 0);

    // 如果今天 <= 计划结束日期，无延期
    if (today <= planned) return 0;

    const diffTime = today.getTime() - planned.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [project.timeline?.plannedEndDate]);

  const InfoRow = ({ label, value, gridSpan = "col-span-1", valueBold = false, valueRed = false }: { label: string, value: string | number | undefined | null, gridSpan?: string, valueBold?: boolean, valueRed?: boolean }) => (
    <div className={`${gridSpan} py-3 border-b border-slate-100 flex flex-col justify-center min-h-[64px]`}>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</label>
      <div className={`text-sm font-black text-slate-800 break-words ${valueBold ? 'font-black text-slate-900' : ''} ${valueRed ? 'text-red-600' : ''}`}>
        {value != null && value !== '' ? value.toLocaleString() : <span className="text-slate-300">-</span>}
      </div>
    </div>
  );

  const SectionTitle = ({ title, sub, color = "indigo" }: { title: string, sub?: string, color?: "indigo" | "emerald" | "amber" | "blue" }) => {
    const colorClasses = {
      indigo: "border-indigo-500",
      emerald: "border-emerald-500",
      amber: "border-amber-500",
      blue: "border-blue-500"
    };
    return (
      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 pl-3" style={{ borderColor: color === "indigo" ? "#6366f1" : color === "emerald" ? "#10b981" : color === "amber" ? "#f59e0b" : "#3b82f6" }}>
        {title}
      </h4>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative w-full max-w-7xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex h-full max-h-[90vh]">
        {/* 左侧主内容区域 */}
        <div className={`flex flex-col transition-all duration-300 ${showAnnotation ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
          {/* Header */}
          <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{project.projectName}</h3>
                <span className="text-xs font-mono text-slate-400">{project.projectCode}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 切换批注按钮 */}
              <button
                onClick={() => setShowAnnotation(!showAnnotation)}
                className={`p-2 rounded-full transition-colors border ${showAnnotation ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
                title={showAnnotation ? '隐藏进展更新' : '显示进展更新'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <span className={`w-2 h-2 rounded-full ${project.status === '延期' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="text-xs font-black text-slate-700 uppercase">{project.status}</span>
              </div>
              {isAdmin && onEdit && (
                <button
                  onClick={() => onEdit(project)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>编辑</span>
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 border border-slate-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-10 py-2 border-b border-slate-100 flex space-x-8 bg-white overflow-x-auto shrink-0 no-scrollbar">
          {[
            { id: 'basic', label: '基础信息' },
            { id: 'financial', label: '财务与预算' },
            { id: 'execution', label: '执行与团队' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <SectionTitle title="项目基础信息" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoRow label="项目编号" value={project.projectCode} />
                <InfoRow label="项目名称" value={project.projectName} />
                {/* 项目状态 - 带状态说明悬浮框 */}
                <div className="col-span-1 py-3 border-b border-slate-100 flex flex-col justify-center min-h-[64px]">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">项目状态</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">{project.status}</span>
                    {project.statusComment && (
                      <div className="relative group">
                        <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <div className="text-[10px] text-slate-400 mb-1">状态说明</div>
                          <div className="leading-relaxed">{project.statusComment}</div>
                          <div className="absolute left-3 -bottom-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <InfoRow label="里程碑节点" value={project.milestoneNode ? MILESTONE_NODE_LABELS[project.milestoneNode] : ''} />
                <InfoRow label="所属区域" value={project.region} />
                <InfoRow label="所属行业" value={project.industry} />
                <InfoRow label="密级" value={normalizeSecurityLevel(project.securityLevel)} />
                <InfoRow label="项目级别" value={project.level} />
                <InfoRow label="项目类型" value={project.type} />
                {/* 项目性质 */}
                <div className="col-span-1 py-3 border-b border-slate-100 flex flex-col justify-center min-h-[64px]">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">项目性质</label>
                  <div className="flex flex-wrap gap-1.5">
                    {project.projectNature && project.projectNature.length > 0 ? (
                      project.projectNature.map((nature, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-indigo-50 rounded text-xs font-bold text-indigo-700 border border-indigo-200"
                        >
                          {nature}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>
                </div>
                <InfoRow label="项目阶段" value={project.phase} />
              </div>

              <div className="flex items-center space-x-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${project.isBenchmark ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                  <span className="text-sm font-bold text-slate-600">标杆项目: {project.isBenchmark ? '是' : '否'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${project.isHighlight ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className="text-sm font-bold text-slate-600">亮点工程: {project.isHighlight ? '是' : '否'}</span>
                </div>
              </div>

              {/* 项目亮点展示 */}
              {(project.isBenchmark || project.isHighlight) && project.projectHighlight && (
                <div>
                  <SectionTitle title="项目亮点" color="amber" />
                  <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {project.projectHighlight}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <SectionTitle title="时间节点追踪" />

              {/* 项目周期 - 单独一行 */}
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mr-4">项目周期</div>
                  <div className="text-lg font-black text-indigo-700">{project.projectCycle || '-- 至 --'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoRow label="立项日期" value={project.timeline.kickoffDate} valueBold />
                <InfoRow label="计划结束日期" value={project.timeline.plannedEndDate} />
                <InfoRow label="合同结束日期" value={project.timeline.contractEndDate} />
                <InfoRow label="预测验收时间" value={project.forecastAcceptanceDate} />
                <InfoRow label="实际验收日期" value={project.timeline.acceptanceDate} valueBold />
                <InfoRow label="延期天数" value={calculatedDelayDays > 0 ? `${calculatedDelayDays} 天` : '无延期'} valueRed={calculatedDelayDays > 0} />
                <InfoRow label="验收单获取时间" value={project.documentReceivedDate} />
                <InfoRow label="感谢信接收时间" value={project.receivedThankYouDate} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">验收可控性</div>
                  <div className="text-xl font-black text-slate-800">{project.timeline.acceptanceControl || '未判定'}</div>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">主体工作完成情况</div>
                  <div className={`text-xl font-black ${project.mainWorkCompleted === '已完成' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {project.mainWorkCompleted || '实施中'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <SectionTitle title="合同与回款数据" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow label="合同名称" value={project.payment.contractName} />
                  <InfoRow label="集团公司" value={project.payment.groupCompany} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  <div className="py-3 border-b border-slate-100 flex flex-col justify-center min-h-[64px]">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">合同总额</label>
                    <div className="text-sm font-black text-slate-800">
                      {project.payment.contractAmount ? `¥${project.payment.contractAmount.toLocaleString()}` : <span className="text-slate-300">-</span>}
                    </div>
                  </div>
                  <div className="py-3 border-b border-slate-100 flex flex-col justify-center min-h-[64px]">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">确认收入</label>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${project.payment.isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {project.payment.isConfirmed ? '已确认' : '未确认'}
                      </span>
                      {project.payment.isConfirmed && project.payment.confirmedDate && (
                        <span className="text-xs font-bold text-slate-600">{project.payment.confirmedDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 回款节点表格 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h5 className="text-sm font-black text-slate-700 mb-4">回款节点</h5>
                {project.payment.paymentNodes && project.payment.paymentNodes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400 bg-slate-100/50">
                        <tr>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-center">回款节点</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-center">应回款额度 (¥)</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-center">实际回款额度 (¥)</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-center">回款时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.payment.paymentNodes.map((node: any, index: number) => (
                          <tr key={index} className="border-b border-slate-100">
                            <td className="px-4 py-3 text-sm font-bold text-slate-700 text-center">{node.nodeName || '-'}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-700 text-center">{(node.expectedAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-center">{(node.actualAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-700 text-center">{node.paymentDate || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm font-bold">
                    暂无回款节点
                  </div>
                )}

                {/* 统计信息 */}
                {project.payment.paymentNodes && project.payment.paymentNodes.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">应回款总额</div>
                        <div className="text-base font-black text-slate-700">
                          {project.payment.paymentNodes.reduce((sum: number, node: any) => sum + (node.expectedAmount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">已回款总额</div>
                        <div className="text-base font-black text-indigo-600">
                          {project.payment.paymentNodes.reduce((sum: number, node: any) => sum + (node.actualAmount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">剩余回款</div>
                        <div className="text-base font-black text-amber-600">
                          {Math.max(0, (project.payment.contractAmount || 0) - project.payment.paymentNodes.reduce((sum: number, node: any) => sum + (node.actualAmount || 0), 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <SectionTitle title="预算与成本控制" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoRow label="预算总额" value={project.budget.totalBudget ? `¥${project.budget.totalBudget.toLocaleString()}` : '-'} />
                  <InfoRow label="初步报价" value={project.budget.initialQuote ? `¥${project.budget.initialQuote.toLocaleString()}` : '-'} />
                  <InfoRow label="内部预估成本" value={project.budget.internalCost ? `¥${project.budget.internalCost.toLocaleString()}` : '-'} />
                  <InfoRow label="内部预估利润" value={project.budget.internalProfit ? `¥${project.budget.internalProfit.toLocaleString()}` : '-'} />
                  <InfoRow label="已使用预算金额" value={project.budget.budgetUsedAmount ? `¥${project.budget.budgetUsedAmount.toLocaleString()}` : '-'} />
                  <InfoRow label="项目毛利率" value={project.marginRate} />
                </div>
              </div>

              {/* 销售产品 - 仅销售项目和混合项目显示 */}
              {(project.type === '销售项目' || project.type === '混合项目') && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h5 className="text-sm font-black text-slate-700 mb-4">销售产品</h5>
                  {projectProducts && projectProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 bg-slate-100/50">
                          <tr>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-center">产品名称</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-center">销售金额 (¥)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectProducts.map((item, index) => (
                            <tr key={item.id || index} className="border-b border-slate-100">
                              <td className="px-4 py-3 text-sm font-bold text-slate-700 text-center">{item.product_name || '-'}</td>
                              <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-center">{(item.sales_amount || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm font-bold">
                      暂无销售产品数据
                    </div>
                  )}

                  {/* 统计信息 */}
                  {projectProducts && projectProducts.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">产品数量</div>
                          <div className="text-base font-black text-slate-700">{projectProducts.length} 种</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">销售总额</div>
                          <div className="text-base font-black text-indigo-600">
                            ¥{projectProducts.reduce((sum, item) => sum + (item.sales_amount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 外协与采购 - 仅在有数据时显示 */}
              {(project.outsourcerName || project.outsourcerAmount || project.outsourcerRatio || project.outsourcerTechContent || project.equipmentSpec) && (
                <>
                  <SectionTitle title="外协与采购" color="amber" />
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InfoRow label="外协单位名称" value={project.outsourcerName} />
                      <InfoRow label="外协采购金额" value={project.outsourcerAmount ? `¥${project.outsourcerAmount.toLocaleString()}` : '-'} />
                      <InfoRow label="外协采购占比" value={project.outsourcerRatio} />
                      <InfoRow label="技术内容及设备规格" value={`${project.outsourcerTechContent || ''} ${project.equipmentSpec || ''}`} gridSpan="col-span-3" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'execution' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <SectionTitle title="核心管理团队" color="blue" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InfoRow label="项目经理" value={project.members.projectManager} />
                  <InfoRow label="项目总监" value={project.members.projectDirector} />
                  <InfoRow label="销售经理" value={project.members.salesManager} />
                  <InfoRow label="售前经理" value={project.members.preSalesManager} />
                </div>
              </div>

              <SectionTitle title="项目成员" color="indigo" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                {(project.members.teamMembers && project.members.teamMembers.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {project.members.teamMembers.map((member, index) => (
                      <div key={index} className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="font-black text-slate-800 text-sm mb-1">{member.name}</div>
                        <div className="text-xs font-bold text-slate-500">{member.role}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-sm font-bold">暂无项目成员</div>
                )}
              </div>

              <SectionTitle title="执行进度与工时" color="indigo" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow label="计划总投入 (人周)" value={project.manHours.plannedTotal} />
                  <InfoRow label="实际已填报 (人周)" value={project.manHours.pmoAnnualTotal} />
                </div>

                {/* 进度条区域 */}
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-6">
                  {/* 投入百分比进度条 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">投入百分比</span>
                      <span className="text-sm font-black text-blue-600">{(project.execution.inputPercent || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, project.execution.inputPercent || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* 进度百分比进度条 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">进度百分比</span>
                      <span className="text-sm font-black text-indigo-600">{(project.execution.progress || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, project.execution.progress || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <SectionTitle title="备注信息" />
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 min-h-[100px]">
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  {project.remarks || '无其他补充项'}
                </p>
              </div>

              {/* 变更情况 */}
              <SectionTitle title="变更情况" color="blue" />
              <div className="space-y-3">
                {projectChanges && projectChanges.length > 0 ? (
                  projectChanges.map((change, index) => (
                    <button
                      key={change.id || index}
                      onClick={() => setSelectedChange(change)}
                      className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                            {change.changeCount || index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{change.type}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {change.changeDate || '-'} · {change.reasonCategory || ''}
                            </div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <span className="text-sm font-bold text-slate-400">暂无变更记录</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 变更详情弹窗 */}
      {selectedChange && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedChange(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-black text-slate-800">变更详情</h3>
              </div>
              <button
                onClick={() => setSelectedChange(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 border border-slate-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 项目基本信息 */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">项目基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">项目名称</p>
                    <p className="text-sm font-bold text-slate-800">{project.projectName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">项目编号</p>
                    <p className="text-sm font-medium text-slate-600">{project.projectCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">项目经理</p>
                    <p className="text-sm font-medium text-slate-600">{project.members.projectManager}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">所属区域</p>
                    <p className="text-sm font-medium text-slate-600">{project.region}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">项目级别</p>
                    <p className="text-sm font-medium text-slate-600">{project.level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更类型</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedChange.type === '人员变更' ? 'bg-blue-100 text-blue-800' :
                      selectedChange.type === '预算变更' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedChange.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* 变更信息 */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">变更信息</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更次数</p>
                    <p className="text-sm font-black text-slate-800">第 {selectedChange.changeCount} 次变更</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更通过时间</p>
                    <p className="text-sm font-medium text-slate-600">{selectedChange.changeDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更内容</p>
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg">{selectedChange.content}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更原因概括</p>
                    <p className="text-sm font-medium text-slate-700">{selectedChange.reasonCategory}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">变更原因详情</p>
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg">{selectedChange.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">影响绩效</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedChange.impactsPerformance ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedChange.impactsPerformance ? '是' : '否'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - 上次/下次变更 */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => previousChange && setSelectedChange(previousChange)}
                disabled={!previousChange}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  previousChange
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                上次变更
              </button>
              <button
                onClick={() => nextChange && setSelectedChange(nextChange)}
                disabled={!nextChange}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  nextChange
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                下次变更
              </button>
            </div>
          </div>
        </div>
      )}

        {/* 右侧批注附页 - 进展更新 */}
        {showAnnotation && (
          <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
            <div className="px-4 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">进展更新</h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">共 {progressUpdates.length} 条记录</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {progressUpdates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm font-bold text-slate-400">暂无进展更新</p>
                </div>
              ) : (
                progressUpdates.map((update, index) => (
                  <div key={update.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* 批注连接线样式 */}
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-100"></div>
                      <div className="absolute left-3 top-4 w-2 h-2 rounded-full bg-indigo-500 border-2 border-white"></div>

                      <div className="pl-8 pr-4 pt-4 pb-3">
                        {/* 时间和更新人 */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {formatDateTime(update.updateTime)}
                          </span>
                          {update.updatePm && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {update.updatePm}
                            </span>
                          )}
                        </div>

                        {/* 进展内容 */}
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {update.updateText}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 格式化日期时间辅助函数
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

export default ProjectDetailPanel;