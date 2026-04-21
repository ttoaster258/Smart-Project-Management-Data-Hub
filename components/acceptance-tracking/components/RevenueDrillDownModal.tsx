// 已确认金额下钻分析弹窗

import React, { useState } from 'react';
import { Project } from '../../../types';
import Modal from './Modal';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface AcquiredDetails {
  normal: Project[];    // 正常回款
  advance: Project[];   // 提前确权
  pastYear: Project[];  // 往年清理
}

interface RevenueDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AcquiredDetails;
}

export default function RevenueDrillDownModal({ isOpen, onClose, data }: RevenueDrillDownModalProps) {
  const [activeTab, setActiveTab] = useState<'normal' | 'advance' | 'pastYear'>('normal');

  const totalAmount = data[activeTab].reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0);

  const tabs = [
    { id: 'normal', label: '正常回款', color: 'emerald', description: '验收并确认' },
    { id: 'advance', label: '提前确权', color: 'indigo', description: '实施中已确认' },
    { id: 'pastYear', label: '往年清理', color: 'amber', description: '往年验收今年确认' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="已确认金额下钻分析">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'pb-3 px-2 text-sm font-bold transition-all border-b-2',
                activeTab === tab.id
                  ? tab.id === 'normal' ? 'border-emerald-500 text-emerald-600'
                    : tab.id === 'advance' ? 'border-indigo-500 text-indigo-600'
                    : 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {tab.label} ({data[tab.id].length})
            </button>
          ))}
        </div>

        {/* 金额汇总 */}
        <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
          <span className="text-sm font-medium text-slate-500">{currentTab?.description}</span>
          <div className="text-right">
            <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">当前分类总金额</span>
            <span className={cn(
              'text-xl font-extrabold',
              activeTab === 'normal' ? 'text-emerald-600'
                : activeTab === 'advance' ? 'text-indigo-600'
                : 'text-amber-600'
            )}>
              ¥ {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="space-y-3">
          {data[activeTab].length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm italic">暂无相关数据</div>
          ) : (
            data[activeTab].map((project) => (
              <div
                key={project.id}
                className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:border-slate-200 transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                    {project.projectCode}
                  </span>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {project.projectName}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">
                      {project.region}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      确认时间: {project.payment?.confirmedDate || '-'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900">
                    ¥ {(project.payment?.contractAmount || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">合同金额</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}