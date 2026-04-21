// 批量更新弹窗

import React, { useState } from 'react';
import { Project, TrackingAcceptanceRisk, TrackingRevenueRisk, TrackingControllability, TrackingStatus } from '../../../types';
import Modal from './Modal';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface BatchUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Project>) => void;
  selectedCount: number;
}

export default function BatchUpdateModal({ isOpen, onClose, onUpdate, selectedCount }: BatchUpdateModalProps) {
  const [formData, setFormData] = useState({
    trackingAcceptanceRisk: '无',
    trackingRevenueRisk: '无',
    acceptanceControl: '可控',
  });

  const [fieldsToUpdate, setFieldsToUpdate] = useState<string[]>([]);

  const toggleField = (field: string) => {
    if (fieldsToUpdate.includes(field)) {
      setFieldsToUpdate(fieldsToUpdate.filter(f => f !== field));
    } else {
      setFieldsToUpdate([...fieldsToUpdate, field]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: Partial<Project> = {};
    fieldsToUpdate.forEach(field => {
      (updateData as any)[field] = (formData as any)[field];
    });
    onUpdate(updateData);
    onClose();
  };

  const fieldOptions = [
    {
      id: 'trackingAcceptanceRisk',
      label: '验收风险',
      options: ['高', '中', '低', '无', '已验收']
    },
    {
      id: 'trackingRevenueRisk',
      label: '确认收入风险',
      options: ['高', '中', '低', '无', '已确认']
    },
    {
      id: 'acceptanceControl',
      label: '验收可控性',
      options: ['可控', '不可控', '新增']
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`批量更新 (${selectedCount} 个项目)`} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-xs text-slate-500">请勾选需要批量修改的字段，并设置新值</p>

        <div className="space-y-4">
          {fieldOptions.map(field => (
            <div key={field.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <input
                type="checkbox"
                checked={fieldsToUpdate.includes(field.id)}
                onChange={() => toggleField(field.id)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                <select
                  disabled={!fieldsToUpdate.includes(field.id)}
                  value={(formData as any)[field.id]}
                  onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50"
                >
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={fieldsToUpdate.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"
          >
            确认更新
          </button>
        </div>
      </form>
    </Modal>
  );
}