import React, { useState } from 'react';
import { FilterState, Region, ProjectStatus, ProjectLevel, ProjectType } from '../types';

interface FilterConsoleProps {
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
    phases: string[]; // Added
    securityLevels: string[]; // Added
    regions: Region[]; // Added to replace enum usage
  };
}

const FilterConsole: React.FC<FilterConsoleProps> = ({ isOpen, onClose, filters, onFilterUpdate, allData }) => {
  const [activeTab, setActiveTab] = useState<'Core' | 'Team' | 'Execution' | 'Financial'>('Core');

  const tabs = [
    { id: 'Core', label: '基础底座', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'Team', label: '团队管理', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'Execution', label: '执行效能', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'Financial', label: '财务与评价', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const toggleFilter = (key: keyof FilterState, value: any) => {
    const current = filters[key] as any[];
    const next = current.includes(value)
      ? current.filter(x => x !== value)
      : [...current, value];
    onFilterUpdate({ ...filters, [key]: next });
  };

  const MultiSelect = ({ label, items, filterKey }: { label: string, items: string[], filterKey: keyof FilterState }) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
          {(filters[filterKey] as any[]).length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item}
            onClick={() => toggleFilter(filterKey, item)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${(filters[filterKey] as any[]).includes(item)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
              }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  const RangeInput = ({ label, minVal, maxVal, unit, filterKey }: { label: string, minVal: number | null, maxVal: number | null, unit?: string, filterKey: keyof FilterState }) => {
    return (
      <div className="mb-6">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">{label} {unit && <span className="text-slate-300">({unit})</span>}</label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
            value={minVal ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              onFilterUpdate({ ...filters, [filterKey]: [val, maxVal] });
            }}
          />
          <span className="text-slate-300 font-bold">-</span>
          <input
            type="number"
            placeholder="Max"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
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

  return (
    <div className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />

      <div className={`absolute top-0 right-0 h-full w-[460px] bg-white shadow-2xl flex transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* 一级类目导航 */}
        <div className="w-20 bg-slate-900 flex flex-col items-center py-8 space-y-6 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-3 rounded-2xl transition-all relative group ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon} /></svg>
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {tab.label}
              </div>
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 二级具体内容筛选 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">全维度筛选控制台</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Multi-Dimensional Strategic Filters</p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'Core' && (
              <div>
                <MultiSelect label="验收年份 (Year)" items={allData.years} filterKey="acceptanceYears" />
                <MultiSelect label="密级级别 (Security)" items={allData.securityLevels} filterKey="securityLevels" />
                <MultiSelect label="项目级别 (Level)" items={Object.values(ProjectLevel)} filterKey="projectLevels" />
                <MultiSelect label="项目性质 (Nature)" items={allData.natures} filterKey="projectNatures" />
                <MultiSelect label="项目类型 (Type)" items={Object.values(ProjectType)} filterKey="projectTypes" />
                <MultiSelect label="行业领域 (Industry)" items={allData.industries} filterKey="industries" />

                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">标杆项目 (Benchmark)</label>
                  <div className="flex space-x-2">
                    {[
                      { label: '全部', value: null },
                      { label: '是 ⭐', value: true },
                      { label: '否', value: false }
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        onClick={() => onFilterUpdate({ ...filters, isBenchmark: opt.value })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${filters.isBenchmark === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Team' && (
              <div>
                <MultiSelect label="项目经理 (PM)" items={allData.managers} filterKey="managers" />
                <MultiSelect label="项目总监 (Director)" items={allData.directors} filterKey="directors" />
                <MultiSelect label="销售经理 (Sales)" items={allData.sales} filterKey="salesManagers" />
                <MultiSelect label="售前经理 (Pre-Sales)" items={allData.preSales} filterKey="preSalesManagers" />
              </div>
            )}

            {activeTab === 'Execution' && (
              <div>
                <MultiSelect label="当前状态 (Status)" items={Object.values(ProjectStatus)} filterKey="statusList" />
                <MultiSelect label="交付阶段 (Phase)" items={allData.phases} filterKey="phases" />
                <MultiSelect label="变更监控 (Changes)" items={['人员变更', '进度变更', '预算变更']} filterKey="changeTypes" />
              </div>
            )}

            {activeTab === 'Financial' && (
              <div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <h4 className="text-xs font-black text-slate-700 mb-4">财务指标筛选</h4>
                  <RangeInput label="合同金额" unit="元" minVal={filters.contractRange[0]} maxVal={filters.contractRange[1]} filterKey="contractRange" />
                  <RangeInput label="预算金额" unit="元" minVal={filters.budgetRange[0]} maxVal={filters.budgetRange[1]} filterKey="budgetRange" />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 mb-4">综合评价筛选 (Ratings)</h4>
                  <RangeInput label="综合总评分" unit="分" minVal={filters.scoreRange[0]} maxVal={filters.scoreRange[1]} filterKey="scoreRange" />
                  <RangeInput label="售前阶段评分" unit="分" minVal={filters.preSalesScoreRange[0]} maxVal={filters.preSalesScoreRange[1]} filterKey="preSalesScoreRange" />
                  <RangeInput label="实施阶段评分" unit="分" minVal={filters.executionScoreRange[0]} maxVal={filters.executionScoreRange[1]} filterKey="executionScoreRange" />
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex space-x-4">
            <button
              onClick={() => onFilterUpdate({
                regions: allData.regions,
                securityLevels: allData.securityLevels,
                projectLevels: Object.values(ProjectLevel),
                projectNatures: allData.natures,
                projectTypes: Object.values(ProjectType),
                industries: allData.industries,
                acceptanceYears: allData.years,
                isBenchmark: null,
                isHighlight: null,
                managers: allData.managers,
                directors: allData.directors,
                salesManagers: allData.sales,
                preSalesManagers: allData.preSales,
                statusList: Object.values(ProjectStatus),
                phases: allData.phases,
                changeTypes: ['人员变更', '进度变更', '预算变更'],
                years: {},
                contractRange: [null, null],
                budgetRange: [null, null],
                scoreRange: [null, null],
                preSalesScoreRange: [null, null],
                executionScoreRange: [null, null],
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
              })}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest"
            >
              全部重置
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest"
            >
              确认应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterConsole;