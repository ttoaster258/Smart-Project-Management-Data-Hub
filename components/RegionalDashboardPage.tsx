import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  TrendingUp,
  Zap,
  Activity,
  ChevronRight,
  AlertTriangle,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';
import { Project, PRIMARY_REGIONS, ProjectStatus, REGION_MAPPING, MILESTONE_NODE_OPTIONS, MilestoneNode } from '../types';
import DashboardDrillDownModal from './DashboardDrillDownModal';
import { getUserDataScope, hasRole } from '../services/AuthService';

// --- Types ---

interface RegionalDashboardProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
}

// 季度定义
const QUARTERS = [
  { key: 'Q1', label: 'Q1', months: [1, 2, 3] },
  { key: 'Q2', label: 'Q2', months: [4, 5, 6] },
  { key: 'Q3', label: 'Q3', months: [7, 8, 9] },
  { key: 'Q4', label: 'Q4', months: [10, 11, 12] }
];

// 颜色配置
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];
const STATUS_COLORS: Record<string, string> = {
  '正在进行': '#3B82F6',
  '已验收': '#10B981',
  '延期': '#EF4444',
  '暂停': '#6B7280'
};

// 行业颜色
const INDUSTRY_COLORS: Record<string, string> = {
  '核能': '#3B82F6',
  '车辆': '#10B981',
  '电子信息': '#F59E0B',
  '电力能源': '#EF4444',
  '高端制造': '#8B5CF6',
  '教育': '#EC4899'
};

// 项目类型颜色
const TYPE_COLORS: Record<string, string> = {
  '销售项目': '#3B82F6',
  '开发项目': '#10B981',
  '混合项目': '#F59E0B',
  '内部项目': '#8B5CF6',
  '其他项目': '#6B7280'
};

// --- Utils ---

const formatCurrency = (value: number): string => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toLocaleString();
};

// --- Sub-Components ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-base font-bold rounded-xl transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
    }`}
  >
    {children}
  </button>
);

// 下钻模态框数据类型
interface DrillDownData {
  isOpen: boolean;
  title: string;
  projects: Project[];
  extraFields?: { key: string; label: string; type: 'currency' | 'percent' | 'date' | 'text' | 'tags' }[];
}

// 里程碑项数据类型
interface MilestoneItem {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectManager: string;
  projectStatus: ProjectStatus;
  milestoneNode: string;
  plannedDate: string;
  actualDate: string;
  status: 'completed' | 'not_completed' | 'skipped'; // 完成/未完成/遗漏
}

// --- Main Component ---

const RegionalDashboardPage: React.FC<RegionalDashboardProps> = ({
  projects,
  onNavigateToProject
}) => {
  // 区域总监权限相关
  const isRegionalDirector = hasRole('regional_director');
  const dataScope = getUserDataScope();
  const userRegion = dataScope.scope === 'region' ? dataScope.region : null;

  // 区域选择：区域总监锁定到自己的区域，默认第一个区域
  const [selectedRegion, setSelectedRegion] = useState<string>(
    isRegionalDirector && userRegion ? userRegion : PRIMARY_REGIONS[0]
  );
  const [drillDownData, setDrillDownData] = useState<DrillDownData>({ isOpen: false, title: '', projects: [] });
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1-12 表示月份

  // 筛选当前区域的项目
  const regionProjects = useMemo(() => {
    // 对于区域总监，使用其锁定的区域
    const effectiveRegion = isRegionalDirector && userRegion ? userRegion : selectedRegion;
    return projects.filter(p => {
      const mappedRegion = REGION_MAPPING[p.region] || p.region;
      return mappedRegion === effectiveRegion || mappedRegion.includes(effectiveRegion) || effectiveRegion.includes(mappedRegion);
    });
  }, [projects, selectedRegion, isRegionalDirector, userRegion]);

  // 模块1数据计算
  const module1Data = useMemo(() => {
    // 当前日期信息
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // 项目数量情况
    const totalProjects = regionProjects.length;
    const newProjects = regionProjects.filter(p => {
      const kickoffDate = p.timeline?.kickoffDate;
      return kickoffDate && kickoffDate.includes('2026');
    }).length;
    // 本月应验收：预测验收时间在当前月份内的项目数量
    const shouldAcceptProjects = regionProjects.filter(p => {
      const forecastDate = p.forecastAcceptanceDate;
      if (!forecastDate) return false;
      const dateParts = forecastDate.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      return year === currentYear && month === currentMonth;
    }).length;
    const acceptedProjects = regionProjects.filter(p => p.status === ProjectStatus.Accepted).length;

    // 合同额情况
    const totalContract = regionProjects.reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);
    const newContract = regionProjects.filter(p => {
      const kickoffDate = p.timeline?.kickoffDate;
      return kickoffDate && kickoffDate.includes('2026');
    }).reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);
    const acceptedContract = regionProjects.filter(p => p.status === ProjectStatus.Accepted)
      .reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);

    // 确认收入情况
    const confirmedRevenue = regionProjects.filter(p => {
      return p.payment?.isConfirmed && p.payment?.confirmedDate?.includes('2026');
    }).reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);
    const acceptedPending = regionProjects.filter(p => {
      return p.status === ProjectStatus.Accepted && !p.payment?.isConfirmed;
    }).reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);

    // 回款情况
    const totalPaid = regionProjects.reduce((sum, p) => {
      if (p.payment?.paymentNodes) {
        return sum + p.payment.paymentNodes.reduce((nodeSum, node) => nodeSum + (node.actualAmount || 0), 0);
      }
      return sum;
    }, 0);

    // 本月回款
    const monthlyPaid = regionProjects.reduce((sum, p) => {
      if (p.payment?.paymentNodes) {
        return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
          if (node.paymentDate && node.paymentDate.startsWith('2026')) {
            const month = parseInt(node.paymentDate.split('-')[1]);
            if (month === currentMonth) return nodeSum + (node.actualAmount || 0);
          }
          return nodeSum;
        }, 0);
      }
      return sum;
    }, 0);

    // 上月回款
    const prevMonth = currentMonth > 1 ? currentMonth - 1 : 12;
    const prevMonthlyPaid = regionProjects.reduce((sum, p) => {
      if (p.payment?.paymentNodes) {
        return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
          if (node.paymentDate && node.paymentDate.startsWith('2026')) {
            const month = parseInt(node.paymentDate.split('-')[1]);
            if (month === prevMonth) return nodeSum + (node.actualAmount || 0);
          }
          return nodeSum;
        }, 0);
      }
      return sum;
    }, 0);

    return {
      totalProjects,
      newProjects,
      shouldAcceptProjects,
      acceptedProjects,
      totalContract,
      newContract,
      acceptedContract,
      confirmedRevenue,
      acceptedPending,
      totalPaid,
      monthlyPaid,
      prevMonthlyPaid
    };
  }, [regionProjects]);

  // 子模块2：应验收项目季度数据
  const acceptanceQuarterlyData = useMemo(() => {
    return QUARTERS.map(quarter => {
      // 应验收项目：预测验收时间在该季度
      const shouldAccept = regionProjects.filter(p => {
        const forecastDate = p.forecastAcceptanceDate;
        if (!forecastDate || !forecastDate.startsWith('2026')) return false;
        const month = parseInt(forecastDate.split('-')[1]);
        return quarter.months.includes(month);
      });

      // 完成验收：验收日期在该季度且状态为已验收
      const completedAccept = regionProjects.filter(p => {
        if (p.status !== ProjectStatus.Accepted) return false;
        const acceptDate = p.timeline?.acceptanceDate;
        if (!acceptDate || !acceptDate.startsWith('2026')) return false;
        const month = parseInt(acceptDate.split('-')[1]);
        return quarter.months.includes(month);
      });

      // 高风险项目
      const highRisk = shouldAccept.filter(p => p.acceptanceRiskLevel === '高风险');

      return {
        quarter: quarter.label,
        shouldAcceptCount: shouldAccept.length,
        completedCount: completedAccept.length,
        highRiskCount: highRisk.length
      };
    });
  }, [regionProjects]);

  // 模块2：确认收入目标达成情况
  const revenueTargetData = useMemo(() => {
    // 各季度目标金额：Q1=1000万, Q2=1000万, Q3=2000万, Q4=1000万
    const QUARTER_TARGETS = [10000000, 10000000, 20000000, 10000000]; // 1000万、1000万、2000万、1000万
    const TOTAL_TARGET = 50000000; // 合计5000万

    const quarterData = QUARTERS.map((quarter, idx) => {
      const target = QUARTER_TARGETS[idx];
      const revenue = regionProjects.filter(p => {
        if (!p.payment?.isConfirmed || !p.payment?.confirmedDate) return false;
        const date = p.payment.confirmedDate;
        if (!date.startsWith('2026')) return false;
        const month = parseInt(date.split('-')[1]);
        return quarter.months.includes(month);
      }).reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0);

      return {
        quarter: quarter.label,
        revenue,
        target,
        rate: ((revenue / target) * 100).toFixed(1)
      };
    });

    // 合计
    const totalRevenue = quarterData.reduce((sum, q) => sum + q.revenue, 0);

    return {
      quarters: quarterData,
      total: {
        revenue: totalRevenue,
        target: TOTAL_TARGET,
        rate: ((totalRevenue / TOTAL_TARGET) * 100).toFixed(1)
      }
    };
  }, [regionProjects]);

  // 模块2：项目行业分析
  const industryAnalysisData = useMemo(() => {
    const industries = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];

    const industryStats = industries.map(industry => {
      const industryProjs = regionProjects.filter(p => p.industry === industry);

      return {
        industry,
        total: industryProjs.length,
        ongoing: industryProjs.filter(p => p.status === ProjectStatus.Ongoing).length,
        accepted: industryProjs.filter(p => p.status === ProjectStatus.Accepted).length,
        delayed: industryProjs.filter(p => p.status === ProjectStatus.Delayed).length,
        paused: industryProjs.filter(p => p.status === ProjectStatus.Paused).length
      };
    });

    // 已验收项目行业分析
    const acceptedByIndustry = industries.map(industry => {
      const acceptedProjs = regionProjects.filter(p =>
        p.industry === industry && p.status === ProjectStatus.Accepted
      );
      return {
        industry,
        count: acceptedProjs.length,
        amount: acceptedProjs.reduce((sum, p) => sum + (p.payment?.contractAmount || 0), 0)
      };
    }).filter(d => d.count > 0);

    // 已验收项目详细列表（用于右侧卡片展示）
    const acceptedProjectsList = regionProjects
      .filter(p => p.status === ProjectStatus.Accepted)
      .map(p => ({
        id: p.id,
        projectName: p.projectName,
        projectCode: p.projectCode,
        projectManager: p.members?.projectManager || '',
        industry: p.industry || ''
      }));

    return { industryStats, acceptedByIndustry, acceptedProjectsList };
  }, [regionProjects]);

  // 模块2：项目类型分析
  const projectTypeAnalysisData = useMemo(() => {
    const typeOptions = ['销售项目', '开发项目', '混合项目', '内部项目', '其他项目'];

    // 项目类型占比
    const typeStats = typeOptions.map(type => {
      const count = regionProjects.filter(p => p.type === type).length;
      return { name: type, value: count };
    }).filter(d => d.value > 0);

    // 项目状态占比
    const statusStats = [
      { name: '正常进行', value: regionProjects.filter(p => p.status === ProjectStatus.Ongoing).length },
      { name: '已验收', value: regionProjects.filter(p => p.status === ProjectStatus.Accepted).length },
      { name: '延期', value: regionProjects.filter(p => p.status === ProjectStatus.Delayed).length }
    ].filter(d => d.value > 0);

    // 每月项目状态趋势（基于真实数据）
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthlyTrend = months.map(month => {
      // 构造该月的日期边界
      const monthNum = parseInt(month);

      // 新增项目：立项日期在该月的项目数量
      const newProjects = regionProjects.filter(p => {
        const kickoffDate = p.timeline?.kickoffDate;
        if (!kickoffDate || !kickoffDate.startsWith('2026')) return false;
        const kickoffMonth = parseInt(kickoffDate.split('-')[1]);
        return kickoffMonth === monthNum;
      }).length;

      // 验收项目：验收日期在该月的项目数量
      const acceptedProjects = regionProjects.filter(p => {
        const acceptDate = p.timeline?.acceptanceDate;
        if (!acceptDate || !acceptDate.startsWith('2026')) return false;
        const acceptMonth = parseInt(acceptDate.split('-')[1]);
        return acceptMonth === monthNum;
      }).length;

      return {
        month: `${month}月`,
        newProjects,
        acceptedProjects
      };
    });

    return { typeStats, statusStats, monthlyTrend };
  }, [regionProjects]);

  // 模块2：项目里程碑分析（按月）
  const milestoneAnalysisData = useMemo(() => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    // 按月整理里程碑详细数据
    const monthlyMilestones: Record<string, { planned: MilestoneItem[]; actual: MilestoneItem[] }> = {};

    months.forEach(month => {
      monthlyMilestones[month] = { planned: [], actual: [] };
    });

    // 里程碑节点顺序映射（用于判断"遗漏"状态）
    const milestoneOrder = MILESTONE_NODE_OPTIONS.map(opt => opt.value);

    regionProjects.forEach(p => {
      if (p.milestoneNodeData) {
        // 先收集该项目所有里程碑的实际完成情况
        const projectMilestoneActuals: Record<string, string> = {};
        Object.entries(p.milestoneNodeData).forEach(([node, data]) => {
          if (data.actualDate) {
            projectMilestoneActuals[node] = data.actualDate;
          }
        });

        Object.entries(p.milestoneNodeData).forEach(([node, data]) => {
          const nodeLabel = MILESTONE_NODE_OPTIONS.find(opt => opt.value === node)?.label || node;

          const baseItem = {
            projectId: p.id,
            projectName: p.projectName,
            projectCode: p.projectCode,
            projectManager: p.members?.projectManager || '',
            projectStatus: p.status
          };

          // 计划完成时间在本月
          if (data.plannedDate) {
            const month = data.plannedDate.split('-')[1];
            if (data.plannedDate.startsWith('2026') && monthlyMilestones[month]) {
              // 判断状态
              let status: 'completed' | 'not_completed' | 'skipped' = 'not_completed';

              if (data.actualDate) {
                // 有实际完成时间 → 已完成
                status = 'completed';
              } else {
                // 检查是否有后面的里程碑已完成（说明当前里程碑被跳过）
                const currentNodeIndex = milestoneOrder.indexOf(node as MilestoneNode);
                if (currentNodeIndex !== -1) {
                  // 查找当前节点之后是否有已完成的节点
                  for (let i = currentNodeIndex + 1; i < milestoneOrder.length; i++) {
                    if (projectMilestoneActuals[milestoneOrder[i]]) {
                      status = 'skipped';
                      break;
                    }
                  }
                }
              }

              monthlyMilestones[month].planned.push({
                ...baseItem,
                milestoneNode: nodeLabel,
                plannedDate: data.plannedDate,
                actualDate: data.actualDate || '',
                status
              });
            }
          }

          // 实际完成时间在本月
          if (data.actualDate) {
            const month = data.actualDate.split('-')[1];
            if (data.actualDate.startsWith('2026') && monthlyMilestones[month]) {
              monthlyMilestones[month].actual.push({
                ...baseItem,
                milestoneNode: nodeLabel,
                plannedDate: data.plannedDate || '',
                actualDate: data.actualDate,
                status: 'completed'
              });
            }
          }
        });
      }
    });

    return monthlyMilestones;
  }, [regionProjects]);

  // 处理下钻
  const handleDrillDown = (title: string, projectList: Project[]) => {
    setDrillDownData({
      isOpen: true,
      title,
      projects: projectList,
      extraFields: [
        { key: 'contractAmount', label: '合同金额', type: 'currency' },
        { key: 'status', label: '状态', type: 'text' }
      ]
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-900">
            {isRegionalDirector && userRegion ? `${userRegion} 经营看板` : '区域经营看板'}
          </h1>
          <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
            数据年份: 2026
          </div>
        </div>

        {/* Tab页签 - 区域总监显示静态标签 */}
        {isRegionalDirector && userRegion ? (
          <div className="flex gap-3 flex-wrap">
            <div className="px-6 py-3 text-base font-bold rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              {userRegion}
            </div>
          </div>
        ) : (
        <div className="flex gap-3 flex-wrap">
          {PRIMARY_REGIONS.map(region => (
            <TabButton
              key={region}
              active={selectedRegion === region}
              onClick={() => setSelectedRegion(region)}
            >
              {region}
            </TabButton>
          ))}
        </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 space-y-8">
        {/* 模块1：子模块1 - 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 项目数量情况 */}
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Briefcase size={24} className="text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 mb-1">{module1Data.totalProjects}</p>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">项目数量情况</h3>
            <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">新增项目</span>
                <span className="text-blue-600">{module1Data.newProjects}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">本月应验收</span>
                <span>{module1Data.shouldAcceptProjects}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">已验收</span>
                <span className="text-emerald-600">{module1Data.acceptedProjects}</span>
              </div>
            </div>
          </Card>

          {/* 项目合同额情况 */}
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <TrendingUp size={24} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 mb-1">{formatCurrency(module1Data.totalContract)}</p>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">项目合同额情况</h3>
            <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">新增项目合同额</span>
                <span className="text-emerald-600">{formatCurrency(module1Data.newContract)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">已验收合同额</span>
                <span>{formatCurrency(module1Data.acceptedContract)}</span>
              </div>
            </div>
          </Card>

          {/* 确认收入情况 */}
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl">
                <Zap size={24} className="text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 mb-1">{formatCurrency(module1Data.confirmedRevenue)}</p>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">确认收入情况</h3>
            <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">已验收待确认</span>
                <span className="text-purple-600">{formatCurrency(module1Data.acceptedPending)}</span>
              </div>
            </div>
          </Card>

          {/* 回款情况 */}
          <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <Activity size={24} className="text-orange-600" />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 mb-1">{formatCurrency(module1Data.totalPaid)}</p>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">回款情况</h3>
            <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">本月回款额</span>
                <span className="text-orange-600">{formatCurrency(module1Data.monthlyPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">上月回款额</span>
                <span>{formatCurrency(module1Data.prevMonthlyPaid)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 季度数据汇总表 */}
        <Card>
          <h3 className="text-xl font-black text-gray-800 mb-6">季度数据汇总</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider">季度</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-center border-l border-gray-100">应验收</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-center">完成验收</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-center">高风险</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-right border-l border-gray-100">确认收入</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-right">目标金额</th>
                  <th className="py-3 px-3 text-sm font-black text-gray-400 uppercase tracking-wider text-right">达成率</th>
                </tr>
              </thead>
              <tbody>
                {QUARTERS.map((quarter, idx) => {
                  const acceptData = acceptanceQuarterlyData[idx];
                  const revenueData = revenueTargetData.quarters[idx];
                  return (
                    <tr key={quarter.key} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleDrillDown(`${selectedRegion} - ${quarter.label}确认收入项目`, regionProjects.filter(p => {
                        if (!p.payment?.isConfirmed || !p.payment?.confirmedDate) return false;
                        const month = parseInt(p.payment.confirmedDate.split('-')[1]);
                        return quarter.months.includes(month);
                      }))}>
                      <td className="py-3 px-3 font-black text-gray-800">{quarter.label}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600 border-l border-gray-100">{acceptData.shouldAcceptCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{acceptData.completedCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold ${acceptData.highRiskCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {acceptData.highRiskCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600 border-l border-gray-100">{formatCurrency(revenueData.revenue)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-500">{formatCurrency(revenueData.target)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-bold ${parseFloat(revenueData.rate) >= 100 ? 'text-emerald-600' : parseFloat(revenueData.rate) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {revenueData.rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-bold">
                  <td className="py-3 px-3 font-black text-gray-800">合计</td>
                  <td className="py-3 px-3 text-center font-black text-blue-600 border-l border-gray-100">{acceptanceQuarterlyData.reduce((sum, d) => sum + d.shouldAcceptCount, 0)}</td>
                  <td className="py-3 px-3 text-center font-black text-emerald-600">{acceptanceQuarterlyData.reduce((sum, d) => sum + d.completedCount, 0)}</td>
                  <td className="py-3 px-3 text-center font-black text-red-600">{acceptanceQuarterlyData.reduce((sum, d) => sum + d.highRiskCount, 0)}</td>
                  <td className="py-3 px-3 text-right font-black text-blue-600 border-l border-gray-100">{formatCurrency(revenueTargetData.total.revenue)}</td>
                  <td className="py-3 px-3 text-right font-black text-gray-600">{formatCurrency(revenueTargetData.total.target)}</td>
                  <td className="py-3 px-3 text-right font-black text-gray-800">{revenueTargetData.total.rate}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* 模块2：项目行业分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-xl font-black text-gray-800 mb-6">项目行业分析</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryAnalysisData.industryStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="industry" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} width={80} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="ongoing" name="正在进行" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="accepted" name="已验收" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="delayed" name="延期" stackId="a" fill="#EF4444" radius={[0, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-black text-gray-800 mb-6">已验收项目行业分布</h3>
            <div className="flex gap-6">
              {/* 左侧：环形图 */}
              <div className="w-1/2 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryAnalysisData.acceptedByIndustry}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="industry"
                      label={({ industry, percent }) => `${industry} ${(percent * 100).toFixed(0)}%`}
                    >
                      {industryAnalysisData.acceptedByIndustry.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={INDUSTRY_COLORS[entry.industry] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* 右侧：已验收项目列表 */}
              <div className="w-1/2 border-l border-gray-100 pl-4">
                <div className="text-sm font-bold text-gray-500 mb-3">
                  已验收项目 ({industryAnalysisData.acceptedProjectsList.length}个)
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                  {industryAnalysisData.acceptedProjectsList.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 font-bold">暂无已验收项目</div>
                  ) : (
                    industryAnalysisData.acceptedProjectsList.map((project, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:shadow-md hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer"
                        onClick={() => onNavigateToProject(project.id)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-bold text-gray-800 truncate flex-1 text-sm">{project.projectName}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded ml-2" style={{
                            backgroundColor: INDUSTRY_COLORS[project.industry] ? `${INDUSTRY_COLORS[project.industry]}20` : '#6B728020',
                            color: INDUSTRY_COLORS[project.industry] || '#6B7280'
                          }}>
                            {project.industry || '未知'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>编号: {project.projectCode}</span>
                          <span>PM: {project.projectManager || '-'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 模块2：项目类型分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：项目类型占比和项目状态占比 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 项目类型占比 */}
            <Card>
              <h3 className="text-lg font-black text-gray-800 mb-4">项目类型占比</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectTypeAnalysisData.typeStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {projectTypeAnalysisData.typeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 项目状态占比 */}
            <Card>
              <h3 className="text-lg font-black text-gray-800 mb-4">项目状态占比</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectTypeAnalysisData.statusStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {projectTypeAnalysisData.statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 右侧：每月项目状态趋势 */}
          <Card>
            <h3 className="text-lg font-black text-gray-800 mb-4">每月项目趋势</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectTypeAnalysisData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="newProjects" name="新增项目" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="acceptedProjects" name="验收项目" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 模块2：项目里程碑分析（按月看板） */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-800">项目里程碑分析（按月）</h3>
            <div className="text-sm text-gray-400 font-bold">数据年份: 2026</div>
          </div>

          {/* 月份Tab页签 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(parseInt(month))}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  selectedMonth === parseInt(month)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {month}月
              </button>
            ))}
          </div>

          {/* 看板内容 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：本月计划完成 */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <h4 className="font-black text-gray-800">计划完成</h4>
                <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.planned.length || 0} 项
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.planned.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 font-bold">本月无计划完成的里程碑</div>
                ) : (
                  milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.planned.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigateToProject(item.projectId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-black text-gray-800 truncate flex-1">{item.projectName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ml-2 ${
                          item.projectStatus === ProjectStatus.Accepted ? 'bg-emerald-100 text-emerald-600' :
                          item.projectStatus === ProjectStatus.Delayed ? 'bg-red-100 text-red-600' :
                          item.projectStatus === ProjectStatus.Paused ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.projectStatus}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 font-bold mb-1">里程碑: <span className="text-blue-600">{item.milestoneNode}</span></div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>计划: {item.plannedDate}</span>
                        {/* 状态指示 */}
                        {item.status === 'completed' && item.actualDate && (
                          <span className="text-emerald-600 font-bold">完成: {item.actualDate}</span>
                        )}
                        {item.status === 'not_completed' && (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">未完成</span>
                        )}
                        {item.status === 'skipped' && (
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">遗漏</span>
                        )}
                        <span>PM: {item.projectManager || '-'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 右侧：本月实际完成 */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <h4 className="font-black text-gray-800">实际完成</h4>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.actual.length || 0} 项
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.actual.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 font-bold">本月无实际完成的里程碑</div>
                ) : (
                  milestoneAnalysisData[selectedMonth.toString().padStart(2, '0')]?.actual.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-4 border border-emerald-100 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigateToProject(item.projectId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-black text-gray-800 truncate flex-1">{item.projectName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ml-2 ${
                          item.projectStatus === ProjectStatus.Accepted ? 'bg-emerald-100 text-emerald-600' :
                          item.projectStatus === ProjectStatus.Delayed ? 'bg-red-100 text-red-600' :
                          item.projectStatus === ProjectStatus.Paused ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.projectStatus}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 font-bold mb-1">里程碑: <span className="text-emerald-600">{item.milestoneNode}</span></div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>计划: {item.plannedDate}</span>
                        <span>实际: <span className="text-emerald-600">{item.actualDate}</span></span>
                        <span>PM: {item.projectManager || '-'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

                  </Card>
      </div>

      {/* 下钻模态框 */}
      <DashboardDrillDownModal
        isOpen={drillDownData.isOpen}
        onClose={() => setDrillDownData({ isOpen: false, title: '', projects: [] })}
        onNavigateToProject={onNavigateToProject}
        drillData={{
          title: drillDownData.title,
          module: 'region',
          projects: drillDownData.projects,
          extraFields: drillDownData.extraFields || []
        }}
      />
    </div>
  );
};

export default RegionalDashboardPage;