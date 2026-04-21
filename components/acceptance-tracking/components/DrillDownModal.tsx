// 验收下钻分析弹窗 - 已完成验收详情

import React, { useState } from 'react';
import { Project } from '../../../types';
import Modal from './Modal';
import { getEarlyAcceptanceText } from '../utils/trackingUtils';
import { parseISO, differenceInDays } from 'date-fns';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface DrillDownData {
  onSchedule: Project[];
  early: Project[];
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData;
}

export default function DrillDownModal({ isOpen, onClose, data }: DrillDownModalProps) {
  const [activeTab, setActiveTab] = useState<'onSchedule' | 'early'>('onSchedule');

  const earlyTotalAmount = data.early.reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="已完成验收下钻分析">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('onSchedule')}
            className={cn(
              'pb-3 px-2 text-sm font-bold transition-all border-b-2',
              activeTab === 'onSchedule'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            准时/按计划结项 ({data.onSchedule.length})
          </button>
          <button
            onClick={() => setActiveTab('early')}
            className={cn(
              'pb-3 px-2 text-sm font-bold transition-all border-b-2',
              activeTab === 'early'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            异常提前验收（超前交付） ({data.early.length})
          </button>
        </div>

        {/* 提前验收金额汇总 */}
        {activeTab === 'early' && (
          <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-600">超前交付金额总计</span>
            <span className="text-xl font-extrabold text-indigo-700">
              ¥ {earlyTotalAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* 项目列表 */}
        <div className="space-y-3">
          {(activeTab === 'onSchedule' ? data.onSchedule : data.early).map((project) => {
            const contractAmount = project.payment?.contractAmount || 0;
            const acceptanceDate = project.timeline?.acceptanceDate || '';
            const plannedEndDate = project.timeline?.plannedEndDate || '';

            return (
              <div
                key={project.id}
                className={cn(
                  'p-4 rounded-2xl border flex justify-between items-center',
                  activeTab === 'onSchedule'
                    ? 'border-emerald-100 bg-emerald-50/30'
                    : 'border-indigo-100 bg-indigo-50/30'
                )}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{project.projectName}</span>
                    {activeTab === 'early' && (
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-bold">
                        {getEarlyAcceptanceText(acceptanceDate, plannedEndDate)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 mt-1">
                    {project.projectCode} | {project.members?.projectManager || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    ¥ {contractAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    验收日期: {acceptanceDate || '-'}
                  </div>
                </div>
              </div>
            );
          })}

          {(activeTab === 'onSchedule' ? data.onSchedule : data.early).length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </Modal>
  );
}