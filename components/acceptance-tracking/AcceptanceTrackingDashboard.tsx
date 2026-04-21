// 验收追踪系统主看板 - 完整移植版本

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TrackingStatus, TrackingPeriodType, REGION_QUARTERLY_TARGETS, TRACKING_ALL_COLUMNS } from '../../types';
import {
  calculateTrackingStatus,
  calculateTrackingFocusLevel,
  getTrackingStatusColor,
  getAcceptanceRiskColor,
  getRevenueRiskColor,
  getControllabilityColor,
  getPeriodInterval,
  getPreviousPeriodInterval,
  isDateWithinPeriod,
  isInTrackingPool,
  getQuarterlyTarget,
  getAllRegions,
  PERIOD_TYPE_OPTIONS,
} from './utils/trackingUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  TrendingUp, AlertCircle, CheckCircle2, Clock, BarChart3, Calendar, Download, Filter, Settings,
  Search, Plus, Edit2, Trash2, X, Camera, Loader2, Upload, FileText, MapPin, ClipboardPaste,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, getQuarter, differenceInDays } from 'date-fns';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

// 导入子组件
import StatCard, { RmbIcon } from './components/StatCard';
import Modal from './components/Modal';
import DrillDownModal from './components/DrillDownModal';
import RevenueDrillDownModal from './components/RevenueDrillDownModal';
import AcceptedNotAcquiredDrillDownModal from './components/AcceptedNotAcquiredDrillDownModal';
import TargetSettingModal from './components/TargetSettingModal';
import BatchUpdateModal from './components/BatchUpdateModal';
import AdvancedFilterModal from './components/AdvancedFilterModal';
import SortableItem from './components/SortableItem';
import AcceptanceTrackingEditModal from './components/AcceptanceTrackingEditModal';
import ProjectDetailPanel from '../ProjectDetailPanel';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899'];

interface AcceptanceTrackingDashboardProps {
  allProjects: Project[];
  isAdmin: boolean;
}

export default function AcceptanceTrackingDashboard({ allProjects, isAdmin }: AcceptanceTrackingDashboardProps) {
  // ===== 状态管理 =====
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [trackingProjects, setTrackingProjects] = useState<Project[]>([]);

  // 报表日期与周期
  const [reportDate, setReportDate] = useState(new Date('2026-04-30'));
  const [periodType, setPeriodType] = useState<TrackingPeriodType>('thisMonth');
  const [customRange, setCustomRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  // 区域筛选
  const [selectedRegion, setSelectedRegion] = useState('全部');
  const [selectedStatus, setSelectedStatus] = useState('全部');
  const [selectedAcceptanceRisk, setSelectedAcceptanceRisk] = useState('全部');
  const [selectedRevenueRisk, setSelectedRevenueRisk] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');

  // 高级筛选
  const [isAdvancedFilterModalOpen, setIsAdvancedFilterModalOpen] = useState(false);
  const [isAdvancedSearchActive, setIsAdvancedSearchActive] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    regions: [] as string[],
    levels: [] as string[],
    statuses: [] as TrackingStatus[],
    risks: [] as string[],
    revenueRisks: [] as string[],
    acceptanceStatus: '全部' as '全部' | '已验收' | '未验收',
    visibleColumns: [] as string[],
  });

  // 指标设置
  const [revenueTargets, setRevenueTargets] = useState<Record<string, Record<number, number>>>(REGION_QUARTERLY_TARGETS);

  // 弹窗状态
  const [isDrillDownModalOpen, setIsDrillDownModalOpen] = useState(false);
  const [isRevenueDrillDownModalOpen, setIsRevenueDrillDownModalOpen] = useState(false);
  const [isAcceptedNotAcquiredModalOpen, setIsAcceptedNotAcquiredModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // 移除追踪确认弹窗
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [removingProject, setRemovingProject] = useState<Project | null>(null);

  // 项目详情弹窗
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  // 列设置
  const [columnOrder, setColumnOrder] = useState<string[]>(() => TRACKING_ALL_COLUMNS.map(c => c.id));
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    'projectName', 'region', 'level', 'projectManager', 'contractAmount', 'trackingAcceptanceRisk', 'trackingRevenueRisk', 'acceptanceControl'
  ]);

  // 选择的项目
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // 风险图表模式
  const [riskChartMode, setRiskChartMode] = useState<'acceptance' | 'revenue'>('acceptance');

  // DnD 传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ===== 数据加载 =====
  useEffect(() => {
    loadTrackingProjects();
  }, [allProjects]);

  const loadTrackingProjects = async () => {
    try {
      const response = await fetch('/api/acceptance-tracking/projects');
      const result = await response.json();
      if (result.success) {
        setTrackingProjects(result.data);
      } else {
        // 备选：使用本地筛选
        setTrackingProjects(allProjects.filter(p => p.isAcceptanceTracking));
      }
    } catch (error) {
      console.error('加载追踪项目失败:', error);
      setTrackingProjects(allProjects.filter(p => p.isAcceptanceTracking));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 统计计算 =====
  const stats = useMemo(() => {
    const currentInterval = getPeriodInterval(reportDate, periodType, customRange);
    const prevInterval = getPreviousPeriodInterval(reportDate, periodType);

    // 按区域筛选
    const filteredByRegion = selectedRegion === '全部'
      ? trackingProjects
      : trackingProjects.filter(p => p.region === selectedRegion);

    // 判断日期在周期内
    const isWithinPeriod = (dateStr: string | null | undefined) => isDateWithinPeriod(dateStr, currentInterval);

    // 项目池筛选
    const pool = filteredByRegion.filter(p => isInTrackingPool(p, currentInterval, reportDate));

    // ===== Count指标 =====
    const countMetrics = {
      expected: pool.length,
      forecast: pool.filter(p => p.timeline?.acceptanceControl === '可控').length,
      completed: pool.filter(p => {
        const status = calculateTrackingStatus(p, reportDate);
        return status.includes('已验收') && isWithinPeriod(p.timeline?.acceptanceDate);
      }).length,
      sprint: pool.filter(p => {
        const status = calculateTrackingStatus(p, reportDate);
        return status.includes('实施中') && ['低', '中', '无'].includes(p.trackingAcceptanceRisk || '无');
      }).length,
      lagging: pool.filter(p => {
        const status = calculateTrackingStatus(p, reportDate);
        return status.includes('实施中') && p.trackingAcceptanceRisk === '高';
      }).length,
      completedDetails: (() => {
        const completedPool = pool.filter(p => {
          const status = calculateTrackingStatus(p, reportDate);
          return status.includes('已验收') && isWithinPeriod(p.timeline?.acceptanceDate);
        });
        const onSchedule = completedPool.filter(p => {
          const plannedEnd = p.timeline?.plannedEndDate;
          return plannedEnd && isDateWithinPeriod(plannedEnd, currentInterval);
        });
        const early = completedPool.filter(p => {
          const plannedEnd = p.timeline?.plannedEndDate;
          return plannedEnd && !isDateWithinPeriod(plannedEnd, currentInterval);
        });
        return { onSchedule, early };
      })(),
    };

    // ===== Sum指标 =====
    const quarter = getQuarter(currentInterval.end);
    const sumMetrics = {
      expected: selectedRegion === '全部'
        ? Object.values(revenueTargets).reduce((acc, qTargets) => acc + qTargets[quarter], 0)
        : revenueTargets[selectedRegion]?.[quarter] || 0,
      totalAcquired: filteredByRegion.filter(p => {
        const confirmedDate = p.payment?.confirmedDate;
        return confirmedDate && isDateWithinPeriod(confirmedDate, { start: new Date('2026-01-01'), end: currentInterval.end });
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      acquired: filteredByRegion.filter(p => isWithinPeriod(p.payment?.confirmedDate)).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      totalAcceptedNotAcquired: filteredByRegion.filter(p => {
        const acceptanceDate = p.timeline?.acceptanceDate;
        const confirmedDate = p.payment?.confirmedDate;
        return acceptanceDate && isDateWithinPeriod(acceptanceDate, { start: new Date('2026-01-01'), end: currentInterval.end }) && (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval));
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      newAcceptedNotAcquired: filteredByRegion.filter(p => {
        const acceptanceDate = p.timeline?.acceptanceDate;
        const confirmedDate = p.payment?.confirmedDate;
        return isWithinPeriod(acceptanceDate) && (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval));
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      forecast: filteredByRegion.filter(p => {
        const confirmedDate = p.payment?.confirmedDate;
        return (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval)) && ['无', '低', '中'].includes(p.trackingRevenueRisk || '无');
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      highRisk: filteredByRegion.filter(p => {
        const confirmedDate = p.payment?.confirmedDate;
        return (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval)) && p.trackingRevenueRisk === '高';
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
      acquiredDetails: (() => {
        const acquiredPool = filteredByRegion.filter(p => isWithinPeriod(p.payment?.confirmedDate));
        const normal = acquiredPool.filter(p => {
          const plannedEnd = p.timeline?.plannedEndDate;
          return plannedEnd && isDateWithinPeriod(plannedEnd, currentInterval);
        });
        const advance = acquiredPool.filter(p => {
          const plannedEnd = p.timeline?.plannedEndDate;
          return plannedEnd && !isDateWithinPeriod(plannedEnd, currentInterval);
        });
        const pastYear = acquiredPool.filter(p => {
          const confirmedDate = p.payment?.confirmedDate;
          return confirmedDate && parseISO(confirmedDate).getFullYear() < reportDate.getFullYear();
        });
        return { normal, advance, pastYear };
      })(),
      acceptedNotAcquiredDetails: filteredByRegion.filter(p => {
        const acceptanceDate = p.timeline?.acceptanceDate;
        const confirmedDate = p.payment?.confirmedDate;
        return acceptanceDate && isDateWithinPeriod(acceptanceDate, { start: new Date('2026-01-01'), end: currentInterval.end }) && (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval));
      }),
    };

    // ===== 趋势对比 =====
    const trends = prevInterval ? (() => {
      const prevStats = calculateMetrics(prevInterval.start, prevInterval.end);
      return {
        expected: countMetrics.expected - prevStats.countMetrics.expected,
        forecast: countMetrics.forecast - prevStats.countMetrics.forecast,
        completed: countMetrics.completed - prevStats.countMetrics.completed,
        sprint: countMetrics.sprint - prevStats.countMetrics.sprint,
        lagging: countMetrics.lagging - prevStats.countMetrics.lagging,
        acquired: sumMetrics.acquired - prevStats.sumMetrics.acquired,
        newAcceptedNotAcquired: sumMetrics.newAcceptedNotAcquired - prevStats.sumMetrics.newAcceptedNotAcquired,
        forecastSum: sumMetrics.forecast - prevStats.sumMetrics.forecast,
        highRisk: sumMetrics.highRisk - prevStats.sumMetrics.highRisk,
        label: periodType === 'thisWeek' ? '较上周' : periodType === 'thisMonth' ? '较上月' : '较上季',
      };
    })() : null;

    // 辅助函数
    function calculateMetrics(start: Date, end: Date) {
      const interval = { start, end };
      const filteredByRegion = selectedRegion === '全部'
        ? trackingProjects
        : trackingProjects.filter(p => p.region === selectedRegion);
      const pool = filteredByRegion.filter(p => isInTrackingPool(p, interval, reportDate));
      const isWithinPrev = (dateStr: string | null | undefined) => isDateWithinPeriod(dateStr, interval);

      return {
        countMetrics: {
          expected: pool.length,
          forecast: pool.filter(p => p.timeline?.acceptanceControl === '可控').length,
          completed: pool.filter(p => {
            const status = calculateTrackingStatus(p, reportDate);
            return status.includes('已验收') && isWithinPrev(p.timeline?.acceptanceDate);
          }).length,
          sprint: pool.filter(p => {
            const status = calculateTrackingStatus(p, reportDate);
            return status.includes('实施中') && ['低', '中', '无'].includes(p.trackingAcceptanceRisk || '无');
          }).length,
          lagging: pool.filter(p => {
            const status = calculateTrackingStatus(p, reportDate);
            return status.includes('实施中') && p.trackingAcceptanceRisk === '高';
          }).length,
        },
        sumMetrics: {
          acquired: filteredByRegion.filter(p => isWithinPrev(p.payment?.confirmedDate)).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
          newAcceptedNotAcquired: filteredByRegion.filter(p => {
            return isWithinPrev(p.timeline?.acceptanceDate) && (!p.payment?.confirmedDate || !isWithinPrev(p.payment?.confirmedDate));
          }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
          forecast: filteredByRegion.filter(p => {
            return (!p.payment?.confirmedDate || !isWithinPrev(p.payment?.confirmedDate)) && ['无', '低', '中'].includes(p.trackingRevenueRisk || '无');
          }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
          highRisk: filteredByRegion.filter(p => {
            return (!p.payment?.confirmedDate || !isWithinPrev(p.payment?.confirmedDate)) && p.trackingRevenueRisk === '高';
          }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0),
        },
      };
    }

    // ===== 图表数据 =====
    const regions = getAllRegions();
    const regionalAchievementData = regions.map(region => {
      const regionProjects = trackingProjects.filter(p => p.region === region);
      const pool = regionProjects.filter(p => isInTrackingPool(p, currentInterval, reportDate));
      const completedCount = pool.filter(p => {
        const status = calculateTrackingStatus(p, reportDate);
        return status.includes('已验收') && isWithinPeriod(p.timeline?.acceptanceDate);
      }).length;
      const forecastCount = pool.filter(p => p.timeline?.acceptanceControl === '可控').length;
      const acceptanceRate = forecastCount > 0 ? (completedCount / forecastCount) * 100 : 0;

      const totalConfirmedAmount = regionProjects.filter(p => {
        const confirmedDate = p.payment?.confirmedDate;
        return confirmedDate && isDateWithinPeriod(confirmedDate, { start: new Date('2026-01-01'), end: currentInterval.end });
      }).reduce((acc, p) => acc + (p.payment?.contractAmount || 0), 0);
      const target = getQuarterlyTarget(region, quarter);
      const revenueRate = target > 0 ? (totalConfirmedAmount / target) * 100 : 0;

      return {
        region,
        acceptance: { rate: Math.min(acceptanceRate, 100), actualRate: acceptanceRate, completed: completedCount, forecast: forecastCount, label: `${acceptanceRate.toFixed(0)}% (${completedCount}/${forecastCount})` },
        revenue: { rate: Math.min(revenueRate, 100), actualRate: revenueRate, confirmed: totalConfirmedAmount, target, label: `${revenueRate.toFixed(0)}% (${(totalConfirmedAmount / 1000000).toFixed(1)}M/${(target / 1000000).toFixed(1)}M)` },
      };
    });

    const acceptanceRiskDistribution = regions.map(region => {
      const regionProjects = trackingProjects.filter(p => p.region === region);
      const inProgress = regionProjects.filter(p => {
        const status = calculateTrackingStatus(p, reportDate);
        return !status.includes('已验收');
      });
      const counts = inProgress.reduce((acc: any, p) => {
        const risk = p.trackingAcceptanceRisk || '无';
        acc[risk] = (acc[risk] || 0) + 1;
        return acc;
      }, { '高': 0, '中': 0, '低': 0, '无': 0 });
      return { region, ...counts };
    });

    const revenueRiskDistribution = regions.map(region => {
      const regionProjects = trackingProjects.filter(p => p.region === region);
      const acceptedNotConfirmed = regionProjects.filter(p => {
        const acceptanceDate = p.timeline?.acceptanceDate;
        const confirmedDate = p.payment?.confirmedDate;
        return acceptanceDate && isDateWithinPeriod(acceptanceDate, currentInterval) && (!confirmedDate || !isDateWithinPeriod(confirmedDate, currentInterval));
      });
      const amounts = acceptedNotConfirmed.reduce((acc: any, p) => {
        const risk = p.trackingRevenueRisk || '无';
        acc[risk] = (acc[risk] || 0) + (p.payment?.contractAmount || 0);
        return acc;
      }, { '高': 0, '中': 0, '低': 0, '无': 0 });
      return { region, ...amounts };
    });

    // 高风险原因分析
    const highRiskProjects = pool.filter(p => p.trackingAcceptanceRisk === '高');
    const reasonCounts = highRiskProjects.reduce((acc: any, p) => {
      const reason = p.riskReason || '未填写原因';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
    const highRiskReasonAnalysis = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count: count as number, percentage: highRiskProjects.length > 0 ? ((count as number) / highRiskProjects.length) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const completionRate = countMetrics.expected > 0 ? (countMetrics.completed / countMetrics.expected) * 100 : 0;

    return {
      countMetrics,
      sumMetrics,
      trends,
      completionRate,
      regionalAchievementData,
      acceptanceRiskDistribution,
      revenueRiskDistribution,
      highRiskReasonAnalysis,
      highRiskProjects,
    };
  }, [trackingProjects, reportDate, periodType, selectedRegion, customRange, revenueTargets]);

  // ===== 筛选项目 =====
  const filteredProjects = useMemo(() => {
    return trackingProjects.filter(p => {
      const status = calculateTrackingStatus(p, reportDate);
      const matchesSearch = searchTerm === '' ||
        p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.members?.projectManager || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = selectedRegion === '全部' || p.region === selectedRegion;
      const matchesStatus = selectedStatus === '全部' || status === selectedStatus;
      const matchesAcceptanceRisk = selectedAcceptanceRisk === '全部' || p.trackingAcceptanceRisk === selectedAcceptanceRisk;
      const matchesRevenueRisk = selectedRevenueRisk === '全部' || p.trackingRevenueRisk === selectedRevenueRisk;

      // 高级筛选
      const matchesAdvRegion = advancedFilters.regions.length === 0 || advancedFilters.regions.includes(p.region);
      const matchesAdvLevel = advancedFilters.levels.length === 0 || advancedFilters.levels.includes(p.level);
      const matchesAdvRisk = advancedFilters.risks.length === 0 || advancedFilters.risks.includes(p.trackingAcceptanceRisk || '无');
      const matchesAdvRevenueRisk = advancedFilters.revenueRisks.length === 0 || advancedFilters.revenueRisks.includes(p.trackingRevenueRisk || '无');

      return matchesSearch && matchesRegion && matchesStatus && matchesAcceptanceRisk && matchesRevenueRisk &&
        matchesAdvRegion && matchesAdvLevel && matchesAdvRisk && matchesAdvRevenueRisk;
    });
  }, [trackingProjects, searchTerm, selectedRegion, selectedStatus, selectedAcceptanceRisk, selectedRevenueRisk, advancedFilters, reportDate]);

  // ===== 操作函数 =====
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumnOrder(items => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleColumn = (id: string, isVisible: boolean) => {
    if (isVisible) {
      setVisibleColumns([...visibleColumns, id]);
    } else {
      setVisibleColumns(visibleColumns.filter(colId => colId !== id));
    }
  };

  const handleExportImage = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(dashboardRef.current, { backgroundColor: '#f8fafc' });
      download(dataUrl, `验收追踪报表_${format(new Date(), 'yyyyMMdd_HHmmss')}.png`);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredProjects.map(project => {
      const row: any = {};
      TRACKING_ALL_COLUMNS.forEach(col => {
        let value: any;
        switch (col.id) {
          case 'projectCode': value = project.projectCode; break;
          case 'projectName': value = project.projectName; break;
          case 'region': value = project.region; break;
          case 'level': value = project.level; break;
          case 'projectManager': value = project.members?.projectManager || ''; break;
          case 'salesManager': value = project.members?.salesManager || ''; break;
          case 'contractAmount': value = (project.payment?.contractAmount || 0).toLocaleString(); break;
          case 'kickoffDate': value = project.timeline?.kickoffDate || ''; break;
          case 'plannedEndDate': value = project.timeline?.plannedEndDate || ''; break;
          case 'forecastAcceptanceDate': value = project.forecastAcceptanceDate || ''; break;
          case 'acceptanceDate': value = project.timeline?.acceptanceDate || ''; break;
          case 'confirmedDate': value = project.payment?.confirmedDate || ''; break;
          case 'documentReceivedDate': value = project.documentReceivedDate || ''; break;
          case 'trackingAcceptanceRisk': value = project.trackingAcceptanceRisk || '无'; break;
          case 'trackingRevenueRisk': value = project.trackingRevenueRisk || '无'; break;
          case 'acceptanceControl': value = project.timeline?.acceptanceControl || ''; break;
          case 'trackingStatus': value = calculateTrackingStatus(project, reportDate); break;
          case 'remarks': value = project.remarks || ''; break;
          case 'solutionMeasures': value = project.solutionMeasures || ''; break;
          default: value = '';
        }
        row[col.label] = value || '-';
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '验收追踪');
    XLSX.writeFile(workbook, `验收追踪报表_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  const handleBatchUpdate = async (updateData: Partial<Project>) => {
    try {
      const response = await fetch('/api/acceptance-tracking/projects/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: selectedProjectIds, updateData }),
      });
      const result = await response.json();
      if (result.success) {
        loadTrackingProjects();
        setSelectedProjectIds([]);
      }
    } catch (error) {
      console.error('批量更新失败:', error);
    }
  };

  // 编辑项目
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleEditSave = async (projectId: string, updateData: Record<string, any>) => {
    try {
      const response = await fetch(`/api/acceptance-tracking/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();
      if (result.success) {
        loadTrackingProjects();
      } else {
        alert('更新失败: ' + result.error);
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      alert('更新失败，请稍后重试');
    }
  };

  // 移除追踪
  const handleRemoveTracking = (project: Project) => {
    setRemovingProject(project);
    setIsRemoveConfirmOpen(true);
  };

  // 确认移除追踪
  const handleConfirmRemove = async () => {
    if (!removingProject) return;
    try {
      const response = await fetch(`/api/acceptance-tracking/projects/${removingProject.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTracking: false }),
      });
      const result = await response.json();
      if (result.success) {
        loadTrackingProjects();
        setIsRemoveConfirmOpen(false);
        setRemovingProject(null);
      } else {
        alert('移除失败: ' + result.error);
      }
    } catch (error) {
      console.error('移除追踪失败:', error);
      alert('移除失败，请稍后重试');
    }
  };

  // 打开项目详情
  const handleOpenDetail = (project: Project) => {
    setDetailProject(project);
    setIsDetailPanelOpen(true);
  };

  // 关闭项目详情
  const handleCloseDetail = () => {
    setIsDetailPanelOpen(false);
    setDetailProject(null);
  };

  // 项目详情更新回调
  const handleDetailUpdate = async (updatedProject: Project) => {
    // 重新加载追踪项目列表
    loadTrackingProjects();
    // 更新详情弹窗中的项目数据
    setDetailProject(updatedProject);
  };

  // ===== 渲染 =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (trackingProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <div className="text-slate-500 text-lg">暂无追踪项目</div>
        <div className="text-sm text-slate-400">请在全量项目大图中勾选"是否追踪验收"添加项目</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ===== 顶部筛选区域 ===== */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">区域筛选:</span>
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[140px]"
        >
          <option value="全部">全部区域</option>
          {getAllRegions().map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">统计周期:</span>
        </div>
        <select
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as TrackingPeriodType)}
          className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {PERIOD_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>

        {periodType === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={format(customRange.start, 'yyyy-MM-dd')}
              onChange={(e) => setCustomRange(prev => ({ ...prev, start: parseISO(e.target.value) }))}
              className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2"
            />
            <span className="text-slate-400">至</span>
            <input
              type="date"
              value={format(customRange.end, 'yyyy-MM-dd')}
              onChange={(e) => setCustomRange(prev => ({ ...prev, end: parseISO(e.target.value) }))}
              className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            看板
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'projects' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FileText className="w-4 h-4" />
            项目列表
          </button>
        </div>
      </div>

      {/* ===== 主内容区域 ===== */}
      {activeTab === 'dashboard' ? (
        <div ref={dashboardRef} className="flex flex-col gap-6 overflow-auto px-1">
          {/* Count指标卡片 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                验收进度指标 (Count)
              </h3>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                验收率: {stats.completionRate.toFixed(1)}%
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="应验收总数" value={stats.countMetrics.expected} icon={Clock} color="bg-blue-500" trend={stats.trends ? { value: stats.trends.expected, label: stats.trends.label } : undefined} />
              <StatCard title="预测验收值" value={stats.countMetrics.forecast} icon={TrendingUp} color="bg-indigo-500" trend={stats.trends ? { value: stats.trends.forecast, label: stats.trends.label } : undefined} />
              <StatCard title="已完成验收" value={stats.countMetrics.completed} icon={CheckCircle2} color="bg-emerald-500" valueClassName="text-emerald-600" onClick={() => setIsDrillDownModalOpen(true)}
                trend={stats.trends ? { value: stats.trends.completed, label: stats.trends.label } : undefined}
                footer={<div className="flex justify-between text-[10px] font-bold text-slate-400"><span>准时: {stats.countMetrics.completedDetails.onSchedule.length}</span><span>提前: {stats.countMetrics.completedDetails.early.length}</span></div>} />
              <StatCard title="冲刺争取项" value={stats.countMetrics.sprint} icon={TrendingUp} color="bg-indigo-500" trend={stats.trends ? { value: stats.trends.sprint, label: stats.trends.label } : undefined} />
              <StatCard title="高危滞后项" value={stats.countMetrics.lagging} icon={AlertCircle} color="bg-rose-500" valueClassName="text-rose-600" trend={stats.trends ? { value: stats.trends.lagging, label: stats.trends.label } : undefined} />
            </div>
          </section>

          {/* Sum指标卡片 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <RmbIcon className="w-4 h-4" />
              收入确认指标 (Sum)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="确认收入指标" value={stats.sumMetrics.expected} prefix="¥" icon={RmbIcon} color="bg-blue-600"
                action={<button onClick={() => setIsTargetModalOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 border border-slate-100"><Settings className="w-3 h-3" />设置</button>} />
              <StatCard title="已确认金额" value={stats.sumMetrics.totalAcquired} prefix="¥" subValue={`本期: ¥${stats.sumMetrics.acquired.toLocaleString()}`} icon={CheckCircle2} color="bg-emerald-600" valueClassName="text-emerald-600"
                onClick={() => setIsRevenueDrillDownModalOpen(true)} trend={stats.trends ? { value: stats.trends.acquired, label: stats.trends.label } : undefined}
                footer={<div className="flex justify-between text-[10px] font-bold text-slate-400"><span>正常: {stats.sumMetrics.acquiredDetails.normal.length}</span><span>提前: {stats.sumMetrics.acquiredDetails.advance.length}</span><span>往年: {stats.sumMetrics.acquiredDetails.pastYear.length}</span></div>} />
              <StatCard title="已验收未确认" value={stats.sumMetrics.totalAcceptedNotAcquired} prefix="¥" subValue={`本期新增: ¥${stats.sumMetrics.newAcceptedNotAcquired.toLocaleString()}`} icon={Clock} color="bg-amber-600" valueClassName="text-amber-600"
                onClick={() => setIsAcceptedNotAcquiredModalOpen(true)} trend={stats.trends ? { value: stats.trends.newAcceptedNotAcquired, label: stats.trends.label } : undefined} />
              <StatCard title="预测可确认" value={stats.sumMetrics.forecast} prefix="¥" icon={TrendingUp} color="bg-indigo-600" trend={stats.trends ? { value: stats.trends.forecastSum, label: stats.trends.label } : undefined} />
              <StatCard title="确认高风险" value={stats.sumMetrics.highRisk} prefix="¥" icon={AlertCircle} color="bg-rose-600" valueClassName="text-rose-600" trend={stats.trends ? { value: stats.trends.highRisk, label: stats.trends.label } : undefined} />
            </div>
          </section>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 区域达成对比 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold">各区域指标达成对比图</h4>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-slate-400">验收达成率</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-400">确认收入达成率</span></div>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.regionalAchievementData} layout="vertical" margin={{ left: 20, right: 120, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="region" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} width={100} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                            <p className="text-sm font-bold text-slate-900 mb-2">{data.region}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4 text-xs"><span className="text-slate-500">验收达成:</span><span className="font-bold text-indigo-600">{data.acceptance.label}</span></div>
                              <div className="flex justify-between gap-4 text-xs"><span className="text-slate-500">收入达成:</span><span className="font-bold text-emerald-600">{data.revenue.label}</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="acceptance.rate" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10}>
                      <LabelList dataKey="acceptance.label" position="right" style={{ fontSize: 10, fill: '#6366f1', fontWeight: 700 }} />
                    </Bar>
                    <Bar dataKey="revenue.rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10}>
                      <LabelList dataKey="revenue.label" position="right" style={{ fontSize: 10, fill: '#10b981', fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 风险分布图 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold">风险分布动态切换图</h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setRiskChartMode('acceptance')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', riskChartMode === 'acceptance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500')}>验收风险</button>
                  <button onClick={() => setRiskChartMode('revenue')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', riskChartMode === 'revenue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500')}>确认收入风险</button>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskChartMode === 'acceptance' ? stats.acceptanceRiskDistribution : stats.revenueRiskDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => riskChartMode === 'revenue' ? `¥${(value / 10000).toFixed(1)}万` : value} />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="高" fill="#EF4444" name="高风险" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="中" fill="#F59E0B" name="中风险" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="低" fill="#3B82F6" name="低风险" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="无" fill="#10B981" name="无风险" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 高风险原因分析 */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">无法验收项目原因分析</h3>
                <p className="text-xs text-slate-500 mt-1">Top 5 风险原因分布</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-8">
              {stats.highRiskReasonAnalysis.map((entry) => (
                <div key={entry.reason} className="flex-1 min-w-[160px] flex flex-col items-center text-center group">
                  <span className="text-sm text-slate-500 mb-3 font-medium group-hover:text-slate-700">{entry.reason}</span>
                  <span className="text-[32px] font-black text-rose-500 leading-none mb-2">{entry.count}</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">占比 {entry.percentage.toFixed(1)}%</span>
                </div>
              ))}
              {stats.highRiskReasonAnalysis.length === 0 && (
                <div className="w-full py-10 text-center text-slate-400 text-sm">当前筛选条件下暂无高风险验收项目</div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* ===== 项目列表视图 ===== */
        <div className="flex flex-col gap-4 overflow-auto">
          {/* 筛选栏 */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100">
            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 min-w-[100px]">
              <option value="全部">全部区域</option>
              {getAllRegions().map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 min-w-[100px]">
              <option value="全部">全部状态</option>
              <option value="未立项已确认">未立项已确认</option>
              <option value="未立项">未立项</option>
              <option value="实施中">实施中</option>
              <option value="实施中已确认">实施中已确认</option>
              <option value="已验收未确认">已验收未确认</option>
              <option value="已验收已确认">已验收已确认</option>
              <option value="往年验收今年确认">往年验收今年确认</option>
            </select>
            <select value={selectedAcceptanceRisk} onChange={(e) => setSelectedAcceptanceRisk(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 min-w-[100px]">
              <option value="全部">验收风险</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
              <option value="无">无</option>
              <option value="已验收">已验收</option>
            </select>
            <select value={selectedRevenueRisk} onChange={(e) => setSelectedRevenueRisk(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 min-w-[100px]">
              <option value="全部">收入风险</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
              <option value="无">无</option>
              <option value="已确认">已确认</option>
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input placeholder="搜索项目..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
            </div>
            <button onClick={() => setIsAdvancedFilterModalOpen(true)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border', isAdvancedSearchActive ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600')}>
              <Filter className="w-3.5 h-3.5" />筛选 {isAdvancedSearchActive && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
            </button>
            <button onClick={() => { setSelectedRegion('全部'); setSelectedStatus('全部'); setSelectedAcceptanceRisk('全部'); setSelectedRevenueRisk('全部'); setSearchTerm(''); }} className="text-xs text-indigo-600 font-medium">重置</button>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            {isAdmin && (
              <button onClick={() => { if (selectedProjectIds.length === 0) return alert('请先选择项目'); setIsBatchUpdateModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100">
                <FileText className="w-3.5 h-3.5" />批量更新
              </button>
            )}
            <button onClick={() => setIsColumnSettingsOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100">
              <Settings className="w-3.5 h-3.5" />列设置
            </button>

            <div className="text-xs text-slate-400">共 {filteredProjects.length} 个项目</div>
          </div>

          {/* 项目表格 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0">
                    <th className="px-6 py-4 w-10">
                      <input type="checkbox" checked={selectedProjectIds.length === filteredProjects.length && filteredProjects.length > 0}
                        onChange={(e) => setSelectedProjectIds(e.target.checked ? filteredProjects.map(p => p.id) : [])} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
                    </th>
                    {columnOrder.filter(id => visibleColumns.includes(id)).map(id => {
                      const col = TRACKING_ALL_COLUMNS.find(c => c.id === id);
                      if (!col) return null;
                      return <th key={id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col.label}</th>;
                    })}
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right sticky right-0 bg-slate-50/50">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProjects.map(project => {
                    const status = calculateTrackingStatus(project, reportDate);
                    const focusLevel = calculateTrackingFocusLevel(project.payment?.contractAmount || 0);
                    const statusColor = getTrackingStatusColor(status);
                    const acceptanceRiskColor = getAcceptanceRiskColor(project.trackingAcceptanceRisk || '无');
                    const revenueRiskColor = getRevenueRiskColor(project.trackingRevenueRisk || '无');
                    const controlColor = getControllabilityColor(project.timeline?.acceptanceControl || '');

                    return (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedProjectIds.includes(project.id)}
                            onChange={(e) => setSelectedProjectIds(e.target.checked ? [...selectedProjectIds, project.id] : selectedProjectIds.filter(id => id !== project.id))} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
                        </td>
                        {columnOrder.filter(id => visibleColumns.includes(id)).map(colId => {
                          const col = TRACKING_ALL_COLUMNS.find(c => c.id === colId);
                          if (!col) return null;
                          return (
                            <td key={colId} className="px-6 py-4 whitespace-nowrap">
                              {renderCell(project, colId, status, focusLevel, statusColor, acceptanceRiskColor, revenueRiskColor, controlColor)}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/50">
                          {isAdmin && (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditProject(project)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg" title="编辑追踪信息"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleRemoveTracking(project)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg" title="移除追踪"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                          {!isAdmin && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={visibleColumns.length + 2} className="px-6 py-12 text-center text-slate-400">暂无项目数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 弹窗组件 ===== */}
      <DrillDownModal isOpen={isDrillDownModalOpen} onClose={() => setIsDrillDownModalOpen(false)} data={stats.countMetrics.completedDetails} />
      <RevenueDrillDownModal isOpen={isRevenueDrillDownModalOpen} onClose={() => setIsRevenueDrillDownModalOpen(false)} data={stats.sumMetrics.acquiredDetails} />
      <AcceptedNotAcquiredDrillDownModal isOpen={isAcceptedNotAcquiredModalOpen} onClose={() => setIsAcceptedNotAcquiredModalOpen(false)} data={stats.sumMetrics.acceptedNotAcquiredDetails} />
      <TargetSettingModal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} targets={revenueTargets} onSave={setRevenueTargets} />
      <BatchUpdateModal isOpen={isBatchUpdateModalOpen} onClose={() => setIsBatchUpdateModalOpen(false)} onUpdate={handleBatchUpdate} selectedCount={selectedProjectIds.length} />
      <AcceptanceTrackingEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} project={editingProject} onSave={handleEditSave} />
      <AdvancedFilterModal isOpen={isAdvancedFilterModalOpen} onClose={() => setIsAdvancedFilterModalOpen(false)} filters={advancedFilters}
        onApply={(f) => { setAdvancedFilters(f); setIsAdvancedSearchActive(true); if (f.visibleColumns.length > 0) setVisibleColumns(f.visibleColumns); }}
        onReset={() => { setAdvancedFilters({ regions: [], levels: [], statuses: [], risks: [], revenueRisks: [], acceptanceStatus: '全部', visibleColumns: [] }); setIsAdvancedSearchActive(false); }} />

      {/* 移除追踪确认弹窗 */}
      <Modal isOpen={isRemoveConfirmOpen} onClose={() => setIsRemoveConfirmOpen(false)} title="移除追踪确认" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-700">确认移除追踪？</p>
                <p className="text-xs text-rose-600 mt-1">移除后该项目将不再出现在验收追踪看板中</p>
              </div>
            </div>
          </div>
          {removingProject && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-sm font-bold text-slate-900">{removingProject.projectName}</p>
              <p className="text-xs text-slate-500">{removingProject.projectCode} · {removingProject.region}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsRemoveConfirmOpen(false)} className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              取消
            </button>
            <button onClick={handleConfirmRemove} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-all shadow-sm shadow-rose-200">
              确认移除
            </button>
          </div>
        </div>
      </Modal>

      {/* 列设置弹窗 */}
      <Modal isOpen={isColumnSettingsOpen} onClose={() => setIsColumnSettingsOpen(false)} title="配置显示列 (拖拽可排序)">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">勾选以显示字段，拖拽左侧图标可调整显示顺序</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {columnOrder.map(id => {
                  const col = TRACKING_ALL_COLUMNS.find(c => c.id === id);
                  if (!col) return null;
                  return <SortableItem key={id} id={id} label={col.label} isVisible={visibleColumns.includes(id)} onToggle={handleToggleColumn} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => { setColumnOrder(TRACKING_ALL_COLUMNS.map(c => c.id)); setVisibleColumns(['projectName', 'region', 'level', 'projectManager', 'contractAmount', 'trackingAcceptanceRisk', 'trackingRevenueRisk', 'acceptanceControl']); }} className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl">重置默认</button>
          <button onClick={() => setIsColumnSettingsOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">确定</button>
        </div>
      </Modal>

      {/* 项目详情弹窗 */}
      {isDetailPanelOpen && detailProject && (
        <ProjectDetailPanel
          project={detailProject}
          onClose={handleCloseDetail}
          onUpdate={handleDetailUpdate}
          onEdit={handleEditProject}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );

  // ===== 表格单元格渲染 =====
  function renderCell(project: Project, colId: string, status: TrackingStatus, focusLevel: string, statusColor: any, acceptanceRiskColor: any, revenueRiskColor: any, controlColor: any): React.ReactNode {
    switch (colId) {
      case 'projectCode':
        return <span className="text-xs text-slate-500 font-mono uppercase">{project.projectCode}</span>;
      case 'projectName':
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenDetail(project)}
                className="text-xs font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
              >
                {project.projectName}
              </button>
              {project.isNewTracking && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded">新</span>}
            </div>
          </div>
        );
      case 'type':
        return <span className="text-xs text-slate-600">{project.type}</span>;
      case 'level':
        return <span className={cn('text-xs font-bold', project.level === '重大' || project.level === '核心' ? 'text-rose-600' : project.level === '重点' ? 'text-amber-600' : 'text-slate-600')}>{project.level}</span>;
      case 'region':
        return <span className="text-xs text-slate-600">{project.region}</span>;
      case 'projectManager':
        return <span className="text-xs text-slate-600 font-medium">{project.members?.projectManager || '-'}</span>;
      case 'salesManager':
        return <span className="text-xs text-slate-600">{project.members?.salesManager || '-'}</span>;
      case 'contractAmount':
        return <span className="text-xs font-bold text-slate-900">¥{(project.payment?.contractAmount || 0).toLocaleString()}</span>;
      case 'kickoffDate':
        return <span className="text-xs text-slate-500">{project.timeline?.kickoffDate || '-'}</span>;
      case 'plannedEndDate':
        return <span className="text-xs text-slate-500">{project.timeline?.plannedEndDate || '-'}</span>;
      case 'forecastAcceptanceDate':
        return <span className="text-xs text-slate-500">{project.forecastAcceptanceDate || '-'}</span>;
      case 'acceptanceTrackingDate':
        return <span className="text-xs text-slate-500">{project.acceptanceTrackingDate || '-'}</span>;
      case 'acceptanceDate':
        return <span className="text-xs text-slate-500">{project.timeline?.acceptanceDate || '-'}</span>;
      case 'confirmedDate':
        return <span className="text-xs text-slate-500">{project.payment?.confirmedDate || '-'}</span>;
      case 'documentReceivedDate':
        return <span className="text-xs text-slate-500">{project.documentReceivedDate || '-'}</span>;
      case 'trackingAcceptanceRisk':
        return (
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', acceptanceRiskColor.dot)} />
            <span className="text-xs text-slate-600 font-medium">{project.trackingAcceptanceRisk || '无'}</span>
          </div>
        );
      case 'trackingRevenueRisk':
        return (
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', revenueRiskColor.dot)} />
            <span className="text-xs text-slate-600 font-medium">{project.trackingRevenueRisk || '无'}</span>
          </div>
        );
      case 'acceptanceControl':
        return <span className={cn('text-xs font-bold', controlColor.text)}>{project.timeline?.acceptanceControl || '-'}</span>;
      case 'mainWorkCompleted':
        return <span className={cn('text-[10px] font-bold uppercase', project.mainWorkCompleted === '已完成' ? 'text-emerald-600' : 'text-slate-400')}>{project.mainWorkCompleted || '-'}</span>;
      case 'changeCount':
        return <span className={cn('text-[10px] font-bold uppercase', project.changeCount > 0 ? 'text-amber-600' : 'text-slate-400')}>{project.changeCount > 0 ? `已变更(${project.changeCount})` : '未变更'}</span>;
      case 'isNewTracking':
        return <span className={cn('text-[10px] font-bold uppercase', project.isNewTracking ? 'text-indigo-600' : 'text-slate-400')}>{project.isNewTracking ? '是' : '否'}</span>;
      case 'focusLevel':
        return focusLevel ? <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold', focusLevel === '一级' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>{focusLevel}</span> : <span className="text-slate-300">-</span>;
      case 'trackingStatus':
        return <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight', statusColor.bg, statusColor.text)}>{status}</span>;
      case 'remarks':
        return <span className="text-xs text-slate-500 max-w-[200px] truncate">{project.remarks || '-'}</span>;
      case 'solutionMeasures':
        return <span className="text-xs text-amber-700 italic max-w-[200px] truncate">{project.solutionMeasures || '-'}</span>;
      default:
        return null;
    }
  }
}