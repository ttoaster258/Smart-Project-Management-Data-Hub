import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileCheck,
  Smile,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  RefreshCw,
  ArrowLeft,
  Briefcase,
  Zap,
  Activity,
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
import { Project, PRIMARY_REGIONS, ProjectStatus, ProjectType, REGION_MAPPING, MILESTONE_NODE_OPTIONS, MilestoneNode, ProductSalesStats, DrillDownModalData, CRITICAL_MILESTONES } from '../types';
import ProductService from '../services/ProductService';
import DashboardDrillDownModal from './DashboardDrillDownModal';
import ProductValueModal from './ProductValueModal';
import RiskPenetrationModal from './RiskPenetrationModal';

// --- Types ---

interface DashboardProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
  onFilterByRegion: (region: string) => void;
  onDrillDown?: (data: any) => void;
}

// 风险类型定义
type RiskType = 'progress' | 'cost' | 'quality';

interface ProjectRisk {
  project: Project;
  riskTypes: RiskType[];
  riskDetails: {
    progress?: string[];
    cost?: string[];
    quality?: string[];
  };
}

// --- Utils ---

const formatCurrency = (value: number): string => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toLocaleString();
};

const calculateMarginRate = (project: Project): number => {
  // 优先使用数据库中存储的毛利率字段
  if (project.marginRate != null && project.marginRate !== '') {
    return parseFloat(project.marginRate);
  }
  // 回退到计算方式
  const contractAmount = project.payment.contractAmount;
  const internalCost = project.budget.internalCost;
  if (!contractAmount || contractAmount === 0) return 0;
  return ((contractAmount - internalCost) / contractAmount) * 100;
};

// --- Sub-Components ---

const Card = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`} onClick={onClick}>
    {children}
  </div>
);

const ProgressBar = ({ percent, colorClass, heightClass = 'h-2' }: { percent: number, colorClass: string, heightClass?: string }) => (
  <div className={`w-full bg-gray-100 rounded-full ${heightClass} overflow-hidden`}>
    <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}></div>
  </div>
);

const TripleRingChart = ({ data, title, total, onDrillDown }: { data: any[], title: string, total: string, onDrillDown?: () => void }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full items-center mb-6 px-2">
        <span className="text-2xl font-black text-gray-800">{title}</span>
        <button
          onClick={onDrillDown}
          className="text-base text-blue-600 flex items-center hover:underline font-bold"
        >
          查看明细 <ChevronRight size={16} />
        </button>
      </div>
      <div className="flex items-center w-full cursor-pointer group px-2" onClick={onDrillDown}>
        <div className="w-64 h-64 md:w-72 md:h-72 relative group-hover:scale-105 transition-transform shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Outer Ring: 总合同额 */}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={window.innerWidth < 768 ? 85 : 95}
                outerRadius={window.innerWidth < 768 ? 105 : 120}
                paddingAngle={2}
                dataKey="contract"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-1-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {/* Middle Ring: 已确认收入 */}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={window.innerWidth < 768 ? 65 : 75}
                outerRadius={window.innerWidth < 768 ? 80 : 90}
                paddingAngle={2}
                dataKey="revenue"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-2-${index}`} fill={entry.color} opacity={0.7} />
                ))}
              </Pie>
              {/* Inner Ring: 待确认收入 */}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={window.innerWidth < 768 ? 45 : 55}
                outerRadius={window.innerWidth < 768 ? 60 : 70}
                paddingAngle={2}
                dataKey="pending"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-3-${index}`} fill={entry.color} opacity={0.4} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${formatCurrency(value)}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-3xl font-black text-gray-800">{total}</span>
            <span className="text-sm text-gray-400 font-bold uppercase">总合同额</span>
          </div>
        </div>
        <div className="ml-6 md:ml-10 space-y-6 flex-1">
          <div className="grid grid-cols-1 gap-3">
            {data.slice(0, 6).map(item => (
              <div key={item.name} className="flex items-center text-base">
                <span className="w-4 h-4 rounded-full mr-3 shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-700 font-black truncate">{item.name}</span>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-gray-400"></span> 外环: 合同总额
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-gray-400 opacity-70"></span> 中环: 已确认收入
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-gray-400 opacity-40"></span> 内环: 待确认收入
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SingleDrillChart = ({
  data,
  title,
  activeMetric,
  metricLabel
}: {
  data: any[],
  title: string,
  activeMetric: 'contract' | 'revenue' | 'pending',
  metricLabel: string
}) => {
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (item[activeMetric] || 0), 0);
  }, [data, activeMetric]);

  return (
    <div className="flex flex-col items-center flex-1">
      <h3 className="text-2xl font-bold text-gray-700 mb-6">{title}</h3>
      <div className="w-full h-[auto] relative mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={3}
              dataKey={activeMetric}
              stroke="white"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${formatCurrency(value)}`, metricLabel]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none text-center px-10">
          <span className="text-3xl font-black text-gray-900 leading-tight">{formatCurrency(total)}</span>
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{metricLabel}</span>
        </div>
      </div>

      <div className="w-full space-y-2">
        {[...data].sort((a, b) => b[activeMetric] - a[activeMetric]).map(item => (
          <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-white transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-base font-bold text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-gray-900">{formatCurrency(item[activeMetric])}</div>
              <div className="text-xs text-gray-400 font-bold">
                占比 {total > 0 ? ((item[activeMetric] / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DrillDownView = ({
  regionData,
  industryData,
  onBack,
  activeMetric,
  onMetricChange
}: {
  regionData: any[],
  industryData: any[],
  onBack: () => void,
  activeMetric: 'contract' | 'revenue' | 'pending',
  onMetricChange: (metric: 'contract' | 'revenue' | 'pending') => void
}) => {
  const metricLabels = {
    contract: '合同总额',
    revenue: '已确认收入',
    pending: '待确认收入'
  };

  return (
    <Card className="min-h-[700px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold group"
        >
          <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-50 transition-colors">
            <ArrowLeft size={20} />
          </div>
          返回看板
        </button>
        <h2 className="text-2xl font-black text-gray-900">合同分布下钻分析</h2>
        <div className="w-24"></div>
      </div>

      <div className="flex gap-3 mb-12 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {(['contract', 'revenue', 'pending'] as const).map(metric => (
          <button
            key={metric}
            onClick={() => onMetricChange(metric)}
            className={`px-8 py-3 rounded-xl font-black text-base transition-all ${activeMetric === metric
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            {metricLabels[metric]}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-12 px-2">
        <SingleDrillChart
          data={regionData}
          title="区域分布"
          activeMetric={activeMetric}
          metricLabel={metricLabels[activeMetric]}
        />
        <div className="hidden lg:block w-px bg-gray-100 self-stretch"></div>
        <SingleDrillChart
          data={industryData}
          title="行业分布"
          activeMetric={activeMetric}
          metricLabel={metricLabels[activeMetric]}
        />
      </div>
    </Card>
  );
};

// --- Main Components ---

export default function DecisionDashboard({ projects, onNavigateToProject, onFilterByRegion, onDrillDown }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // Default to Full Year (0)
  const [selectedRegion, setSelectedRegion] = useState<string>('全部'); // Default to All Regions

  const [drillDown, setDrillDown] = useState<{
    type: 'region' | 'industry' | null,
    metric: 'contract' | 'revenue' | 'pending'
  }>({ type: null, metric: 'contract' });

  // 新的下钻模态框 state
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    data: DrillDownModalData | null;
  }>({ isOpen: false, data: null });

  // 产品价值模态框
  const [showProductValueModal, setShowProductValueModal] = useState(false);

  // 风险穿透模态框
  const [showRiskPenetrationModal, setShowRiskPenetrationModal] = useState(false);

  const [distType, setDistType] = useState<'quantity' | 'amount' | 'revenue'>('quantity');
  const [distViewMode, setDistViewMode] = useState<'overview' | 'detail'>('overview'); // 概览/详情切换
  const [showTrendChart, setShowTrendChart] = useState(true); // 趋势图显示/隐藏
  const [visibleTrendLines, setVisibleTrendLines] = useState<{ [key: string]: boolean }>({
    newContract: true,
    newProjCount: true,
    shouldAcceptProjCount: true
  }); // 趋势折线显示控制

  const months = ['01月', '02月', '03月', '04月', '05月', '06月', '07月', '08月', '09月', '10月', '11月', '12月'];
  const tabs = ['全局看板', '财务看板', '销售看板', '风险看板'];
  const regionsList = ['全部', ...PRIMARY_REGIONS];

  // --- Theme Colors ---
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

  // --- 产品销售统计数据 ---
  const [productSalesStats, setProductSalesStats] = useState<ProductSalesStats[]>([]);

  // 加载产品销售统计数据
  useEffect(() => {
    ProductService.fetchProductSalesStats().then(result => {
      if (result.success) {
        setProductSalesStats(result.data);
      }
    });
  }, []);

  // --- Integrated Data Calculation ---

  const dashboardData = useMemo(() => {
    // Base 2026 projects (仅用于新增项目统计)
    const all2026Projects = projects.filter(p => {
      const dateStr = p.timeline.kickoffDate;
      if (!dateStr) return false;
      // Safer check for 2026 projects that works across systems/locales
      return dateStr.includes('2026');
    });

    // Helper to evaluate month filter
    const matchesMonth = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (d.getFullYear() !== 2026) return false;
      if (selectedMonth === 0) return true;
      return (d.getMonth() + 1) === selectedMonth;
    };

    // Helper to evaluate region filter
    const matchesRegion = (region: string) => {
      if (selectedRegion === '全部') return true;
      // 使用 REGION_MAPPING 映射后再比较，确保精确匹配
      const mappedRegion = REGION_MAPPING[region] || region;
      return mappedRegion === selectedRegion;
    };

    // 全年数据：包含所有项目（不受年份和月份筛选影响，仅受区域筛选影响）
    const allProjects = projects.filter(p => matchesRegion(p.region));

    // 1. 基础统计数据
    const totalProjectsCount = allProjects.length;

    // 全年项目合同额总数：包含所有项目
    const totalContractAmount = allProjects.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

    // 全年已确认收入：统计 isConfirmed=true 且 confirmedDate在2026年的项目的合同额
    let totalConfirmedRevenue = 0;
    let totalPaid2026 = 0;
    let totalAcceptedPending = 0;
    let totalPendingThisYear = 0;
    let acceptedCount = 0;
    let shouldAcceptCount = 0;

    totalConfirmedRevenue = allProjects.reduce((sum, p) => {
      if (p.payment.isConfirmed && p.payment.confirmedDate) {
        const d = new Date(p.payment.confirmedDate);
        if (d.getFullYear() === 2026) {
          return sum + (p.payment.contractAmount || 0);
        }
      }
      return sum;
    }, 0);

    // 全年回款额：统计2026年的回款节点 actualAmount 之和
    totalPaid2026 = allProjects.reduce((sum, p) => {
      if (p.payment.paymentNodes) {
        return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
          if (node.paymentDate && node.paymentDate.startsWith('2026')) {
            return nodeSum + (node.actualAmount || 0);
          }
          return nodeSum;
        }, 0);
      }
      return sum;
    }, 0);

    // 已验收待确认收入：统计已验收但未确认收入的项目合同额
    totalAcceptedPending = allProjects.reduce((sum, p) => {
      if (p.status === ProjectStatus.Accepted && !p.payment.isConfirmed) {
        return sum + (p.payment.contractAmount || 0);
      }
      return sum;
    }, 0);
    // 按月份筛选时计算确认收入和回款额
    let monthlyCollectionAmount = 0;
    let monthlyConfirmedRevenue = 0;
    if (selectedMonth !== 0) {
      // 确认收入：筛选到X月时，统计 confirmedDate 在2026年1月到X月的合同额之和
      monthlyConfirmedRevenue = allProjects.reduce((sum, p) => {
        if (p.payment.isConfirmed && p.payment.confirmedDate) {
          const d = new Date(p.payment.confirmedDate);
          if (d.getFullYear() === 2026 && (d.getMonth() + 1) <= selectedMonth) {
            return sum + (p.payment.contractAmount || 0);
          }
        }
        return sum;
      }, 0);

      // 回款额：当月回款额（不累计）
      monthlyCollectionAmount = allProjects.reduce((sum, p) => {
        if (p.payment.paymentNodes) {
          return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
            if (node.paymentDate) {
              const d = new Date(node.paymentDate);
              if (d.getFullYear() === 2026 && (d.getMonth() + 1) === selectedMonth) {
                return nodeSum + (node.actualAmount || 0);
              }
            }
            return nodeSum;
          }, 0);
        }
        return sum;
      }, 0);
    }

    // 已验收项目：按验收日期筛选
    acceptedCount = allProjects.filter(p =>
      p.status === ProjectStatus.Accepted && (matchesMonth(p.timeline.acceptanceDate) || selectedMonth === 0)
    ).length;

    // 应验收项目：按预测验收时间筛选
    shouldAcceptCount = allProjects.filter(p =>
      matchesMonth(p.forecastAcceptanceDate)
    ).length;

    // 本月回款额（当选择特定月份时）
    if (selectedMonth !== 0) {
      totalPaid2026 = monthlyCollectionAmount;
      totalConfirmedRevenue = monthlyConfirmedRevenue; // 累计确认收入
    }

    // 已验收项目金额：按验收日期筛选
    const acceptedContractAmount = allProjects
      .filter(p => p.status === ProjectStatus.Accepted && (matchesMonth(p.timeline.acceptanceDate) || selectedMonth === 0))
      .reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

    // 新增项目数量：仅2026年立项的项目，按立项日期筛选
    const newProjects = all2026Projects.filter(p => matchesMonth(p.timeline.kickoffDate)).length;

    // 新增项目合同额：仅2026年立项的项目，按立项日期筛选
    const newContractAmount = all2026Projects
      .filter(p => matchesMonth(p.timeline.kickoffDate))
      .reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

    // 应验收项目金额：按预测验收时间筛选
    const shouldAcceptContractAmount = allProjects
      .filter(p => matchesMonth(p.forecastAcceptanceDate))
      .reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

    // 上月回款额：按回款时间筛选上月
    let previousMonthCollectionAmount = 0;
    if (selectedMonth > 1) {
      const prevMonth = selectedMonth - 1;
      previousMonthCollectionAmount = allProjects.reduce((sum, p) => {
        if (p.payment.paymentNodes) {
          return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
            if (node.paymentDate) {
              const d = new Date(node.paymentDate);
              if (d.getFullYear() === 2026 && (d.getMonth() + 1) === prevMonth) {
                return nodeSum + (node.actualAmount || 0);
              }
            }
            return nodeSum;
          }, 0);
        }
        return sum;
      }, 0);
    } else if (selectedMonth === 0) {
      // 如果选择全年，上月回款额设为0或不显示
      previousMonthCollectionAmount = 0;
    }

    // 2. 区域数据 - 包含概览和详情指标
    const regionStats = PRIMARY_REGIONS.map((name, index) => {
      const regionProjects = allProjects.filter(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === name;
      });

      // 概览数据
      // 项目数量：全年项目总数
      const count = regionProjects.length;

      // 合同金额：全年项目合同额总数
      const contract = regionProjects.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

      // 确认收入：统计 isConfirmed=true 且 confirmedDate在2026年的项目的合同额（支持月份筛选累加）
      const revenue = regionProjects.reduce((sum, p) => {
        if (p.payment.isConfirmed && p.payment.confirmedDate) {
          const d = new Date(p.payment.confirmedDate);
          if (d.getFullYear() === 2026) {
            // 如果选择了月份，只统计到选定月份为止的确认收入（累加）
            if (selectedMonth !== 0 && (d.getMonth() + 1) > selectedMonth) {
              return sum;
            }
            return sum + (p.payment.contractAmount || 0);
          }
        }
        return sum;
      }, 0);

      // 详情数据
      // 新增项目数量：仅2026年立项的项目，按立项日期筛选
      const newProj = all2026Projects.filter(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === name && matchesMonth(p.timeline.kickoffDate);
      }).length;

      // 已验收项目数量：按验收日期筛选
      const acceptedProj = regionProjects.filter(p => {
        if (p.status !== ProjectStatus.Accepted) return false;
        return matchesMonth(p.timeline.acceptanceDate) || selectedMonth === 0;
      }).length;

      // 新增合同额：仅2026年立项的项目，按立项日期筛选
      const newContractsTotal = all2026Projects
        .filter(p => {
          const mappedRegion = REGION_MAPPING[p.region] || p.region;
          return mappedRegion === name && matchesMonth(p.timeline.kickoffDate);
        })
        .reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

      // 已验收合同额：按验收日期筛选
      const acceptedContract = regionProjects
        .filter(p => p.status === ProjectStatus.Accepted && (matchesMonth(p.timeline.acceptanceDate) || selectedMonth === 0))
        .reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

      // 已验收待确认收入
      const acceptedPendingRevenue = regionProjects.reduce((sum, p) => {
        if (p.status === ProjectStatus.Accepted && !p.payment.isConfirmed) {
          return sum + (p.payment.contractAmount || 0);
        }
        return sum;
      }, 0);

      // 已回款额度
      const actualPaid = regionProjects.reduce((sum, p) => {
        if (p.payment.paymentNodes) {
          return sum + p.payment.paymentNodes.reduce((nodeSum, node) => nodeSum + (node.actualAmount || 0), 0);
        }
        return sum;
      }, 0);

      const pending = regionProjects.reduce((sum, p) => {
        if (p.payment.paymentNodes) {
          const totalPaid = p.payment.paymentNodes.reduce((nodeSum, node) => nodeSum + (node.actualAmount || 0), 0);
          return sum + ((p.payment.contractAmount || 0) - totalPaid);
        }
        return sum + (p.payment.contractAmount || 0);
      }, 0);

      // 本月回款额：按回款时间筛选
      const newCollection = regionProjects.reduce((sum, p) => {
        if (p.payment.paymentNodes) {
          return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
            if (node.paymentDate) {
              const d = new Date(node.paymentDate);
              if (d.getFullYear() === 2026 && matchesMonth(node.paymentDate)) {
                return nodeSum + (node.actualAmount || 0);
              }
            }
            return nodeSum;
          }, 0);
        }
        return sum;
      }, 0);

      // 应验收项目数量：按预测验收时间筛选
      const shouldAcceptProj = regionProjects.filter(p => matchesMonth(p.forecastAcceptanceDate)).length;

      const riskProjCount = regionProjects.filter(p => {
        const marginRate = calculateMarginRate(p);
        const costOverrun = (p.execution.inputPercent || 0) > (p.execution.progress || 0) + 10;
        return marginRate < 0 || costOverrun || p.status === ProjectStatus.Delayed;
      }).length;

      return {
        name,
        // 概览数据
        count, // 全年项目总数
        contract, // 全年项目合同额总数
        revenue, // 已确认收入金额
        // 详情数据 - 项目数量
        newProj, // 新增项目数量
        acceptedProj, // 已验收项目数量
        // 详情数据 - 合同金额
        newContractsTotal, // 新增项目合同额
        acceptedContract, // 已验收项目合同额
        // 详情数据 - 确认收入
        acceptedPendingRevenue, // 已验收待确认
        actualPaid, // 已回款额度
        // 其他数据
        pending,
        newCollection,
        shouldAcceptProj,
        riskProj: riskProjCount,
        color: COLORS[index % COLORS.length]
      };
    });

    // 3. 行业数据
    const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
    const industryStats = FIXED_INDUSTRIES.map((name, index) => {
      const industryProjects = allProjects.filter(p => (p.industry || '未知') === name);
      return {
        name,
        // 合同额：包含所有项目
        contract: industryProjects.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0),
        // 确认收入：统计 isConfirmed=true 且 confirmedDate在2026年的项目的合同额（支持月份筛选累加）
        revenue: industryProjects.reduce((sum, p) => {
          if (p.payment.isConfirmed && p.payment.confirmedDate) {
            const d = new Date(p.payment.confirmedDate);
            if (d.getFullYear() === 2026) {
              // 如果选择了月份，只统计到选定月份为止的确认收入（累加）
              if (selectedMonth !== 0 && (d.getMonth() + 1) > selectedMonth) {
                return sum;
              }
              return sum + (p.payment.contractAmount || 0);
            }
          }
          return sum;
        }, 0),
        pending: industryProjects.reduce((sum, p) => {
          if (p.status === ProjectStatus.Accepted && !p.payment.isConfirmed) {
            return sum + (p.payment.contractAmount || 0);
          }
          return sum;
        }, 0),
        count: industryProjects.length,
        color: COLORS[index % COLORS.length]
      };
    });

    // 4. 趋势数据 - 按区域筛选，显示全年趋势
    const monthlyTrendData = months.map((m, i) => {
      const targetMonth = i + 1;

      const inRegion = (p: any) => {
        if (selectedRegion === '全部') return true;
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === selectedRegion;
      };

      // 本月的匹配函数
      const matchesTargetMonth = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === 2026 && (d.getMonth() + 1) === targetMonth;
      };

      // 截止到本月的新增项目（仅2026年立项，按立项日期筛选）
      const projectsUntilMonth = all2026Projects.filter(p => {
        if (!inRegion(p)) return false;
        const kickoff = new Date(p.timeline.kickoffDate!);
        return (kickoff.getMonth() + 1) <= targetMonth;
      });

      // 本月新增项目（仅2026年立项，按立项日期筛选）
      const projectsInMonth = all2026Projects.filter(p => {
        if (!inRegion(p)) return false;
        const kickoff = new Date(p.timeline.kickoffDate!);
        return (kickoff.getMonth() + 1) === targetMonth;
      });

      // 当月已验收项目（按验收日期筛选）
      const acceptedProjectsInMonth = allProjects.filter(p => {
        if (!inRegion(p)) return false;
        if (p.status !== ProjectStatus.Accepted) return false;
        return matchesTargetMonth(p.timeline.acceptanceDate);
      });
      const acceptedContractAmount = acceptedProjectsInMonth.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0);

      // 当月已验收待确认收入金额
      const acceptedPendingRevenue = acceptedProjectsInMonth.reduce((sum, p) => {
        if (!p.payment.isConfirmed) {
          return sum + (p.payment.contractAmount || 0);
        }
        return sum;
      }, 0);

      // 新增回款额（按回款时间筛选本月）
      const newPaymentInMonth = allProjects.reduce((sum, p) => {
        if (!inRegion(p)) return sum;
        if (p.payment.paymentNodes) {
          return sum + p.payment.paymentNodes.reduce((nodeSum, node) => {
            if (node.paymentDate) {
              const d = new Date(node.paymentDate);
              if (d.getFullYear() === 2026 && (d.getMonth() + 1) === targetMonth) {
                return nodeSum + (node.actualAmount || 0);
              }
            }
            return nodeSum;
          }, 0);
        }
        return sum;
      }, 0);

      return {
        month: m,
        // Amount Metrics
        totalAmount: projectsUntilMonth.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0),
        newContract: projectsInMonth.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0),
        confirmedRev: projectsUntilMonth.reduce((sum, p) => {
          if (p.payment.isConfirmed && p.payment.confirmedDate) {
            const d = new Date(p.payment.confirmedDate);
            if (d.getFullYear() === 2026 && (d.getMonth() + 1) <= targetMonth) {
              return sum + (p.payment.contractAmount || 0);
            }
          }
          return sum;
        }, 0),
        acceptedContractAmount, // 已验收项目合同额总数
        acceptedPendingRevenue, // 已验收待确认
        newPaymentInMonth, // 当月回款额（按回款时间筛选）

        // Quantity Metrics
        totalQty: projectsUntilMonth.length,
        newProjCount: projectsInMonth.length,
        shouldAcceptProjCount: allProjects.filter(p => {
          if (!inRegion(p)) return false;
          return matchesTargetMonth(p.forecastAcceptanceDate);
        }).length,
        riskProjCount: projectsInMonth.filter(p => {
          const mr = calculateMarginRate(p);
          const costOverrun = (p.execution.inputPercent || 0) > (p.execution.progress || 0) + 10;
          return mr < 0 || costOverrun || p.status === ProjectStatus.Delayed;
        }).length,
      };
    });

    // 5. 毛利率分布
    const marginDist = [
      { label: '30%以上', count: 0, color: '#10B981' },
      { label: '10% - 30%', count: 0, color: '#3B82F6' },
      { label: '0% - 10%', count: 0, color: '#F59E0B' },
      { label: '0%以下', count: 0, color: '#EF4444' },
    ];

    // 毛利率分布使用项目数据中的 marginRate 字段
    const marginProjects = allProjects.filter(p => p.marginRate != null && p.marginRate !== '');

    marginProjects.forEach(p => {
      const mr = parseFloat(p.marginRate || '0');
      if (mr > 30) marginDist[0].count++;
      else if (mr >= 10) marginDist[1].count++;
      else if (mr >= 0) marginDist[2].count++;
      else marginDist[3].count++;
    });

    const regionalMarginDist = PRIMARY_REGIONS.map(name => {
      const regionProjects = marginProjects.filter(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === name;
      });
      const stats = { name, '30%以上': 0, '10%-30%': 0, '0%-10%': 0, '0%以下': 0 };
      regionProjects.forEach(p => {
        const mr = parseFloat(p.marginRate || '0');
        if (mr > 30) stats['30%以上']++;
        else if (mr >= 10) stats['10%-30%']++;
        else if (mr >= 0) stats['0%-10%']++;
        else stats['0%以下']++;
      });
      return stats;
    });

    // 6. 项目类型分布
    const typeDist = Object.values(ProjectType).map((type, index) => {
      const typeProjects = marginProjects.filter(p => p.type === type);
      return {
        type,
        count: typeProjects.length,
        amount: typeProjects.reduce((sum, p) => sum + (p.payment.contractAmount || 0), 0),
        color: COLORS[index % COLORS.length]
      };
    }).filter(d => d.count > 0);

    const regionalContractDist = PRIMARY_REGIONS.map(name => {
      const regionProjects = marginProjects.filter(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === name;
      });
      return {
        region: name,
        '0-300万': regionProjects.filter(p => (p.payment.contractAmount || 0) < 3000000).length,
        '300-500万': regionProjects.filter(p => (p.payment.contractAmount || 0) >= 3000000 && (p.payment.contractAmount || 0) <= 5000000).length,
        '500万以上': regionProjects.filter(p => (p.payment.contractAmount || 0) > 5000000).length,
      };
    });

    const highValueProjects = marginProjects
      .filter(p => (p.payment.contractAmount || 0) > 5000000)
      .sort((a, b) => (b.payment.contractAmount || 0) - (a.payment.contractAmount || 0))
      .slice(0, 5)
      .map(p => ({
        name: p.projectName,
        industry: p.industry,
        group: p.payment.groupCompany || '其他',
        manager: p.members.projectManager,
        amount: formatCurrency(p.payment.contractAmount || 0)
      }));

    // 7. 亮点工程/标杆项目
    const highlightProjects = allProjects.filter(p => p.isHighlight);
    const benchmarkProjects = allProjects.filter(p => p.isBenchmark);

    const getRegionalCountData = (projList: Project[]) => {
      const counts: Record<string, number> = {};
      projList.forEach(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        counts[mappedRegion] = (counts[mappedRegion] || 0) + 1;
      });
      return counts;
    };

    const highlightRegionCounts = getRegionalCountData(highlightProjects);
    const benchmarkRegionCounts = getRegionalCountData(benchmarkProjects);

    const combinedRegionData = PRIMARY_REGIONS.map(region => ({
      name: region,
      亮点工程: highlightRegionCounts[region] || 0,
      标杆项目: benchmarkRegionCounts[region] || 0
    }));

    // 8. 风险检测（与风险预警页面逻辑一致）
    const analyzeRisks = (project: Project): ProjectRisk => {
      const riskTypes: RiskType[] = [];
      const riskDetails: ProjectRisk['riskDetails'] = {
        progress: [],
        cost: [],
        quality: []
      };

      // 进度风险：延期≥1个月且状态为"延期"，或状态为"暂停"
      if (project.status === ProjectStatus.Delayed) {
        const plannedEndDate = project.timeline?.plannedEndDate;
        if (plannedEndDate) {
          const today = new Date();
          const planned = new Date(plannedEndDate);
          if (today > planned) {
            const diffTime = today.getTime() - planned.getTime();
            const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
            if (diffMonths >= 1) {
              riskTypes.push('progress');
              riskDetails.progress?.push(`延期 ${diffMonths} 个月`);
            }
          }
        }
      }
      if (project.status === ProjectStatus.Paused) {
        riskTypes.push('progress');
        riskDetails.progress?.push('项目暂停');
      }

      // 成本风险：毛利率<0，或预算使用超支，或工时偏差率>20%
      const marginRate = calculateMarginRate(project);
      if (marginRate < 0) {
        riskTypes.push('cost');
        riskDetails.cost?.push('毛利率小于0');
      }

      const totalBudget = project.budget?.totalBudget || 0;
      const usedBudget = project.budget?.budgetUsedAmount || 0;
      if (totalBudget > 0 && usedBudget > totalBudget) {
        riskTypes.push('cost');
        riskDetails.cost?.push('预算使用超支');
      }

      const plannedHours = project.manHours?.plannedTotal || 0;
      const actualHours = project.manHours?.pmoAnnualTotal || 0;
      if (plannedHours > 0) {
        const hourDeviationRate = ((actualHours - plannedHours) / plannedHours) * 100;
        if (hourDeviationRate > 20) {
          riskTypes.push('cost');
          riskDetails.cost?.push('人力严重超支');
        }
      }

      // 质量风险：重要节点缺实际完成时间，或当前节点超期1个月以上
      const currentIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === project.milestoneNode);
      let qualityRiskFound = false;

      CRITICAL_MILESTONES.forEach(milestoneNode => {
        const nodeIndex = MILESTONE_NODE_OPTIONS.findIndex(opt => opt.value === milestoneNode);
        if (nodeIndex !== -1 && nodeIndex < currentIndex) {
          const nodeData = project.milestoneNodeData?.[milestoneNode];
          if (!nodeData?.actualDate) {
            if (!qualityRiskFound) {
              riskTypes.push('quality');
              riskDetails.quality?.push('节点缺失实际完成时间');
              qualityRiskFound = true;
            }
          }
        }
      });

      // 检查当前节点的计划完成时间是否超过一个月
      const currentNodeData = project.milestoneNode && project.milestoneNodeData?.[project.milestoneNode];
      if (currentNodeData?.plannedDate && !qualityRiskFound) {
        const plannedDate = new Date(currentNodeData.plannedDate);
        const today = new Date();
        const diffTime = today.getTime() - plannedDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > 30) {
          riskTypes.push('quality');
          riskDetails.quality?.push('当前节点超期');
        }
      }

      return { project, riskTypes, riskDetails };
    };

    const allRiskProjects = allProjects.map(analyzeRisks).filter(r => r.riskTypes.length > 0);

    // 风险统计
    const progressRiskCount = allRiskProjects.filter(r => r.riskTypes.includes('progress')).length;
    const costRiskCount = allRiskProjects.filter(r => r.riskTypes.includes('cost')).length;
    const qualityRiskCount = allRiskProjects.filter(r => r.riskTypes.includes('quality')).length;

    const riskRegionStats = PRIMARY_REGIONS.map(name => {
      const regionProjects = allProjects.filter(p => {
        const mappedRegion = REGION_MAPPING[p.region] || p.region;
        return mappedRegion === name;
      });
      const risky = allRiskProjects.filter(r => {
        const mappedRegion = REGION_MAPPING[r.project.region] || r.project.region;
        return mappedRegion === name;
      });
      return {
        region: name,
        riskCount: risky.length,
        total: regionProjects.length,
        percent: regionProjects.length > 0 ? Math.round((risky.length / regionProjects.length) * 100) : 0
      };
    });

    // 9. 模拟满意度原因
    const lowSatisfactionProjects = [
      { name: '大课题影响', count: 18, percentage: 35 },
      { name: '甲方推进慢', count: 12, percentage: 23 },
      { name: '外部外协影响', count: 10, percentage: 19 },
      { name: '人力不足', count: 8, percentage: 15 },
      { name: '综合原因', count: 4, percentage: 8 }
    ];

    // 产品销售数据（从API获取）
    const productSalesData = productSalesStats
      .filter(item => item.total_sales_amount > 0)
      .map(item => ({
        name: item.name,
        amount: item.total_sales_amount
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      stats: {
        totalProjectsCount,
        totalContractAmount,
        totalConfirmedRevenue,
        totalAcceptedPending,
        totalPaid2026,
        totalPendingThisYear,
        acceptedCount,
        shouldAcceptCount,
        acceptanceRate: shouldAcceptCount > 0 ? (acceptedCount / shouldAcceptCount * 100).toFixed(1) : '0',
        collectionRate: (totalPaid2026 + totalPendingThisYear) > 0 ? (totalPaid2026 / (totalPaid2026 + totalPendingThisYear) * 100).toFixed(1) : '0',
        // 新增项目相关
        newProjects,
        newContractAmount,
        // 回款额
        monthlyCollectionAmount: totalPaid2026,
        previousMonthCollectionAmount,
        // 已验收合同额
        acceptedContractAmount,
        // 应验收合同额
        shouldAcceptContractAmount,
        // 风险数据
        totalRisks: allRiskProjects.length,
        progressRiskCount,
        costRiskCount,
        qualityRiskCount
      },
      regionStats,
      industryStats,
      monthlyTrendData,
      marginDist,
      regionalMarginDist,
      typeDist,
      riskProjects: allRiskProjects,
      riskRegionStats,
      lowSatisfactionProjects,
      highlightProjects,
      benchmarkProjects,
      combinedRegionData,
      highValueProjects,
      regionalContractDist,
      productSalesData
    };
  }, [projects, selectedMonth, selectedRegion, productSalesStats]);

  // --- 下钻处理函数 ---

  // 获取当前筛选后的所有项目（用于下钻）
  const getFilteredProjects = useMemo(() => {
    const matchesRegion = (region: string) => {
      if (selectedRegion === '全部') return true;
      const mappedRegion = REGION_MAPPING[region] || region;
      return mappedRegion === selectedRegion;
    };

    const matchesMonth = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (d.getFullYear() !== 2026) return false;
      if (selectedMonth === 0) return true;
      return (d.getMonth() + 1) === selectedMonth;
    };

    return projects.filter(p => matchesRegion(p.region));
  }, [projects, selectedRegion, selectedMonth]);

  // 处理下钻点击
  const handleDrillDown = (
    module: DrillDownModalData['module'],
    filterValue: string | { region: string; marginRange: string } | { industry: string } | { projectType: 'highlight' | 'benchmark'; region: string },
    extraInfo?: { metric?: 'quantity' | 'amount' | 'revenue' }
  ) => {
    let filteredProjects: Project[] = [];
    let title = '';
    let filterInfo = '';
    let extraFields: DrillDownModalData['extraFields'] = [];

    switch (module) {
      case 'region': {
        const region = filterValue as string;
        const metric = extraInfo?.metric || 'quantity';

        // 筛选该区域的项目
        filteredProjects = getFilteredProjects.filter(p => {
          const mappedRegion = REGION_MAPPING[p.region] || p.region;
          return mappedRegion === region;
        });

        // 根据维度设置额外字段
        if (metric === 'quantity') {
          title = `${region} - 项目列表`;
          extraFields = [
            { key: 'kickoffDate', label: '立项时间', type: 'date' },
            { key: 'acceptanceDate', label: '验收时间', type: 'date' }
          ];
        } else if (metric === 'amount') {
          title = `${region} - 项目列表（合同金额）`;
          extraFields = [
            { key: 'contractAmount', label: '合同金额', type: 'currency' }
          ];
        } else if (metric === 'revenue') {
          title = `${region} - 项目列表（确认收入）`;
          // 只显示已确认收入的项目
          filteredProjects = filteredProjects.filter(p => p.payment.isConfirmed && p.payment.confirmedDate);
          extraFields = [
            { key: 'confirmedRevenue', label: '确认收入', type: 'currency' }
          ];
        }

        filterInfo = `区域: ${region}`;
        if (selectedMonth !== 0) {
          filterInfo += ` | 月份: ${selectedMonth}月`;
        }
        break;
      }

      case 'industry': {
        const industry = (filterValue as { industry: string }).industry;
        const metric = extraInfo?.metric || 'quantity';

        // 筛选该行业的项目
        filteredProjects = getFilteredProjects.filter(p => (p.industry || '未知') === industry);

        // 根据维度设置额外字段
        if (metric === 'quantity') {
          title = `${industry} - 项目列表`;
          extraFields = [
            { key: 'kickoffDate', label: '立项时间', type: 'date' },
            { key: 'acceptanceDate', label: '验收时间', type: 'date' }
          ];
        } else if (metric === 'amount') {
          title = `${industry} - 项目列表（合同金额）`;
          extraFields = [
            { key: 'contractAmount', label: '合同金额', type: 'currency' }
          ];
        } else if (metric === 'revenue') {
          title = `${industry} - 项目列表（确认收入）`;
          filteredProjects = filteredProjects.filter(p => p.payment.isConfirmed && p.payment.confirmedDate);
          extraFields = [
            { key: 'confirmedRevenue', label: '确认收入', type: 'currency' }
          ];
        }

        filterInfo = `行业: ${industry}`;
        if (selectedMonth !== 0) {
          filterInfo += ` | 月份: ${selectedMonth}月`;
        }
        break;
      }

      case 'margin': {
        const marginRange = filterValue as string;

        // 根据毛利率区间筛选
        filteredProjects = getFilteredProjects.filter(p => {
          if (p.marginRate == null || p.marginRate === '') return false;
          const mr = parseFloat(p.marginRate);
          switch (marginRange) {
            case '30%以上': return mr > 30;
            case '10% - 30%': return mr >= 10 && mr <= 30;
            case '0% - 10%': return mr >= 0 && mr < 10;
            case '0%以下': return mr < 0;
            default: return false;
          }
        });

        title = `毛利率 ${marginRange} - 项目列表`;
        filterInfo = `毛利率区间: ${marginRange}`;
        extraFields = [
          { key: 'marginRate', label: '毛利率', type: 'percent' }
        ];
        break;
      }

      case 'regionalMargin': {
        const { region, marginRange } = filterValue as { region: string; marginRange: string };

        // 筛选该区域且符合毛利率区间的项目
        filteredProjects = getFilteredProjects.filter(p => {
          const mappedRegion = REGION_MAPPING[p.region] || p.region;
          if (mappedRegion !== region) return false;
          if (p.marginRate == null || p.marginRate === '') return false;
          const mr = parseFloat(p.marginRate);
          switch (marginRange) {
            case '30%以上': return mr > 30;
            case '10%-30%': return mr >= 10 && mr <= 30;
            case '0%-10%': return mr >= 0 && mr < 10;
            case '0%以下': return mr < 0;
            default: return false;
          }
        });

        title = `${region} - 毛利率 ${marginRange}`;
        filterInfo = `区域: ${region} | 毛利率区间: ${marginRange}`;
        extraFields = [
          { key: 'marginRate', label: '毛利率', type: 'percent' }
        ];
        break;
      }

      case 'highlight': {
        const { region, projectType } = filterValue as { region: string; projectType: 'highlight' | 'benchmark' };

        // 筛选该区域的亮点工程或标杆项目
        filteredProjects = getFilteredProjects.filter(p => {
          const mappedRegion = REGION_MAPPING[p.region] || p.region;
          if (mappedRegion !== region) return false;
          return projectType === 'highlight' ? p.isHighlight : p.isBenchmark;
        });

        const typeName = projectType === 'highlight' ? '亮点工程' : '标杆项目';
        title = `${region} - ${typeName}`;
        filterInfo = `区域: ${region} | 类型: ${typeName}`;
        extraFields = [
          { key: 'projectType', label: '项目类型', type: 'tags' }
        ];
        break;
      }

      case 'risk': {
        const region = filterValue as string;

        // 筛选该区域的风险项目
        filteredProjects = dashboardData.riskProjects
          .filter(r => {
            const mappedRegion = REGION_MAPPING[r.project.region] || r.project.region;
            return mappedRegion === region;
          })
          .map(r => r.project);

        title = `${region} - 风险项目`;
        filterInfo = `区域: ${region}`;
        extraFields = [
          { key: 'riskTypes', label: '风险类型', type: 'tags' }
        ];
        break;
      }
    }

    setDrillDownModal({
      isOpen: true,
      data: {
        title,
        module,
        projects: filteredProjects,
        extraFields,
        filterInfo
      }
    });
  };

  // --- Render Handlers ---

  if (drillDown.type) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <DrillDownView
          regionData={dashboardData.regionStats}
          industryData={dashboardData.industryStats}
          activeMetric={drillDown.metric}
          onMetricChange={(metric) => setDrillDown(prev => ({ ...prev, metric }))}
          onBack={() => setDrillDown({ type: null, metric: 'contract' })}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4">
            经营决策看板
            <div className="text-base font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
              数据年份: 2026
            </div>
          </h1>
     
        </div>
      </div>

      <div className="mb-10 flex items-start gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-gray-400 shrink-0">月份筛选:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMonth(0)}
              className={`px-4 py-2 text-base font-bold rounded-xl border transition-all ${
                selectedMonth === 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              全年
            </button>
            {months.map((m, i) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(i + 1)}
                className={`px-4 py-2 text-base font-bold rounded-xl border transition-all ${
                  selectedMonth === i + 1
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-400 shrink-0">区域筛选:</span>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2.5 text-base font-bold rounded-xl border border-gray-100 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="全部">全部</option>
            {PRIMARY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="space-y-16">
        {/* 全局看板 */}
        <section id="global-dashboard" className="space-y-8 animate-in fade-in duration-500">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Project Statistics */}
            <Card className="bg-white border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Briefcase size={24} className="text-blue-600" />
                </div>
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">PROJECT STATS</span>
              </div>
              <p className="text-5xl font-black text-gray-900 mb-1">{dashboardData.stats.totalProjectsCount}</p>
              <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest">全年项目总数</h3>
              {/* 同比数据 */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-400">去年同期：</span>
                <span className="font-black text-gray-500">0</span>
                <span className="text-gray-300 mx-1">|</span>
                <span className="font-bold text-gray-400">同比增长：</span>
                <span className="font-black text-gray-500">0%</span>
              </div>
              <div className="mt-4 space-y-2 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>新增项目</span>
                  <span>{dashboardData.stats.newProjects}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>应验收</span>
                  <span>{dashboardData.stats.shouldAcceptCount}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>已验收(验收率{dashboardData.stats.acceptanceRate}%)</span>
                  <span className="text-blue-600">{dashboardData.stats.acceptedCount}</span>
                </div>
              </div>
            </Card>

            {/* Card 2: Contract Statistics */}
            <Card className="bg-white border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <TrendingUp size={24} className="text-emerald-500" />
                </div>
                <span className="text-xs font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">CONTRACT VALUE</span>
              </div>
              <p className="text-5xl font-black text-gray-900 mb-1">{formatCurrency(dashboardData.stats.totalContractAmount)}</p>
              <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest">全年项目合同额总数</h3>
              {/* 同比数据 */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-400">去年同期：</span>
                <span className="font-black text-gray-500">0</span>
                <span className="text-gray-300 mx-1">|</span>
                <span className="font-bold text-gray-400">同比增长：</span>
                <span className="font-black text-gray-500">0%</span>
              </div>
              <div className="mt-4 space-y-2 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>新增项目合同额</span>
                  <span className="text-emerald-600">{formatCurrency(dashboardData.stats.newContractAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>已验收项目合同额</span>
                  <span className="text-emerald-700">{formatCurrency(dashboardData.stats.acceptedContractAmount)}</span>
                </div>
              </div>
            </Card>

            {/* Card 3: Revenue Statistics */}
            <Card className="bg-white border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Zap size={24} className="text-blue-500" />
                </div>
                <span className="text-xs font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">REVENUE STATUS</span>
              </div>
              <p className="text-5xl font-black text-gray-900 mb-1">{formatCurrency(dashboardData.stats.totalConfirmedRevenue)}</p>
              <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest">已确认收入金额</h3>
              {/* 同比数据 */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-400">去年同期：</span>
                <span className="font-black text-gray-500">0</span>
                <span className="text-gray-300 mx-1">|</span>
                <span className="font-bold text-gray-400">同比增长：</span>
                <span className="font-black text-gray-500">0%</span>
              </div>
              <div className="mt-4 space-y-2 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>已验收待确认</span>
                  <span className="text-blue-600">{formatCurrency(dashboardData.stats.totalAcceptedPending)}</span>
                </div>
              </div>
            </Card>

            {/* Card 4: Collection Statistics */}
            <Card className="bg-white border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 rounded-2xl">
                  <Activity size={24} className="text-orange-500" />
                </div>
                <span className="text-xs font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-lg">COLLECTION AMOUNT</span>
              </div>
              <p className="text-5xl font-black text-gray-900 mb-1">{formatCurrency(dashboardData.stats.totalPaid2026)}</p>
              <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest">全年回款额</h3>
              <div className="mt-4 space-y-2 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>本月回款额</span>
                  <span className="text-orange-600">{formatCurrency(dashboardData.stats.monthlyCollectionAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold gap-1">
                  <span>上月回款额</span>
                  <span className="text-orange-700">{formatCurrency(dashboardData.stats.previousMonthCollectionAmount)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Region Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-gray-800">区域KPI达成情况</h3>
              </div>
              <div className="space-y-6">
                {dashboardData.regionStats.map(item => {
                  const target = 50000000; // 固定KPI目标：5000万元
                  const percent = (item.revenue / target) * 100;
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-black text-gray-700">{item.name}</span>
                        <span className="text-sm font-black text-blue-600">{percent.toFixed(1)}%</span>
                      </div>
                      <ProgressBar percent={percent} colorClass="bg-blue-500" heightClass="h-3" />
                      <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                        <span>已确认: {formatCurrency(item.revenue)}</span>
                        <span>目标: 5000万</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-8 px-6 py-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-6">
                  <h3 className="text-xl font-black text-gray-800">区域分布</h3>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => { setDistType('quantity'); setDistViewMode(distViewMode === 'overview' ? 'detail' : 'overview'); }}
                      className={`px-6 py-2 text-base rounded-lg transition-all font-black flex items-center gap-2 ${distType === 'quantity' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      项目数量
                      {distType === 'quantity' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{distViewMode === 'overview' ? '概览' : '详情'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setDistType('amount'); setDistViewMode(distViewMode === 'overview' ? 'detail' : 'overview'); }}
                      className={`px-6 py-2 text-base rounded-lg transition-all font-black flex items-center gap-2 ${distType === 'amount' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      合同金额
                      {distType === 'amount' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{distViewMode === 'overview' ? '概览' : '详情'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setDistType('revenue'); setDistViewMode(distViewMode === 'overview' ? 'detail' : 'overview'); }}
                      className={`px-6 py-2 text-base rounded-lg transition-all font-black flex items-center gap-2 ${distType === 'revenue' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      确认收入
                      {distType === 'revenue' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{distViewMode === 'overview' ? '概览' : '详情'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.regionStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} dy={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                      tickFormatter={(distType === 'amount' || distType === 'revenue') ? formatCurrency : (value: any) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                      formatter={(value: any) => (distType === 'amount' || distType === 'revenue') ? formatCurrency(value) : `${value} 个`}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '13px', fontWeight: 'bold' }} />
                    {distViewMode === 'overview' ? (
                      // 概览模式
                      <>
                        {distType === 'quantity' ? (
                          <Bar name="全年项目总数" dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} cursor="pointer"
                            onClick={(data) => handleDrillDown('region', data.name, { metric: 'quantity' })}>
                            <LabelList dataKey="count" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" />
                          </Bar>
                        ) : distType === 'amount' ? (
                          <Bar name="全年项目合同额总数" dataKey="contract" fill="#3B82F6" radius={[4, 4, 0, 0]} cursor="pointer"
                            onClick={(data) => handleDrillDown('region', data.name, { metric: 'amount' })}>
                            <LabelList dataKey="contract" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                          </Bar>
                        ) : (
                          <Bar name="已确认收入金额" dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer"
                            onClick={(data) => handleDrillDown('region', data.name, { metric: 'revenue' })}>
                            <LabelList dataKey="revenue" position="top" fill="#10B981" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                          </Bar>
                        )}
                      </>
                    ) : (
                      // 详情模式
                      <>
                        {distType === 'quantity' ? (
                          <>
                            <Bar name="新增项目数量" dataKey="newProj" fill="#3B82F6" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'quantity' })}>
                              <LabelList dataKey="newProj" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" />
                            </Bar>
                            <Bar name="已验收项目数量" dataKey="acceptedProj" fill="#6366F1" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'quantity' })}>
                              <LabelList dataKey="acceptedProj" position="top" fill="#6366F1" fontSize={11} fontWeight="bold" />
                            </Bar>
                          </>
                        ) : distType === 'amount' ? (
                          <>
                            <Bar name="新增项目合同额" dataKey="newContractsTotal" fill="#3B82F6" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'amount' })}>
                              <LabelList dataKey="newContractsTotal" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                            </Bar>
                            <Bar name="已验收项目合同额" dataKey="acceptedContract" fill="#6366F1" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'amount' })}>
                              <LabelList dataKey="acceptedContract" position="top" fill="#6366F1" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                            </Bar>
                          </>
                        ) : (
                          <>
                            <Bar name="已验收待确认收入" dataKey="acceptedPendingRevenue" fill="#F59E0B" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'revenue' })}>
                              <LabelList dataKey="acceptedPendingRevenue" position="top" fill="#F59E0B" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                            </Bar>
                            <Bar name="已回款额度" dataKey="actualPaid" fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer"
                              onClick={(data) => handleDrillDown('region', data.name, { metric: 'revenue' })}>
                              <LabelList dataKey="actualPaid" position="top" fill="#10B981" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} />
                            </Bar>
                          </>
                        )}
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Industry Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-gray-800">行业KPI达成情况</h3>
              </div>
              <div className="space-y-6">
                {dashboardData.industryStats.map(item => {
                  const target = 50000000; // 固定KPI目标：5000万元
                  const percent = (item.revenue / target) * 100;
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-black text-gray-700">{item.name}</span>
                        <span className="text-sm font-black text-blue-600">{percent.toFixed(1)}%</span>
                      </div>
                      <ProgressBar percent={percent} colorClass="bg-blue-500" heightClass="h-3" />
                      <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                        <span>已确认: {formatCurrency(item.revenue)}</span>
                        <span>目标: 5000万</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-8 px-6 py-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-gray-800">行业分布</h3>
              </div>

              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.industryStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} dy={10} />
                    <YAxis
                      yAxisId="amount"
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      yAxisId="quantity"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '13px', fontWeight: 'bold' }} />
                    <Bar yAxisId="amount" name="合同金额" dataKey="contract" fill="#3B82F6" radius={[4, 4, 0, 0]} cursor="pointer"
                      onClick={(data) => handleDrillDown('industry', { industry: data.name }, { metric: 'amount' })}>
                      <LabelList dataKey="contract" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" formatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`} offset={5} />
                    </Bar>
                    <Bar yAxisId="quantity" name="项目数量" dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer"
                      onClick={(data) => handleDrillDown('industry', { industry: data.name }, { metric: 'quantity' })}>
                      <LabelList dataKey="count" position="top" fill="#10B981" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Time Trend Analysis */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-800">年度数据趋势统计</h3>
              <button
                onClick={() => setShowTrendChart(!showTrendChart)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {showTrendChart ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
              </button>
            </div>

            {showTrendChart && (
              <>
                <div className="flex flex-wrap gap-3 mb-6">
                  {[
                    { key: 'newContract', label: '新增合同金额', color: '#3B82F6' },
                    { key: 'newProjCount', label: '新增项目数量', color: '#10B981' },
                    { key: 'shouldAcceptProjCount', label: '验收项目数量', color: '#F59E0B' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setVisibleTrendLines(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        visibleTrendLines[item.key]
                          ? 'bg-white shadow-sm border-2'
                          : 'bg-gray-100 text-gray-400 border-2 border-transparent'
                      }`}
                      style={{
                        borderColor: visibleTrendLines[item.key] ? item.color : 'transparent',
                        color: visibleTrendLines[item.key] ? item.color : ''
                      }}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          visibleTrendLines[item.key] ? 'bg-current' : 'bg-gray-300'
                        }`}
                      />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} dy={10} />
                      <YAxis
                        yAxisId="amount"
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                        tickFormatter={formatCurrency}
                      />
                      <YAxis
                        yAxisId="quantity"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                      />
                      {visibleTrendLines.newContract && (
                        <Line
                          yAxisId="amount"
                          type="monotone"
                          dataKey="newContract"
                          name="新增合同金额"
                          stroke="#3B82F6"
                          strokeWidth={4}
                          dot={{ r: 6, strokeWidth: 3, fill: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      )}
                      {visibleTrendLines.newProjCount && (
                        <Line
                          yAxisId="quantity"
                          type="monotone"
                          dataKey="newProjCount"
                          name="新增项目数量"
                          stroke="#10B981"
                          strokeWidth={4}
                          dot={{ r: 6, strokeWidth: 3, fill: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      )}
                      {visibleTrendLines.shouldAcceptProjCount && (
                        <Line
                          yAxisId="quantity"
                          type="monotone"
                          dataKey="shouldAcceptProjCount"
                          name="验收项目数量"
                          stroke="#F59E0B"
                          strokeWidth={4}
                          dot={{ r: 6, strokeWidth: 3, fill: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Card>
        </section>

        {/* 产品价值 & 风险穿透 - 简洁卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 产品价值卡片 */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowProductValueModal(true)}>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <TrendingUp size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-800">产品价值</h3>
              </div>
              <ChevronRight size={24} className="text-blue-400" />
            </div>
          </Card>

          {/* 风险穿透卡片 */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowRiskPenetrationModal(true)}>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white">
                <AlertTriangle size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-800">风险穿透</h3>
              </div>
              <ChevronRight size={24} className="text-red-400" />
            </div>
          </Card>
        </div>
      </div>
    </div>

    {/* 下钻模态框 */}
    <DashboardDrillDownModal
      isOpen={drillDownModal.isOpen}
      onClose={() => setDrillDownModal({ isOpen: false, data: null })}
      onNavigateToProject={onNavigateToProject}
      drillData={drillDownModal.data}
    />

    {/* 产品价值模态框 */}
    <ProductValueModal
      isOpen={showProductValueModal}
      onClose={() => setShowProductValueModal(false)}
      onNavigateToProject={onNavigateToProject}
      lowSatisfactionProjects={dashboardData.lowSatisfactionProjects}
      productSalesData={dashboardData.productSalesData}
      marginDist={dashboardData.marginDist}
      regionalMarginDist={dashboardData.regionalMarginDist}
      highlightProjects={dashboardData.highlightProjects}
      benchmarkProjects={dashboardData.benchmarkProjects}
      combinedRegionData={dashboardData.combinedRegionData}
    />

    {/* 风险穿透模态框 */}
    <RiskPenetrationModal
      isOpen={showRiskPenetrationModal}
      onClose={() => setShowRiskPenetrationModal(false)}
      onNavigateToProject={onNavigateToProject}
      riskProjects={dashboardData.riskProjects}
      riskRegionStats={dashboardData.riskRegionStats}
      stats={dashboardData.stats}
    />
  </div>
  );
}
