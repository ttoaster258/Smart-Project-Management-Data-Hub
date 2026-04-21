// 验收追踪系统工具函数

import { Project, TrackingStatus, TrackingFocusLevel, TrackingAcceptanceRisk, TrackingRevenueRisk, TrackingControllability, TrackingPeriodType, REGION_QUARTERLY_TARGETS } from '../../../types';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfWeek, endOfWeek, subMonths, subQuarters, subWeeks, isWithinInterval, getQuarter, differenceInDays, differenceInMonths } from 'date-fns';

// ===== 状态计算函数 =====

/**
 * 计算验收追踪状态（7种状态）
 * 规则：
 * 1. 立项空 & 确认收入有（本年）→ 未立项已确认
 * 2. 三者皆空 → 未立项
 * 3. 立项有 & 验收空 & 确认空 → 实施中
 * 4. 立项有 & 验收空 & 确认有（本年）→ 实施中已确认
 * 5. 立项有 & 验收有（本年）& 确认空 → 已验收未确认
 * 6. 立项有 & 验收有（本年）& 确认有（本年）→ 已验收已确认
 * 7. 立项有 & 验收往年 & 确认本年 → 往年验收今年确认
 */
export function calculateTrackingStatus(project: Project, reportDate: Date): TrackingStatus {
  const kickoffDate = project.timeline?.kickoffDate;
  const acceptanceDate = project.timeline?.acceptanceDate;
  const confirmedDate = project.payment?.confirmedDate;

  const isThisYear = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    try {
      return parseISO(dateStr).getFullYear() === reportDate.getFullYear();
    } catch {
      return false;
    }
  };

  const isPastYear = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    try {
      return parseISO(dateStr).getFullYear() < reportDate.getFullYear();
    } catch {
      return false;
    }
  };

  const hasKickoff = !!kickoffDate;
  const hasAcceptance = !!acceptanceDate;
  const hasConfirmed = !!confirmedDate;

  // 1. 立项空 & 确认收入有（本年）→ 未立项已确认
  if (!hasKickoff && isThisYear(confirmedDate)) return '未立项已确认';

  // 2. 三者皆空 → 未立项
  if (!hasKickoff && !hasAcceptance && !hasConfirmed) return '未立项';

  // 3. 立项有 & 验收空 & 确认空 → 实施中
  if (hasKickoff && !hasAcceptance && !hasConfirmed) return '实施中';

  // 4. 立项有 & 验收空 & 确认有（本年）→ 实施中已确认
  if (hasKickoff && !hasAcceptance && isThisYear(confirmedDate)) return '实施中已确认';

  // 5. 立项有 & 验收有（本年）& 确认空 → 已验收未确认
  if (hasKickoff && isThisYear(acceptanceDate) && !hasConfirmed) return '已验收未确认';

  // 6. 立项有 & 验收有（本年）& 确认有（本年）→ 已验收已确认
  if (hasKickoff && isThisYear(acceptanceDate) && isThisYear(confirmedDate)) return '已验收已确认';

  // 7. 立项有 & 验收往年 & 确认本年 → 往年验收今年确认
  if (hasKickoff && isPastYear(acceptanceDate) && isThisYear(confirmedDate)) return '往年验收今年确认';

  // Default fallback
  if (hasKickoff) {
    if (hasAcceptance) return '已验收未确认';
    return '实施中';
  }

  return '未立项';
}

/**
 * 计算重点关注等级
 * 规则：合同金额 ≥ 300万 → 一级；100万~300万 → 二级；< 100万 → 空
 */
export function calculateTrackingFocusLevel(contractAmount: number): TrackingFocusLevel {
  if (contractAmount >= 3000000) return '一级';
  if (contractAmount >= 1000000 && contractAmount < 3000000) return '二级';
  return '';
}

/**
 * 获取验收风险显示颜色
 */
export function getAcceptanceRiskColor(risk: TrackingAcceptanceRisk | string): { bg: string; text: string; dot: string } {
  switch (risk) {
    case '高':
      return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' };
    case '中':
      return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
    case '低':
      return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    case '无':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case '已验收':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-white border border-slate-300' };
  }
}

/**
 * 获取确认收入风险显示颜色
 */
export function getRevenueRiskColor(risk: TrackingRevenueRisk | string): { bg: string; text: string; dot: string } {
  switch (risk) {
    case '高':
      return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' };
    case '中':
      return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
    case '低':
      return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    case '无':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case '已确认':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-white border border-slate-300' };
  }
}

/**
 * 获取追踪状态显示颜色
 */
export function getTrackingStatusColor(status: TrackingStatus): { bg: string; text: string } {
  if (status.includes('已验收')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  }
  if (status.includes('实施中')) {
    return { bg: 'bg-blue-100', text: 'text-blue-700' };
  }
  if (status.includes('未立项')) {
    return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
  return { bg: 'bg-amber-100', text: 'text-amber-700' };
}

/**
 * 获取可控性显示颜色
 */
export function getControllabilityColor(control: TrackingControllability | string): { bg: string; text: string } {
  switch (control) {
    case '可控':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case '不可控':
      return { bg: 'bg-rose-100', text: 'text-rose-700' };
    case '新增':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-500' };
  }
}

/**
 * 获取提前验收描述文本
 */
export function getEarlyAcceptanceText(actualDate: string, plannedEndDate: string): string {
  if (!actualDate || !plannedEndDate) return '';
  try {
    const actual = parseISO(actualDate);
    const planned = parseISO(plannedEndDate);
    const days = differenceInDays(planned, actual);
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `提前 ${months} 个月`;
    }
    return `提前 ${days} 天`;
  } catch {
    return '';
  }
}

// ===== 时间周期工具函数 =====

export interface PeriodInterval {
  start: Date;
  end: Date;
}

/**
 * 获取周期时间区间
 */
export function getPeriodInterval(reportDate: Date, periodType: TrackingPeriodType, customRange?: PeriodInterval): PeriodInterval {
  switch (periodType) {
    case 'thisWeek':
      return { start: startOfWeek(reportDate, { weekStartsOn: 1 }), end: endOfWeek(reportDate, { weekStartsOn: 1 }) };
    case 'lastMonth':
      const lastMonth = subMonths(reportDate, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'thisMonth':
      return { start: startOfMonth(reportDate), end: endOfMonth(reportDate) };
    case 'thisQuarter':
      return { start: startOfQuarter(reportDate), end: endOfQuarter(reportDate) };
    case 'lastQuarter':
      const lastQuarter = subQuarters(reportDate, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
    case 'thisYear':
      return { start: startOfYear(reportDate), end: endOfYear(reportDate) };
    case 'custom':
      return customRange || { start: startOfMonth(reportDate), end: endOfMonth(reportDate) };
    default:
      return { start: startOfMonth(reportDate), end: endOfMonth(reportDate) };
  }
}

/**
 * 获取上一个周期时间区间（用于趋势对比）
 */
export function getPreviousPeriodInterval(reportDate: Date, periodType: TrackingPeriodType): PeriodInterval | null {
  switch (periodType) {
    case 'thisWeek':
      const lastWeek = subWeeks(reportDate, 1);
      return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    case 'thisMonth':
      const lastMonth = subMonths(reportDate, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'thisQuarter':
      const lastQuarter = subQuarters(reportDate, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
    default:
      return null;
  }
}

/**
 * 判断日期是否在区间内
 */
export function isDateWithinPeriod(dateStr: string | null | undefined, interval: PeriodInterval): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return isWithinInterval(date, interval);
  } catch {
    return false;
  }
}

/**
 * 判断日期是否早于区间
 */
export function isDateBeforePeriod(dateStr: string | null | undefined, interval: PeriodInterval): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return date < interval.start;
  } catch {
    return false;
  }
}

/**
 * 判断日期是否晚于区间
 */
export function isDateAfterPeriod(dateStr: string | null | undefined, interval: PeriodInterval): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return date > interval.end;
  } catch {
    return false;
  }
}

// ===== 数据筛选函数 =====

/**
 * 判断项目是否属于验收追踪池
 * 规则：
 * A: 立项早于本期开始 & 状态为实施中
 * B: 截止时间在本期内
 * C: 验收在本期内 & 截止时间晚于本期结束
 * D: 验收在本期内 & 截止时间在本期内
 */
export function isInTrackingPool(project: Project, interval: PeriodInterval, reportDate: Date): boolean {
  const kickoffDate = project.timeline?.kickoffDate;
  const plannedEndDate = project.timeline?.plannedEndDate;
  const acceptanceDate = project.timeline?.acceptanceDate;

  // 排除往年已验收项目
  if (acceptanceDate) {
    try {
      const actualDate = parseISO(acceptanceDate);
      if (actualDate < startOfYear(reportDate)) {
        return false;
      }
    } catch {
      // ignore
    }
  }

  const status = calculateTrackingStatus(project, reportDate);

  // A: 立项早于本期开始 & 状态为实施中
  const isA = kickoffDate && isDateBeforePeriod(kickoffDate, interval) && status.includes('实施中');

  // B: 截止时间在本期内
  const isB = plannedEndDate && isDateWithinPeriod(plannedEndDate, interval);

  // C: 验收在本期内 & 截止时间晚于本期结束
  const isC = acceptanceDate && isDateWithinPeriod(acceptanceDate, interval) &&
              plannedEndDate && isDateAfterPeriod(plannedEndDate, interval);

  // D: 验收在本期内 & 截止时间在本期内
  const isD = acceptanceDate && isDateWithinPeriod(acceptanceDate, interval) &&
              plannedEndDate && isDateWithinPeriod(plannedEndDate, interval);

  return !!isA || !!isB || !!isC || !!isD;
}

// ===== 统计计算函数 =====

/**
 * 获取区域季度目标
 */
export function getQuarterlyTarget(region: string, quarter: number): number {
  const normalizedRegion = normalizeRegion(region);
  return REGION_QUARTERLY_TARGETS[normalizedRegion]?.[quarter] || 0;
}

/**
 * 标准化区域名称
 */
export function normalizeRegion(region: string): string {
  const mapping: Record<string, string> = {
    '北区（华中）': '北区（华中）',
    '北区（华北，东北）': '北区（华北，东北）',
    '东区': '东区',
    '南区': '南区',
    '西区': '西区',
    '创景可视（内转）': '创景可视（内转）',
    '创景可视': '创景可视（内转）',
    '北区（华北）': '北区（华北，东北）',
    '北区（东北）': '北区（华北，东北）',
  };
  return mapping[region] || region;
}

/**
 * 获取所有区域列表
 */
export function getAllRegions(): string[] {
  return Object.keys(REGION_QUARTERLY_TARGETS);
}

// ===== 周期类型选项 =====

export const PERIOD_TYPE_OPTIONS: { value: TrackingPeriodType; label: string }[] = [
  { value: 'thisWeek', label: '本周' },
  { value: 'thisMonth', label: '本月' },
  { value: 'lastMonth', label: '上月' },
  { value: 'thisQuarter', label: '本季度' },
  { value: 'lastQuarter', label: '上季度' },
  { value: 'thisYear', label: '本年' },
  { value: 'custom', label: '自定义区间' },
];