// 验收未确认下钻分析弹窗 - 催收清单

import React from 'react';
import { Project } from '../../../types';
import Modal from './Modal';
import { getRevenueRiskColor } from '../utils/trackingUtils';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface AcceptedNotAcquiredDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Project[];
}

export default function AcceptedNotAcquiredDrillDownModal({ isOpen, onClose, data }: AcceptedNotAcquiredDrillDownModalProps) {
  // 按确认收入风险排序（高→中→低→无）
  const riskOrder: Record<string, number> = { '高': 0, '中': 1, '低': 2, '无': 3 };
  const sortedData = [...data].sort((a, b) => {
    const riskA = riskOrder[a.trackingRevenueRisk || '无'] ?? 99;
    const riskB = riskOrder[b.trackingRevenueRisk || '无'] ?? 99;
    return riskA - riskB;
  });

  const totalAmount = sortedData.reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="验收未确认下钻分析 (催收清单)">
      <div className="space-y-6">
        {/* 金额汇总 */}
        <div className="bg-amber-50 p-4 rounded-2xl flex justify-between items-center border border-amber-100">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-amber-800">总存量催收清单</span>
            <span className="text-xs text-amber-600">按确认收入风险等级排序</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-amber-500 block uppercase font-bold tracking-wider">总计金额</span>
            <span className="text-xl font-extrabold text-amber-700">
              ¥ {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
          {sortedData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm italic">暂无相关数据</div>
          ) : (
            sortedData.map((project) => {
              const risk = project.trackingRevenueRisk || '无';
              const riskColor = getRevenueRiskColor(risk);
              const contractAmount = project.payment?.contractAmount || 0;
              const acceptanceDate = project.timeline?.acceptanceDate || '';

              return (
                <div
                  key={project.id}
                  className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:border-slate-200 transition-all group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                        {project.projectCode}
                      </span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-bold',
                        riskColor.bg, riskColor.text
                      )}>
                        风险: {risk}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {project.projectName}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">
                        {project.region}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        验收时间: {acceptanceDate || '-'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        经理: {project.members?.projectManager || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900">
                      ¥ {contractAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">合同金额</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}