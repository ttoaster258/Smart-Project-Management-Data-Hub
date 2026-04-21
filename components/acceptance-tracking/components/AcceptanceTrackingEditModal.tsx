// 验收追踪单项目编辑弹窗

import React, { useState, useEffect } from 'react';
import { Project } from '../../../types';
import Modal from './Modal';
import { AlertCircle, CheckCircle2, TrendingUp, Settings, FileText } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface AcceptanceTrackingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (projectId: string, data: Record<string, any>) => void;
}

export default function AcceptanceTrackingEditModal({
  isOpen,
  onClose,
  project,
  onSave
}: AcceptanceTrackingEditModalProps) {
  const [formData, setFormData] = useState({
    trackingAcceptanceRisk: '无',
    trackingRevenueRisk: '无',
    acceptanceControl: '',
    solutionMeasures: '',
    riskReason: '',
    isNewTracking: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当项目数据变化时，更新表单数据
  useEffect(() => {
    if (project) {
      setFormData({
        trackingAcceptanceRisk: project.trackingAcceptanceRisk || '无',
        trackingRevenueRisk: project.trackingRevenueRisk || '无',
        acceptanceControl: project.timeline?.acceptanceControl || '',
        solutionMeasures: project.solutionMeasures || '',
        riskReason: project.riskReason || '',
        isNewTracking: project.isNewTracking || false,
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsSubmitting(true);
    try {
      // 转换字段名称为后端期望的格式
      const updateData = {
        tracking_acceptance_risk: formData.trackingAcceptanceRisk,
        tracking_revenue_risk: formData.trackingRevenueRisk,
        acceptance_control: formData.acceptanceControl,
        solution_measures: formData.solutionMeasures,
        risk_reason: formData.riskReason,
        is_new_tracking: formData.isNewTracking,
      };

      onSave(project.id, updateData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="编辑验收追踪信息" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 项目基本信息 */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{project.projectName}</p>
              <p className="text-xs text-slate-500">{project.projectCode} · {project.region}</p>
            </div>
          </div>
        </div>

        {/* 验收风险 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            验收风险
          </label>
          <select
            value={formData.trackingAcceptanceRisk}
            onChange={(e) => setFormData({ ...formData, trackingAcceptanceRisk: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
            <option value="无">无</option>
            <option value="已验收">已验收</option>
          </select>
        </div>

        {/* 确认收入风险 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            确认收入风险
          </label>
          <select
            value={formData.trackingRevenueRisk}
            onChange={(e) => setFormData({ ...formData, trackingRevenueRisk: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
            <option value="无">无</option>
            <option value="已确认">已确认</option>
          </select>
        </div>

        {/* 验收可控性 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Settings className="w-4 h-4 text-indigo-500" />
            验收可控性
          </label>
          <select
            value={formData.acceptanceControl}
            onChange={(e) => setFormData({ ...formData, acceptanceControl: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            <option value="">未设置</option>
            <option value="可控">可控</option>
            <option value="不可控">不可控</option>
            <option value="新增">新增</option>
          </select>
        </div>

        {/* 风险原因 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            风险原因
          </label>
          <select
            value={formData.riskReason}
            onChange={(e) => setFormData({ ...formData, riskReason: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            <option value="">未填写原因</option>
            <option value="客户需求变更">客户需求变更</option>
            <option value="技术难点">技术难点</option>
            <option value="资源不足">资源不足</option>
            <option value="外部依赖延迟">外部依赖延迟</option>
            <option value="合同争议">合同争议</option>
            <option value="付款流程问题">付款流程问题</option>
            <option value="其他">其他</option>
          </select>
        </div>

        {/* 解决措施 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            解决措施
          </label>
          <textarea
            value={formData.solutionMeasures}
            onChange={(e) => setFormData({ ...formData, solutionMeasures: e.target.value })}
            placeholder="请输入解决措施..."
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
          />
        </div>

        {/* 是否新追踪 */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <input
            type="checkbox"
            checked={formData.isNewTracking}
            onChange={(e) => setFormData({ ...formData, isNewTracking: e.target.checked })}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label className="text-sm font-medium text-slate-700">标记为新追踪项目</label>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            保存修改
          </button>
        </div>
      </form>
    </Modal>
  );
}