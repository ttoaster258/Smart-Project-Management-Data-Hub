import React, { useState, useRef, useEffect } from 'react';
import { FilterState, Region, ProjectStatus, ProjectLevel, ProjectType, MILESTONE_NODE_OPTIONS } from '../types';

interface AdvancedSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterUpdate: (newFilters: FilterState) => void;
  allData: {
    managers: string[];
    directors: string[];
    sales: string[];
    preSales: string[];
    industries: string[];
    years: string[];
    natures: string[];
    phases: string[];
    securityLevels: string[];
    regions: Region[];
  };
}

const AdvancedSearchDropdown: React.FC<AdvancedSearchDropdownProps> = ({ isOpen, onClose, filters, onFilterUpdate, allData }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'timeline' | 'financial' | 'execution'>('basic');

  // 下拉多选组件 - 紧凑可视化设计
  const DropdownSelect = ({ label, items, filterKey }: { label: string, items: string[], filterKey: keyof FilterState }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedValues = (filters[filterKey] as any[]) || [];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleFilter = (value: any) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter(x => x !== value)
        : [...selectedValues, value];
      onFilterUpdate({ ...filters, [filterKey]: next });
    };

    return (
      <div className="flex flex-col space-y-1 relative w-full mb-3" ref={containerRef}>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{label}</label>
        <div
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`min-h-[32px] px-2 py-1 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50/50 ${isMenuOpen ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-200'}`}
        >
          <div className="flex flex-wrap gap-1 overflow-hidden pr-2">
            {selectedValues.length === 0 ? (
              <span className="text-xs text-slate-300">全部</span>
            ) : (
              selectedValues.map(v => (
                <span key={v} className="bg-indigo-50 text-indigo-600 text-[10px] px-1 py-0 rounded border border-indigo-100 font-bold whitespace-nowrap">
                  {v}
                </span>
              ))
            )}
          </div>
          <svg className={`shrink-0 w-3 h-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isMenuOpen && (
          <div className="absolute top-[calc(100%+2px)] left-0 w-full min-w-[200px] bg-white border border-slate-100 rounded-lg shadow-xl z-[110] py-1 overflow-hidden">
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {items.map(item => (
                <div
                  key={item}
                  onClick={() => toggleFilter(item)}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors ${selectedValues.includes(item) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                >
                  <div className={`w-3 h-3 border rounded flex items-center justify-center transition-all ${selectedValues.includes(item) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}`}>
                    {selectedValues.includes(item) && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 数字范围输入 - 极简紧凑
  const RangeInput = ({ label, minVal, maxVal, unit, filterKey }: { label: string, minVal: number | null, maxVal: number | null, unit?: string, filterKey: keyof FilterState }) => {
    return (
      <div className="flex flex-col space-y-1 mb-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{label} <span className="text-slate-300 font-normal">({unit})</span></label>
        <div className="flex items-center space-x-1.5">
          <input
            type="number"
            placeholder="Min"
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            value={minVal ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              onFilterUpdate({ ...filters, [filterKey]: [val, maxVal] });
            }}
          />
          <span className="text-slate-300 font-bold text-[10px]">-</span>
          <input
            type="number"
            placeholder="Max"
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            value={maxVal ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              onFilterUpdate({ ...filters, [filterKey]: [minVal, val] });
            }}
          />
        </div>
      </div>
    );
  };

  // 日期范围输入 - 极简紧凑
  const DateRangeInput = ({ label, startVal, endVal, filterKey }: { label: string, startVal: string | null, endVal: string | null, filterKey: keyof FilterState }) => {
    return (
      <div className="flex flex-col space-y-1 mb-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{label}</label>
        <div className="flex items-center space-x-1.5">
          <input
            type="date"
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
            value={startVal ?? ''}
            onChange={(e) => {
              onFilterUpdate({ ...filters, [filterKey]: [e.target.value || null, endVal] });
            }}
          />
          <span className="text-slate-300 font-bold text-[10px]">-</span>
          <input
            type="date"
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
            value={endVal ?? ''}
            onChange={(e) => {
              onFilterUpdate({ ...filters, [filterKey]: [startVal, e.target.value || null] });
            }}
          />
        </div>
      </div>
    );
  };

  // 三态切换组件 - 极简紧凑
  const ToggleSelect = ({ label, value, filterKey, isBenchmark = false }: { label: string, value: boolean | null, filterKey: keyof FilterState, isBenchmark?: boolean }) => (
    <div className="flex flex-col space-y-1 mb-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{label}</label>
      <div className="flex bg-slate-100/50 p-0.5 rounded-lg border border-slate-200">
        {[
          { label: '全部', val: null },
          { label: '是', val: true },
          { label: '否', val: false }
        ].map(opt => (
          <button
            key={String(opt.val)}
            onClick={() => onFilterUpdate({ ...filters, [filterKey]: opt.val })}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${value === opt.val
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            {opt.label}{opt.val === true && isBenchmark ? '⭐' : ''}
          </button>
        ))}
      </div>
    </div>
  );

  // 直接展示选项组件 - 多选按钮组样式
  const InlineSelect = ({ label, items, filterKey }: { label: string, items: string[], filterKey: keyof FilterState }) => {
    const selectedValues = (filters[filterKey] as any[]) || [];

    const toggleFilter = (value: any) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter(x => x !== value)
        : [...selectedValues, value];
      onFilterUpdate({ ...filters, [filterKey]: next });
    };

    return (
      <div className="flex flex-col space-y-2 mb-4 col-span-full">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{label}</label>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <button
              key={item}
              onClick={() => toggleFilter(item)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedValues.includes(item)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const resetAll = () => {
    onFilterUpdate({
      regions: [],
      securityLevels: [],
      projectLevels: [],
      projectNatures: [],
      projectTypes: [],
      industries: [],
      acceptanceYears: [],
      isBenchmark: null,
      years: {},
      managers: [],
      directors: [],
      salesManagers: [],
      preSalesManagers: [],
      statusList: [],
      phases: [],
      changeTypes: [],
      contractRange: [null, null],
      budgetRange: [null, null],
      scoreRange: [null, null],
      preSalesScoreRange: [null, null],
      executionScoreRange: [null, null],
      isHighlight: null,
      kickoffDateRange: [null, null],
      plannedEndDateRange: [null, null],
      forecastAcceptanceDateRange: [null, null],
      acceptanceDateRange: [null, null],
      slipReceiveDateRange: [null, null],
      thanksLetterDateRange: [null, null],
      grossMarginRange: [null, null],
      budgetUsageRange: [null, null],
      inputPercentRange: [null, null],
      progressPercentRange: [null, null],
      plannedManHoursRange: [null, null],
      actualManHoursRange: [null, null],
      isConfirmed: null,
      hasChanges: null,
      hasOutsourcing: null,
      searchTerm: ''
    });
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <div className="min-h-screen py-8 px-4 flex items-start justify-center">
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl shadow-slate-200/40 w-full max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100/60 bg-slate-50/30 rounded-t-[24px]">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">高级项目筛选矩阵</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-slate-100 flex space-x-6 bg-white overflow-x-auto shrink-0 no-scrollbar">
          {[
            { id: 'basic', label: '项目基本信息', color: 'indigo' },
            { id: 'timeline', label: '时间里程碑', color: 'indigo' },
            { id: 'financial', label: '财务核心指标', color: 'emerald' },
            { id: 'execution', label: '执行进度评估', color: 'blue' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[60vh]">
          {/* Tab 1: 项目基本信息 */}
          {activeTab === 'basic' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* 直接展示的选项区域 */}
              <InlineSelect label="所属区域" items={allData.regions} filterKey="regions" />
              <InlineSelect label="项目级别" items={Object.values(ProjectLevel)} filterKey="projectLevels" />
              <InlineSelect label="项目状态" items={Object.values(ProjectStatus)} filterKey="statusList" />

              <div className="h-px bg-slate-100 my-4"></div>

              {/* 其他下拉筛选 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <DropdownSelect label="密级脱敏" items={allData.securityLevels} filterKey="securityLevels" />
                <DropdownSelect label="项目类型" items={Object.values(ProjectType)} filterKey="projectTypes" />
                <DropdownSelect label="行业领域" items={allData.industries} filterKey="industries" />
                <DropdownSelect label="里程碑节点" items={MILESTONE_NODE_OPTIONS.map(o => o.label)} filterKey="milestoneNodes" />
                <DropdownSelect label="项目性质" items={allData.natures} filterKey="projectNatures" />
                <DropdownSelect label="项目经理" items={allData.managers} filterKey="managers" />
                <DropdownSelect label="项目总监" items={allData.directors} filterKey="directors" />
                <DropdownSelect label="销售经理" items={allData.sales} filterKey="salesManagers" />
                <DropdownSelect label="售前经理" items={allData.preSales} filterKey="preSalesManagers" />
                <div className="col-span-full grid grid-cols-2 gap-4 mt-2">
                  <ToggleSelect label="标杆项目" value={filters.isBenchmark} filterKey="isBenchmark" isBenchmark />
                  <ToggleSelect label="亮点工程" value={filters.isHighlight} filterKey="isHighlight" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 时间里程碑 */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <DateRangeInput label="立项日期" startVal={filters.kickoffDateRange[0]} endVal={filters.kickoffDateRange[1]} filterKey="kickoffDateRange" />
                <DateRangeInput label="计划结束日期" startVal={filters.plannedEndDateRange[0]} endVal={filters.plannedEndDateRange[1]} filterKey="plannedEndDateRange" />
                <DateRangeInput label="预测验收时间" startVal={filters.forecastAcceptanceDateRange[0]} endVal={filters.forecastAcceptanceDateRange[1]} filterKey="forecastAcceptanceDateRange" />
                <DateRangeInput label="验收日期" startVal={filters.acceptanceDateRange[0]} endVal={filters.acceptanceDateRange[1]} filterKey="acceptanceDateRange" />
                <DateRangeInput label="验收单获取时间" startVal={filters.slipReceiveDateRange[0]} endVal={filters.slipReceiveDateRange[1]} filterKey="slipReceiveDateRange" />
                <DateRangeInput label="感谢信接收时间" startVal={filters.thanksLetterDateRange[0]} endVal={filters.thanksLetterDateRange[1]} filterKey="thanksLetterDateRange" />
                <DropdownSelect label="验收年度" items={allData.years} filterKey="acceptanceYears" />
              </div>
            </div>
          )}

          {/* Tab 3: 财务核心指标 */}
          {activeTab === 'financial' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <RangeInput label="合同总额" minVal={filters.contractRange[0]} maxVal={filters.contractRange[1]} filterKey="contractRange" unit="元" />
                <RangeInput label="预算总额" minVal={filters.budgetRange[0]} maxVal={filters.budgetRange[1]} filterKey="budgetRange" unit="元" />
                <RangeInput label="预算使用率" minVal={filters.budgetUsageRange[0]} maxVal={filters.budgetUsageRange[1]} filterKey="budgetUsageRange" unit="%" />
                <RangeInput label="毛利率" minVal={filters.grossMarginRange[0]} maxVal={filters.grossMarginRange[1]} filterKey="grossMarginRange" unit="%" />
                <ToggleSelect label="是否确认收入" value={filters.isConfirmed} filterKey="isConfirmed" />
                <ToggleSelect label="外协采购需求" value={filters.hasOutsourcing} filterKey="hasOutsourcing" />
              </div>
            </div>
          )}

          {/* Tab 4: 执行进度评估 */}
          {activeTab === 'execution' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <RangeInput label="投入百分比" minVal={filters.inputPercentRange[0]} maxVal={filters.inputPercentRange[1]} filterKey="inputPercentRange" unit="%" />
                <RangeInput label="进度百分比" minVal={filters.progressPercentRange[0]} maxVal={filters.progressPercentRange[1]} filterKey="progressPercentRange" unit="%" />
                <RangeInput label="计划总工时" minVal={filters.plannedManHoursRange[0]} maxVal={filters.plannedManHoursRange[1]} filterKey="plannedManHoursRange" unit="人周" />
                <RangeInput label="实际总工时" minVal={filters.actualManHoursRange[0]} maxVal={filters.actualManHoursRange[1]} filterKey="actualManHoursRange" unit="人周" />
                <RangeInput label="评估得分" minVal={filters.scoreRange[0]} maxVal={filters.scoreRange[1]} filterKey="scoreRange" unit="分" />
                <RangeInput label="售前评估得分" minVal={filters.preSalesScoreRange[0]} maxVal={filters.preSalesScoreRange[1]} filterKey="preSalesScoreRange" unit="分" />
                <RangeInput label="执行评估得分" minVal={filters.executionScoreRange[0]} maxVal={filters.executionScoreRange[1]} filterKey="executionScoreRange" unit="分" />
                <ToggleSelect label="变更情况" value={filters.hasChanges} filterKey="hasChanges" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-[24px]">
          <button onClick={resetAll} className="flex items-center text-slate-400 hover:text-indigo-600 text-[10px] font-bold uppercase tracking-wider gap-2 group transition-all">
            <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            重置全部筛选
          </button>
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
              放弃修改
            </button>
            <button onClick={onClose} className="px-10 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 uppercase tracking-widest">
              应用当前筛选
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchDropdown;
