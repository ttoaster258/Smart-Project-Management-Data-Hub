// 统计卡片组件

import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Clock, BarChart3, Settings } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  subValue?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  valueClassName?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
}

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// 人民币图标组件
export const RmbIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="8" x2="12" y2="22" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="6" y1="15" x2="18" y2="15" />
    <line x1="7" y1="3" x2="12" y2="8" />
    <line x1="17" y1="3" x2="12" y2="8" />
  </svg>
);

export default function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  subValue,
  icon: Icon,
  color = 'bg-indigo-500',
  valueClassName = '',
  onClick,
  footer,
  action,
  trend,
}: StatCardProps) {
  const displayValue = `${prefix}${typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}${suffix}`;
  const fontSizeClass = displayValue.length > 12 ? 'text-xl' : displayValue.length > 10 ? 'text-2xl' : 'text-3xl';

  return (
    <div
      className={cn(
        'bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative',
        onClick && 'cursor-pointer active:scale-[0.98]'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.stat-card-action')) return;
        onClick?.();
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn('p-2 rounded-xl', color)}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{title}</span>
          {action && <div className="stat-card-action">{action}</div>}
        </div>
      </div>

      <div className="flex flex-col">
        <span className={cn(fontSizeClass, 'font-extrabold text-slate-900 transition-all duration-300', valueClassName)}>
          {displayValue}
        </span>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-1">
          {subValue && (
            <span className="text-sm text-slate-500 whitespace-nowrap">{subValue}</span>
          )}
          {trend && (
            <span className={cn(
              'text-xs font-bold flex items-center gap-0.5 whitespace-nowrap',
              trend.value > 0 ? 'text-emerald-500' : trend.value < 0 ? 'text-rose-500' : 'text-slate-400'
            )}>
              {trend.value > 0 ? '+' : ''}{typeof trend.value === 'number' ? trend.value.toLocaleString() : trend.value}
              <span className="font-normal opacity-70">({trend.label})</span>
            </span>
          )}
        </div>

        {footer && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}