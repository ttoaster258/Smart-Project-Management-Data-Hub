// 区域季度指标设置弹窗

import React, { useState, useEffect } from 'react';
import { REGION_QUARTERLY_TARGETS } from '../../../types';
import Modal from './Modal';

interface TargetSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Record<string, Record<number, number>>;
  onSave: (targets: Record<string, Record<number, number>>) => void;
}

export default function TargetSettingModal({ isOpen, onClose, targets, onSave }: TargetSettingModalProps) {
  const [localTargets, setLocalTargets] = useState<Record<string, Record<number, number>>>(targets);
  const regions = Object.keys(targets);
  const quarters = [1, 2, 3, 4];

  useEffect(() => {
    if (isOpen) {
      setLocalTargets(targets);
    }
  }, [isOpen, targets]);

  const handleChange = (region: string, quarter: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setLocalTargets({
      ...localTargets,
      [region]: {
        ...localTargets[region],
        [quarter]: numValue
      }
    });
  };

  const handleSave = () => {
    onSave(localTargets);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="确认收入指标设置 (各区域/各季度)">
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold">区域</th>
                {quarters.map(q => (
                  <th key={q} className="px-4 py-3 font-bold text-center">Q{q} 目标 (¥)</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regions.map(region => (
                <tr key={region} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{region}</td>
                  {quarters.map(q => (
                    <td key={q} className="px-4 py-3">
                      <input
                        type="number"
                        value={localTargets[region]?.[q] || 0}
                        onChange={(e) => handleChange(region, q, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-right font-mono"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
          >
            保存设置
          </button>
        </div>
      </div>
    </Modal>
  );
}