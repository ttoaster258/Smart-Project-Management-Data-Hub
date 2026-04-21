// 高级筛选弹窗

import React, { useState, useEffect } from 'react';
import { Project, TrackingStatus, TrackingAcceptanceRisk, TrackingRevenueRisk, TRACKING_ALL_COLUMNS } from '../../../types';
import { getAllRegions } from '../utils/trackingUtils';
import Modal from './Modal';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface AdvancedFilters {
  regions: string[];
  levels: string[];
  statuses: TrackingStatus[];
  risks: string[];
  revenueRisks: string[];
  acceptanceStatus: '全部' | '已验收' | '未验收';
  visibleColumns: string[];
}

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
  onReset: () => void;
}

export default function AdvancedFilterModal({ isOpen, onClose, filters, onApply, onReset }: AdvancedFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const regions = getAllRegions();
  const levels = ['重大', '重点', '常规', '核心'];
  const statuses: TrackingStatus[] = ['未立项已确认', '未立项', '实施中', '实施中已确认', '已验收未确认', '已验收已确认', '往年验收今年确认'];
  const risks: TrackingAcceptanceRisk[] = ['高', '中', '低', '无', '已验收'];
  const revenueRisks: TrackingRevenueRisk[] = ['高', '中', '低', '无', '已确认'];
  const acceptanceStatuses = ['全部', '已验收', '未验收'] as const;

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const toggleFilter = (key: string, value: string) => {
    const current = (localFilters as any)[key] || [];
    const next = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setLocalFilters({ ...localFilters, [key]: next });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="高级筛选与自定义查询">
      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
        {/* 验收情况 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            验收情况
          </h4>
          <div className="flex flex-wrap gap-2">
            {acceptanceStatuses.map(status => (
              <button
                key={status}
                onClick={() => setLocalFilters({ ...localFilters, acceptanceStatus: status })}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  localFilters.acceptanceStatus === status
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* 区域选择 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            区域选择 (多选)
          </h4>
          <div className="flex flex-wrap gap-2">
            {regions.map(region => (
              <button
                key={region}
                onClick={() => toggleFilter('regions', region)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  localFilters.regions?.includes(region)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* 项目级别 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            项目级别
          </h4>
          <div className="flex flex-wrap gap-2">
            {levels.map(level => (
              <button
                key={level}
                onClick={() => toggleFilter('levels', level)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  localFilters.levels?.includes(level)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* 验收风险 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            验收风险
          </h4>
          <div className="flex flex-wrap gap-2">
            {risks.map(risk => (
              <button
                key={risk}
                onClick={() => toggleFilter('risks', risk)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  localFilters.risks?.includes(risk)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        {/* 收入风险 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            收入风险
          </h4>
          <div className="flex flex-wrap gap-2">
            {revenueRisks.map(risk => (
              <button
                key={risk}
                onClick={() => toggleFilter('revenueRisks', risk)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  localFilters.revenueRisks?.includes(risk)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        {/* 自定义显示列 */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            自定义显示列
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TRACKING_ALL_COLUMNS.map(col => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localFilters.visibleColumns?.includes(col.id)}
                  onChange={(e) => {
                    const current = localFilters.visibleColumns || [];
                    const next = e.target.checked
                      ? [...current, col.id]
                      : current.filter(id => id !== col.id);
                    setLocalFilters({ ...localFilters, visibleColumns: next });
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 group-hover:text-indigo-600 transition-colors">
                  {col.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
        <button
          onClick={handleReset}
          className="px-6 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          重置筛选
        </button>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            开始查询
          </button>
        </div>
      </div>
    </Modal>
  );
}