import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  Project,
  ProjectStatus,
  Region,
  ProjectLevel,
  ProjectType,
  MAJOR_REGIONS,
  MILESTONE_NODE_OPTIONS,
  PaymentNode,
  Product,
  ProjectProductItem,
  PROJECT_NATURE_OPTIONS
} from '../types';
import ProductService from '../services/ProductService';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
  initialData?: Project | null;
  title: string;
}

// 外部 InputField 组件，使用 key 来控制重新渲染
const InputField = memo(({ label, path, type = "text", placeholder = "", value, onChange }: {
  label: string,
  path: string,
  type?: string,
  placeholder?: string,
  value: string | number,
  onChange: (value: string | number) => void
}) => {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.label === nextProps.label &&
         prevProps.path === nextProps.path &&
         prevProps.type === nextProps.type &&
         prevProps.value === nextProps.value;
});

// 外部 SelectField 组件
const SelectField = memo(({ label, path, options, value, onChange }: {
  label: string,
  path: string,
  options: { label: string, value: any }[],
  value: string,
  onChange: (value: string) => void
}) => {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.label === nextProps.label &&
         prevProps.path === nextProps.path &&
         prevProps.value === nextProps.value &&
         prevProps.options.length === nextProps.options.length &&
         prevProps.options.every((opt, i) => opt.value === nextProps.options[i]?.value);
});

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'timeline' | 'financial' | 'execution'>('basic');
  const [showAcceptanceDatePrompt, setShowAcceptanceDatePrompt] = useState(false); // 验收日期提示框状态
  const [previousStatus, setPreviousStatus] = useState<string>(''); // 记录变更前的状态

  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]); // 所有产品列表
  const [projectProducts, setProjectProducts] = useState<ProjectProductItem[]>([]); // 当前项目的销售产品

  // Helper function to format date for input[type="date"]
  const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) return '';
    try {
      // If it's already a valid YYYY-MM-DD string, return as is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Parse and format the date
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        // Set defaults for new project
        setFormData({
          projectCode: '',
          projectName: '',
          status: ProjectStatus.Ongoing,
          region: Region.East,
          securityLevel: '公开',
          level: ProjectLevel.Regular,
          type: ProjectType.Dev,
          projectNature: [],
          industry: '',
          isBenchmark: false,
          isHighlight: false,
          timeline: {
            kickoffDate: '',
            plannedEndDate: '',
            contractEndDate: '',
            acceptanceDate: '',
            delayMonths: 0,
            acceptanceYear: new Date().getFullYear().toString(),
            acceptanceControl: '可控'
          },
          budget: {
            totalBudget: 0,
            human: 0,
            travel: 0,
            outsourcing: 0,
            procurement: 0,
            business: 0,
            risk: 0,
            review: 0,
            other: 0,
            initialQuote: 0,
            reqEvaluationFee: 0,
            internalCost: 0,
            internalProfit: 0,
            budgetUsedAmount: 0,
            outsourcingItems: []
          },
          payment: {
            contractName: '',
            groupCompany: '',
            contractAmount: 0,
            historicalPaid: 0,
            paid2026: 0,
            pending: 0,
            pendingThisYear: 0,
            ratio: 0,
            totalPaid: 0,
            annualConfirmedRevenue: 0,
            acceptedPendingRevenue: 0,
            // 新增确认收入和回款节点字段
            isConfirmed: false,
            confirmedDate: '',
            paymentNodes: []
          },
          manHours: {
            plannedTotal: 0,
            pmoAnnualTotal: 0,
            personnelDetails: []
          },
          execution: {
            progress: 0,
            inputPercent: 0
          },
          ratings: {
            preSalesTotal: 0,
            executionTotal: 0,
            qualityScoreRaw: 0,
            preSalesHard: [],
            preSalesSoft: [],
            executionHard: [],
            executionSoft: []
          },
          members: {
            projectManager: '',
            preSalesManager: '',
            salesManager: '',
            projectDirector: '',
            teamMembers: []
          },
          changes: [],
          milestones: { market: [], implementation: [], external: [] }
        });
      }
    }
  }, [initialData, isOpen]);

  // 加载产品列表
  useEffect(() => {
    if (isOpen) {
      ProductService.fetchAllProducts().then(result => {
        if (result.success) {
          setProducts(result.data);
        }
      });
    }
  }, [isOpen]);

  // 加载项目销售产品数据（编辑模式）
  useEffect(() => {
    if (isOpen && initialData?.id && (initialData.type === '销售项目' || initialData.type === '混合项目')) {
      ProductService.fetchProjectProducts(initialData.id).then(result => {
        if (result.success) {
          setProjectProducts(result.data.map(p => ({
            product_id: p.product_id,
            product_name: p.product_name || '',
            sales_amount: p.sales_amount || 0
          })));
        }
      });
    } else {
      setProjectProducts([]);
    }
  }, [isOpen, initialData?.id, initialData?.type]);

  const handleChange = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      // 当状态变为"已验收"时，如果验收日期为空，弹出提示框
      if (path === 'status' && (value === '已验收' || value === ProjectStatus.Accepted)) {
        const currentAcceptanceDate = current.timeline?.acceptanceDate || newData.timeline?.acceptanceDate;
        if (!currentAcceptanceDate || currentAcceptanceDate.trim() === '') {
          // 记录之前的状态，以便取消时恢复
          setPreviousStatus(prev.status || '');
          // 使用 setTimeout 确保状态更新后再显示提示框
          setTimeout(() => setShowAcceptanceDatePrompt(true), 0);
        }
      }

      // 当状态从"已验收"变为其他状态时，清空验收日期
      if (path === 'status' && String(prev.status) === '已验收' && String(value) !== '已验收') {
        if (newData.timeline) {
          newData.timeline = { ...newData.timeline, acceptanceDate: '' };
        } else {
          newData.timeline = { kickoffDate: '', plannedEndDate: '', contractEndDate: '', acceptanceDate: '', delayMonths: 0, acceptanceYear: new Date().getFullYear().toString(), acceptanceControl: '可控' };
        }
      }

      return newData;
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证：标杆或亮点项目必须填写项目亮点
    if ((formData.isBenchmark || formData.isHighlight) && !formData.projectHighlight?.trim()) {
      alert('标杆项目或亮点工程必须填写项目亮点！');
      return;
    }

    // 字数验证
    if (formData.projectHighlight && formData.projectHighlight.length > 500) {
      alert('项目亮点不能超过500字！');
      return;
    }

    // 验收日期验证：项目状态为"已验收"时，验收日期为必填
    const isAcceptedStatus = String(formData.status) === '已验收';
    if (isAcceptedStatus && !formData.timeline?.acceptanceDate?.trim()) {
      alert('项目状态为"已验收"时，实际验收日期为必填项！');
      return;
    }

    // 如果项目状态不是"已验收"，清空验收日期（可选逻辑，根据需求决定是否保留）
    if (!isAcceptedStatus && formData.timeline?.acceptanceDate) {
      // 可选：自动清空验收日期
      // formData.timeline.acceptanceDate = '';
    }

    setIsSubmitting(true);
    try {
      // 先保存项目数据
      await onSave(formData as Project);

      // 如果是销售项目或混合项目，保存产品销售数据
      if ((formData.type === '销售项目' || formData.type === '混合项目') && formData.id) {
        const productsToSave = projectProducts
          .filter(p => p.product_id && p.sales_amount >= 0)
          .map(p => ({
            product_id: p.product_id,
            sales_amount: p.sales_amount
          }));

        if (productsToSave.length > 0) {
          await ProductService.saveProjectProducts(formData.id, productsToSave);
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('保存失败，请检查数据。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // 辅助函数：获取嵌套对象的值
  const getValue = (obj: any, path: string) => {
    return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
  };

  // 选项定义 - 使用 useMemo 稳定引用
  const statusOptions = useMemo(() =>
    Object.values(ProjectStatus).map(s => ({ label: s, value: s })),
    []
  );
  const milestoneNodeOptions = useMemo(() =>
    MILESTONE_NODE_OPTIONS.map(o => ({ label: o.label, value: o.value })),
    []
  );
  const regionOptions = useMemo(() =>
    MAJOR_REGIONS.map(r => ({ label: r, value: r })),
    []
  );
  const securityLevelOptions = useMemo(() =>
    ['公开', '内部', '秘密'].map(s => ({ label: s, value: s })),
    []
  );
  const levelOptions = useMemo(() =>
    Object.values(ProjectLevel).map(l => ({ label: l, value: l })),
    []
  );
  const typeOptions = useMemo(() =>
    Object.values(ProjectType).map(t => ({ label: t, value: t })),
    []
  );
  const acceptanceControlOptions = useMemo(() =>
    ['可控', '不可控'].map(s => ({ label: s, value: s })),
    []
  );
  const mainWorkCompletedOptions = useMemo(() =>
    ['已完成', '未完成', '部分完成'].map(s => ({ label: s, value: s })),
    []
  );
  const industryOptions = useMemo(() =>
    ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'].map(s => ({ label: s, value: s })),
    []
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 h-full max-h-[90vh]">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 border border-slate-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
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
              className={`py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-10 pb-28 custom-scrollbar">
            {activeTab === 'basic' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <InputField
                  label="项目名称"
                  path="projectName"
                  placeholder="请输入项目完整名称"
                  value={formData.projectName ?? ''}
                  onChange={(v) => handleChange('projectName', v)}
                />
                <InputField
                  label="项目编号"
                  path="projectCode"
                  placeholder="如: PJ2025001"
                  value={formData.projectCode ?? ''}
                  onChange={(v) => handleChange('projectCode', v)}
                />
                <SelectField
                  label="项目状态"
                  path="status"
                  options={statusOptions}
                  value={formData.status ?? ''}
                  onChange={(v) => handleChange('status', v)}
                />
                <SelectField
                  label="里程碑节点"
                  path="milestoneNode"
                  options={milestoneNodeOptions}
                  value={formData.milestoneNode ?? ''}
                  onChange={(v) => handleChange('milestoneNode', v)}
                />
                <SelectField
                  label="所属区域"
                  path="region"
                  options={regionOptions}
                  value={formData.region ?? ''}
                  onChange={(v) => handleChange('region', v)}
                />
                <SelectField
                  label="所属行业"
                  path="industry"
                  options={industryOptions}
                  value={formData.industry ?? ''}
                  onChange={(v) => handleChange('industry', v)}
                />
                <SelectField
                  label="密级"
                  path="securityLevel"
                  options={securityLevelOptions}
                  value={formData.securityLevel ?? ''}
                  onChange={(v) => handleChange('securityLevel', v)}
                />
                <SelectField
                  label="项目级别"
                  path="level"
                  options={levelOptions}
                  value={formData.level ?? ''}
                  onChange={(v) => handleChange('level', v)}
                />
                <SelectField
                  label="项目类型"
                  path="type"
                  options={typeOptions}
                  value={formData.type ?? ''}
                  onChange={(v) => handleChange('type', v)}
                />
                <InputField
                  label="项目阶段"
                  path="phase"
                  value={formData.phase ?? ''}
                  onChange={(v) => handleChange('phase', v)}
                />
              </div>

              {/* 项目性质多选 */}
              <div className="flex flex-col space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">项目性质（可多选）</span>
                <div className="flex flex-wrap gap-3">
                  {PROJECT_NATURE_OPTIONS.map(option => (
                    <label
                      key={option}
                      className="flex items-center space-x-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={(formData.projectNature || []).includes(option)}
                        onChange={e => {
                          const current = formData.projectNature || [];
                          if (e.target.checked) {
                            handleChange('projectNature', [...current, option]);
                          } else {
                            handleChange('projectNature', current.filter((n: string) => n !== option));
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">特殊标志</span>
                <div className="flex space-x-8">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.isBenchmark || false}
                      onChange={e => handleChange('isBenchmark', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">设为标杆项目</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.isHighlight || false}
                      onChange={e => handleChange('isHighlight', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">设为亮点工程</span>
                  </label>
                </div>
                {/* 项目亮点字段 */}
                {(formData.isBenchmark || formData.isHighlight) && (
                  <div className="mt-2">
                    <label className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">项目亮点</span>
                      <span className="text-[10px] font-bold text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.projectHighlight || ''}
                      onChange={e => handleChange('projectHighlight', e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                      placeholder="请详细描述该项目的亮点之处（最多500字）..."
                    />
                    <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                      {(formData.projectHighlight || '').length} / 500 字
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">状态详细说明</label>
                <textarea
                  value={formData.statusComment || ''}
                  onChange={e => handleChange('statusComment', e.target.value)}
                  rows={3}
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                  placeholder="项目当前具体进展、里程碑达成情况或主要阻塞原因..."
                />
              </div>

              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-indigo-500 pl-3">时间节点</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputField
                    label="立项日期"
                    path="timeline.kickoffDate"
                    type="date"
                    value={formatDateForInput(formData.timeline?.kickoffDate)}
                    onChange={(v) => handleChange('timeline.kickoffDate', v)}
                  />
                  <InputField
                    label="合同结束日期"
                    path="timeline.contractEndDate"
                    type="date"
                    value={formatDateForInput(formData.timeline?.contractEndDate)}
                    onChange={(v) => handleChange('timeline.contractEndDate', v)}
                  />
                  <InputField
                    label="计划结束日期"
                    path="timeline.plannedEndDate"
                    type="date"
                    value={formatDateForInput(formData.timeline?.plannedEndDate)}
                    onChange={(v) => handleChange('timeline.plannedEndDate', v)}
                  />
                  <InputField
                    label="预测验收日期"
                    path="forecastAcceptanceDate"
                    type="date"
                    value={formatDateForInput(formData.forecastAcceptanceDate)}
                    onChange={(v) => handleChange('forecastAcceptanceDate', v)}
                  />
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      实际验收日期
                      {String(formData.status) === '已验收' && (
                        <span className="text-[10px] font-bold text-red-500">*</span>
                      )}
                      {String(formData.status) === '已验收' && (
                        <span className="text-[9px] text-amber-600">（已验收项目必填）</span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(formData.timeline?.acceptanceDate)}
                      onChange={(v) => handleChange('timeline.acceptanceDate', v)}
                      className={`bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all ${
                        String(formData.status) === '已验收'
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <InputField
                    label="验收单获取时间"
                    path="documentReceivedDate"
                    type="date"
                    value={formatDateForInput(formData.documentReceivedDate)}
                    onChange={(v) => handleChange('documentReceivedDate', v)}
                  />
                  <InputField
                    label="感谢信接收时间"
                    path="receivedThankYouDate"
                    type="date"
                    value={formatDateForInput(formData.receivedThankYouDate)}
                    onChange={(v) => handleChange('receivedThankYouDate', v)}
                  />
                  <InputField
                    label="验收年度"
                    path="timeline.acceptanceYear"
                    placeholder="2026"
                    value={formData.timeline?.acceptanceYear ?? ''}
                    onChange={(v) => handleChange('timeline.acceptanceYear', v)}
                  />
                  <SelectField
                    label="验收可控性"
                    path="timeline.acceptanceControl"
                    options={acceptanceControlOptions}
                    value={formData.timeline?.acceptanceControl ?? ''}
                    onChange={(v) => handleChange('timeline.acceptanceControl', v)}
                  />
                  <SelectField
                    label="主体工作完成情况"
                    path="mainWorkCompleted"
                    options={mainWorkCompletedOptions}
                    value={formData.mainWorkCompleted ?? ''}
                    onChange={(v) => handleChange('mainWorkCompleted', v)}
                  />
                  <InputField
                    label="延期天数"
                    path="timeline.delayMonths"
                    type="number"
                    value={formData.timeline?.delayMonths ?? 0}
                    onChange={(v) => handleChange('timeline.delayMonths', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-20">
              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-indigo-500 pl-3">合同与回款数据</h4>

                {/* 基础信息 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <InputField
                    label="合同名称"
                    path="payment.contractName"
                    value={formData.payment?.contractName ?? ''}
                    onChange={(v) => handleChange('payment.contractName', v)}
                  />
                  <InputField
                    label="集团公司"
                    path="payment.groupCompany"
                    value={formData.payment?.groupCompany ?? ''}
                    onChange={(v) => handleChange('payment.groupCompany', v)}
                  />
                  <InputField
                    label="合同总金额 (¥)"
                    path="payment.contractAmount"
                    type="number"
                    value={formData.payment?.contractAmount ?? 0}
                    onChange={(v) => handleChange('payment.contractAmount', v)}
                  />
                </div>

                {/* 确认收入 */}
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="text-sm font-black text-slate-700">确认收入</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.payment?.isConfirmed || false}
                          onChange={(e) => handleChange('payment.isConfirmed', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-bold text-slate-700">是否已确认收入</span>
                      </label>
                    </div>
                    {formData.payment?.isConfirmed && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">确认收入日期</label>
                        <input
                          type="date"
                          value={formatDateForInput(formData.payment?.confirmedDate)}
                          onChange={(e) => handleChange('payment.confirmedDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 回款节点表格 */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="text-sm font-black text-slate-700">回款节点</h5>
                    <button
                      type="button"
                      onClick={() => {
                        const newNodes: PaymentNode[] = [...(formData.payment?.paymentNodes || []), {
                          nodeName: '',
                          expectedAmount: 0,
                          actualAmount: 0,
                          paymentDate: ''
                        }];
                        handleChange('payment.paymentNodes', newNodes);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>添加回款节点</span>
                    </button>
                  </div>

                  {/* 回款节点表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] text-slate-400 bg-slate-100/50">
                        <tr>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-left">回款节点</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-right">应回款额度 (¥)</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-right">实际回款额度 (¥)</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest">回款时间</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.payment?.paymentNodes?.map((node: PaymentNode, index: number) => (
                          <tr key={index} className="border-b border-slate-100">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={node.nodeName}
                                onChange={(e) => {
                                  const newNodes = [...(formData.payment?.paymentNodes || [])];
                                  newNodes[index].nodeName = e.target.value;
                                  handleChange('payment.paymentNodes', newNodes);
                                }}
                                placeholder="节点名称"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={node.expectedAmount || 0}
                                onChange={(e) => {
                                  const newNodes = [...(formData.payment?.paymentNodes || [])];
                                  newNodes[index].expectedAmount = Number(e.target.value);
                                  handleChange('payment.paymentNodes', newNodes);
                                }}
                                placeholder="应回款额"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={node.actualAmount || 0}
                                onChange={(e) => {
                                  const newNodes = [...(formData.payment?.paymentNodes || [])];
                                  newNodes[index].actualAmount = Number(e.target.value);
                                  handleChange('payment.paymentNodes', newNodes);
                                }}
                                placeholder="实际回款"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={formatDateForInput(node.paymentDate)}
                                onChange={(e) => {
                                  const newNodes = [...(formData.payment?.paymentNodes || [])];
                                  newNodes[index].paymentDate = e.target.value;
                                  handleChange('payment.paymentNodes', newNodes);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const newNodes = formData.payment?.paymentNodes?.filter((_, i) => i !== index) || [];
                                  handleChange('payment.paymentNodes', newNodes);
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs font-bold">
                              暂无回款节点，点击"添加回款节点"开始添加
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 统计信息 */}
                  {formData.payment?.paymentNodes && formData.payment.paymentNodes.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">应回款总额</div>
                          <div className="text-sm font-black text-slate-700">
                            {formData.payment.paymentNodes.reduce((sum, node) => sum + (node.expectedAmount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">已回款总额</div>
                          <div className="text-sm font-black text-indigo-600">
                            {formData.payment.paymentNodes.reduce((sum, node) => sum + (node.actualAmount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">剩余回款</div>
                          <div className="text-sm font-black text-amber-600">
                            {Math.max(0, (formData.payment?.contractAmount || 0) - formData.payment.paymentNodes.reduce((sum, node) => sum + (node.actualAmount || 0), 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-emerald-500 pl-3">预算与成本控制</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    label="预算总额 (¥)"
                    path="budget.totalBudget"
                    type="number"
                    value={formData.budget?.totalBudget ?? 0}
                    onChange={(v) => handleChange('budget.totalBudget', v)}
                  />
                  <InputField
                    label="初步报价 (¥)"
                    path="budget.initialQuote"
                    type="number"
                    value={formData.budget?.initialQuote ?? 0}
                    onChange={(v) => handleChange('budget.initialQuote', v)}
                  />
                  <InputField
                    label="内部预估成本 (¥)"
                    path="budget.internalCost"
                    type="number"
                    value={formData.budget?.internalCost ?? 0}
                    onChange={(v) => handleChange('budget.internalCost', v)}
                  />
                  <InputField
                    label="内部预估利润 (¥)"
                    path="budget.internalProfit"
                    type="number"
                    value={formData.budget?.internalProfit ?? 0}
                    onChange={(v) => handleChange('budget.internalProfit', v)}
                  />
                  <InputField
                    label="已使用预算金额 (¥)"
                    path="budget.budgetUsedAmount"
                    type="number"
                    value={formData.budget?.budgetUsedAmount ?? 0}
                    onChange={(v) => handleChange('budget.budgetUsedAmount', v)}
                  />
                  <InputField
                    label="项目毛利率 (%)"
                    path="marginRate"
                    value={formData.marginRate ?? ''}
                    onChange={(v) => handleChange('marginRate', v)}
                  />
                </div>
              </div>

              {/* 销售产品 - 仅销售项目和混合项目显示 */}
              {(formData.type === '销售项目' || formData.type === '混合项目') && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="text-sm font-black text-slate-700">销售产品</h5>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectProducts(prev => [...prev, { product_id: 0, product_name: '', sales_amount: 0 }]);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>添加销售产品</span>
                    </button>
                  </div>

                  {/* 销售产品表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] text-slate-400 bg-slate-100/50">
                        <tr>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-left">产品名称</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest text-right">销售金额 (¥)</th>
                          <th className="px-4 py-3 font-black uppercase tracking-widest">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectProducts.length > 0 ? projectProducts.map((item, index) => (
                          <tr key={index} className="border-b border-slate-100">
                            <td className="px-4 py-3">
                              <select
                                value={item.product_id || ''}
                                onChange={(e) => {
                                  const productId = Number(e.target.value);
                                  const selectedProduct = products.find(p => p.id === productId);
                                  setProjectProducts(prev => {
                                    const newItems = [...prev];
                                    newItems[index] = {
                                      product_id: productId,
                                      product_name: selectedProduct?.name || '',
                                      sales_amount: item.sales_amount
                                    };
                                    return newItems;
                                  });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              >
                                <option value="">请选择产品</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.sales_amount || 0}
                                onChange={(e) => {
                                  setProjectProducts(prev => {
                                    const newItems = [...prev];
                                    newItems[index] = { ...newItems[index], sales_amount: Number(e.target.value) };
                                    return newItems;
                                  });
                                }}
                                placeholder="销售金额"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setProjectProducts(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-xs font-bold">
                              暂无销售产品，点击"添加销售产品"开始添加
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 统计信息 */}
                  {projectProducts.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">产品数量</div>
                          <div className="text-sm font-black text-slate-700">{projectProducts.length} 种</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">销售总额</div>
                          <div className="text-sm font-black text-indigo-600">
                            ¥{projectProducts.reduce((sum, item) => sum + (item.sales_amount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-amber-500 pl-3">外协与采购</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    label="外协单位名称"
                    path="outsourcerName"
                    value={formData.outsourcerName ?? ''}
                    onChange={(v) => handleChange('outsourcerName', v)}
                  />
                  <InputField
                    label="外协采购金额 (¥)"
                    path="outsourcerAmount"
                    type="number"
                    value={formData.outsourcerAmount ?? 0}
                    onChange={(v) => handleChange('outsourcerAmount', v)}
                  />
                  <InputField
                    label="外协采购占比 (%)"
                    path="outsourcerRatio"
                    value={formData.outsourcerRatio ?? ''}
                    onChange={(v) => handleChange('outsourcerRatio', v)}
                  />
                  <div className="md:col-span-2">
                    <InputField
                      label="采购设备规格/技术内容"
                      path="outsourcerTechContent"
                      value={formData.outsourcerTechContent ?? ''}
                      onChange={(v) => handleChange('outsourcerTechContent', v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'execution' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-20">
               <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-blue-500 pl-3">核心管理团队</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InputField
                    label="项目经理"
                    path="members.projectManager"
                    value={formData.members?.projectManager ?? ''}
                    onChange={(v) => handleChange('members.projectManager', v)}
                  />
                  <InputField
                    label="项目总监"
                    path="members.projectDirector"
                    value={formData.members?.projectDirector ?? ''}
                    onChange={(v) => handleChange('members.projectDirector', v)}
                  />
                  <InputField
                    label="销售经理"
                    path="members.salesManager"
                    value={formData.members?.salesManager ?? ''}
                    onChange={(v) => handleChange('members.salesManager', v)}
                  />
                  <InputField
                    label="售前经理"
                    path="members.preSalesManager"
                    value={formData.members?.preSalesManager ?? ''}
                    onChange={(v) => handleChange('members.preSalesManager', v)}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 border-l-4 border-indigo-400 pl-3">执行进度与工时</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InputField
                    label="计划总投入 (人周)"
                    path="manHours.plannedTotal"
                    type="number"
                    value={formData.manHours?.plannedTotal ?? 0}
                    onChange={(v) => handleChange('manHours.plannedTotal', v)}
                  />
                  <InputField
                    label="实际已填报 (人周)"
                    path="manHours.pmoAnnualTotal"
                    type="number"
                    value={formData.manHours?.pmoAnnualTotal ?? 0}
                    onChange={(v) => handleChange('manHours.pmoAnnualTotal', v)}
                  />
                  <InputField
                    label="投入百分比 (%)"
                    path="execution.inputPercent"
                    type="number"
                    value={formData.execution?.inputPercent ?? 0}
                    onChange={(v) => handleChange('execution.inputPercent', v)}
                  />
                  <InputField
                    label="进度百分比 (%)"
                    path="execution.progress"
                    type="number"
                    value={formData.execution?.progress ?? 0}
                    onChange={(v) => handleChange('execution.progress', v)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">备注信息</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={e => handleChange('remarks', e.target.value)}
                  rows={4}
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                  placeholder="请输入其他需要说明的项目背景、变更历史摘要或后续计划点..."
                />
              </div>
            </div>
          )}
          </div>

          {/* Footer */}
          <div className="px-10 py-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 sticky bottom-0 z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
              * 请确保所有关键财务数据准确无误
            </p>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-xs font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-10 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest flex items-center space-x-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{initialData ? '保存修改' : '创建项目'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* 验收日期填写提示框 */}
        {showAcceptanceDatePrompt && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 animate-in zoom-in-95 duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">需要填写验收日期</h4>
                  <p className="text-xs text-slate-500">已验收项目必须填写实际验收日期</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  实际验收日期
                  <span className="text-[10px] font-bold text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formatDateForInput(formData.timeline?.acceptanceDate)}
                  onChange={(e) => handleChange('timeline.acceptanceDate', e.target.value)}
                  className="w-full mt-1.5 bg-slate-50 border border-amber-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // 取消时恢复到之前的状态
                    handleChange('status', previousStatus);
                    setShowAcceptanceDatePrompt(false);
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (formData.timeline?.acceptanceDate && formData.timeline.acceptanceDate.trim() !== '') {
                      setShowAcceptanceDatePrompt(false);
                    } else {
                      alert('请填写实际验收日期！');
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-all shadow-lg uppercase tracking-widest"
                >
                  确认填写
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectFormModal;