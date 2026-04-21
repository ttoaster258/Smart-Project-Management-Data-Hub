import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Project, Region, MAJOR_REGIONS, REGION_MAPPING, ProjectPhase, FilterState, ProjectStatus, ProjectNature, ProjectLevel, ProjectType, MilestoneNode, MILESTONE_NODE_LABELS, DrillDownData, CustomColumn, ProjectCustomData, CustomDataItem, MilestoneDateInfo } from './types';
import { MOCK_PROJECTS, normalizeSecurityLevel } from './constants';
import Sidebar, { NavItem } from './components/Sidebar';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import DecisionDashboard from './components/DecisionDashboard';
import DrillDownModal from './components/DrillDownModal';
import { updateProjectDates } from './scripts/updateProjectDates';
import API_BASE_URL from './config/api.config';

// Import newly extracted components
import ProjectManagerTable from './components/ProjectManagerTable';
import SensitiveProjectTable from './components/SensitiveProjectTable';
import AdvancedSearchDropdown from './components/AdvancedSearchDropdown';

// Import pages
import HighlightPage from './components/HighlightPage';
import CollectionTrackingPage from './components/CollectionTrackingPage';
import AcceptanceTrackingDashboard from './components/acceptance-tracking/AcceptanceTrackingDashboard';
import ProjectManagerProfilePage from './components/ProjectManagerProfilePage';
import ProgressMonitorPage from './components/ProgressMonitorPage';
import CostMonitorPage from './components/CostMonitorPage';
import ChangeManagementPage from './components/ChangeManagementPage';
import RiskWarningPage from './components/RiskWarningPage';
import ProjectFormModal from './components/ProjectFormModal';
import ProjectResultPage from './components/ProjectResultPage';
import RegionalDashboardPage from './components/RegionalDashboardPage';
import PMPersonalDashboardPage from './components/PMPersonalDashboardPage';
import ReportGeneratorPage from './components/ReportGeneratorPage';
import SystemConfigPage from './components/SystemConfigPage';
import ProjectDataService from './services/ProjectDataService';

// Import authentication components
import LoginPage from './src/pages/LoginPage';
import ProtectedRoute from './src/components/ProtectedRoute';
import { isAuthenticated, logout, getCurrentUser, hasPermission, hasRole, isAdminUser, getUserDataScope, filterProjectsByDataScope } from './services/AuthService';

// Import column configuration
import ColumnSelector from './components/ColumnSelector.tsx';
import { COLUMN_CONFIGS, getColumnConfig } from './utils/columnConfig';

// Restructured Navigation Items (Based on latest business architecture)
const NAV_ITEMS: NavItem[] = [
  {
    id: 'Business_Data',
    label: '项目经营看板',
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'Regional_Dashboard',
    label: '区域经营看板',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'PMO_Project_Management',
    label: 'PMO项目管理看板',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    children: [
      { id: 'Progress_Monitor', label: '进度监控', icon: '' },
      { id: 'Cost_Monitor', label: '成本监控', icon: '' },
      { id: 'Change_Management', label: '变更管理', icon: '' },
      { id: 'Risk_Warning', label: '风险预警', icon: '' },
    ]
  },
  {
    id: 'Acceptance_Tracking',
    label: '验收追踪看板',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
  {
    id: 'Highlight_Display',
    label: '亮点工程看板',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    id: 'PM_Personal_Dashboard',
    label: '项目经理个人看板',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    id: 'Full_Information',
    label: '全量项目看板',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  },
  {
    id: 'PM_Profile',
    label: '项目经理档案',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'Project_Result',
    label: '项目成果看板',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'Report_Generator',
    label: '智能报告',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
];

// 导航项权限映射 - 定义每个导航项所需的最小权限
// 使用数组表示多个权限，用户只需拥有其中一个即可访问
// 区域总监：只能访问区域经营看板、PMO看板（只读）、亮点工程、项目经理档案、全量项目（本区域）、项目成果
const NAV_PERMISSION_MAP: Record<string, string[]> = {
  'Business_Data': ['dashboard:business'],  // 仅admin/executive/pmo可访问
  'Regional_Dashboard': ['dashboard:regional', 'dashboard:regional_own'],  // executive或区域总监
  'PMO_Project_Management': ['dashboard:pmo', 'dashboard:pmo_progress'],  // pmo或区域总监（只读）
  'Progress_Monitor': ['dashboard:pmo', 'dashboard:pmo_progress'],
  'Cost_Monitor': ['dashboard:pmo', 'dashboard:pmo_cost'],
  'Change_Management': ['dashboard:pmo', 'dashboard:pmo_change'],  // pmo或区域总监（只读）
  'Risk_Warning': ['dashboard:pmo', 'dashboard:pmo_risk'],
  'Acceptance_Tracking': ['dashboard:acceptance'],  // 仅admin/pmo可访问
  'Highlight_Display': ['dashboard:highlight'],  // 全量查看
  'PM_Personal_Dashboard': ['dashboard:pm_own', 'dashboard:pm_personal'],  // pm或区域总监（本区域）
  'Full_Information': ['project:view_all', 'project:view_region'],  // 全量或区域项目
  'PM_Profile': ['dashboard:pm_profile'],  // 项目经理档案
  'Project_Result': ['dashboard:project_result'],  // 项目成果
  'Report_Generator': ['report:generate'],  // 仅admin/pmo
  'System_Config': ['system:config', 'system:user_manage', 'system:role_manage'],  // 仅admin
};

const OverviewTable: React.FC<{
   projects: Project[],
    selectedId: string | null,
    onToggleDetail: (id: string) => void,
    onEdit: (p: Project) => void,
    onDelete: (id: string) => void,
    isAdmin?: boolean,
    onRefresh?: () => void,
    visibleColumns?: string[],
    onVisibleColumnsChange?: (columns: string[]) => void,
    customColumns?: CustomColumn[],
    customColumnData?: { [projectId: string]: ProjectCustomData },
    onCustomColumnValueChange?: (projectId: string, columnKey: string, value: string | number) => void,
    onCustomColumnsChange?: (columns: CustomColumn[]) => void,
    onToggleAcceptanceTracking?: (projectId: string, isTracking: boolean, trackingDate: string) => void
}> = ({ projects, selectedId, onToggleDetail, onEdit, onDelete, isAdmin, onRefresh, visibleColumns, onVisibleColumnsChange, customColumns = [], customColumnData = {}, onCustomColumnValueChange, onCustomColumnsChange, onToggleAcceptanceTracking }) => {
   const [manHourFocusProject, setManHourFocusProject] = useState<Project | null>(null);
   const [changeFocusProject, setChangeFocusProject] = useState<Project | null>(null);
   const [personnelFocusProject, setPersonnelFocusProject] = useState<Project | null>(null);
   const [financialFocusProject, setFinancialFocusProject] = useState<Project | null>(null);
   const [editingCell, setEditingCell] = useState<{ projectId: string; columnKey: string } | null>(null);
   const [editValue, setEditValue] = useState<string>('');

   // 追踪验收相关状态
   const [showTrackingModal, setShowTrackingModal] = useState(false);
   const [trackingProjectId, setTrackingProjectId] = useState<string | null>(null);
   const [trackingDate, setTrackingDate] = useState<string>(new Date().toISOString().split('T')[0]);

   // 分页状态
   const [currentPage, setCurrentPage] = useState(1);
   const [pageSize, setPageSize] = useState(15);

   // 计算分页数据
   const totalPages = Math.ceil(projects.length / pageSize);
   const startIndex = (currentPage - 1) * pageSize;
   const endIndex = startIndex + pageSize;
   const paginatedProjects = projects.slice(startIndex, endIndex);

   // 当 pageSize 改变时，重置到第一页
   const handlePageSizeChange = (newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1);
   };

   // 当 projects 变化时，确保当前页有效
   useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
         setCurrentPage(totalPages);
      }
   }, [projects.length, currentPage, totalPages]);

   // Default to all columns if not provided
   const allColumnIds = useMemo(() => COLUMN_CONFIGS.map(c => c.id), []);

   const effectiveVisibleColumns = visibleColumns || allColumnIds;

   // Helper to check if a column should be rendered
   const shouldRender = (columnId: string): boolean => {
      return effectiveVisibleColumns.includes(columnId);
   };

   const getHeatmapColor = (hours: number) => {
      if (hours === 0) return 'bg-slate-50 text-slate-300';
      if (hours < 40) return 'bg-indigo-50 text-indigo-400';
      if (hours < 100) return 'bg-indigo-100 text-indigo-600 font-bold';
      return 'bg-indigo-500 text-white font-black';
   };

   return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-full relative flex flex-col">
         <div className="flex-1 overflow-auto custom-scrollbar overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[max-content] table-auto">
               <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-30">
                  <tr className="divide-x divide-slate-100">
                     {/* I. Identity & Classification */}
                     {shouldRender('projectName') && <th className="whitespace-nowrap p-3 text-[18px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 sticky left-0 z-40 min-w-[240px] w-64 text-center">项目名称</th>}
                     {shouldRender('projectCode') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-40">项目编号</th>}
                     {shouldRender('region') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">所属区域</th>}
                     {shouldRender('securityLevel') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-24">密级</th>}
                     {shouldRender('level') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">项目级别</th>}
                     {shouldRender('type') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">项目类型</th>}
                     {shouldRender('industry') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">行业</th>}
                     {shouldRender('isBenchmark') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">是否为标杆项目</th>}
                     {shouldRender('isHighlight') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">是否为亮点工程</th>}
                     {shouldRender('status') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">项目状态</th>}
                     {shouldRender('milestoneNode') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">里程碑节点</th>}
                     {shouldRender('phase') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">项目阶段</th>}
                     {shouldRender('statusComment') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-44">项目状态说明</th>}

                     {/* Personnel */}
                     {shouldRender('projectManager') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">项目经理</th>}
                     {shouldRender('salesManager') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">销售经理</th>}
                     {shouldRender('preSalesManager') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">售前经理</th>}
                     {shouldRender('projectDirector') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">项目总监</th>}

                     {/* II. Timeline */}
                     {shouldRender('projectCycle') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">项目周期</th>}
                     {shouldRender('kickoffDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">立项日期</th>}
                     {shouldRender('plannedEndDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">计划结束日期</th>}
                     {shouldRender('forecastAcceptanceDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">预测验收时间</th>}
                     {shouldRender('acceptanceDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">验收日期</th>}

                     {/* III. Budget & Cost */}
                     {shouldRender('totalBudget') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-40">预算总金额</th>}
                     {shouldRender('budgetUsage') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">预算使用情况</th>}
                     {shouldRender('initialQuote') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">初步报价</th>}
                     {shouldRender('reqEvaluationFee') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">需求评估费用</th>}
                     {shouldRender('internalCost') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">内部预估成本</th>}
                     {shouldRender('internalProfit') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">内部预估利润</th>}
                     {shouldRender('marginRate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">毛利率</th>}

                     {/* IV. Payment & Revenue */}
                     {shouldRender('contractName') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-48">合同名称</th>}
                     {shouldRender('groupCompany') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-48">集团公司</th>}
                     {shouldRender('contractAmount') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-40">合同总额</th>}
                     {shouldRender('actualPaid') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-40">已回款额度</th>}
                     {shouldRender('pending') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">未回款额度</th>}
                     {shouldRender('acceptedPendingRevenue') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">已验收待确认收入</th>}

                     {/* V. Procurement & Outsourcing */}
                     {shouldRender('outsourcerName') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">外协单位名称</th>}
                     {shouldRender('outsourcerAmount') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">外协采购金额</th>}
                     {shouldRender('outsourcerTechContent') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">外协主要技术内容</th>}
                     {shouldRender('equipmentSpec') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">采购设备规格内容</th>}
                     {shouldRender('outsourcerRatio') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">外协采购费用占比</th>}

                     {/* VI. Execution Metrics */}
                     {shouldRender('inputPercent') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">投入百分比 (%)</th>}
                     {shouldRender('progress') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">进度百分比 (%)</th>}
                     {shouldRender('plannedTotalHours') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-48">项目整体计划总工时 (人周)</th>}
                     {shouldRender('actualHours') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-48">项目整体实际总工时 (人周)</th>}

                     {/* VII. Acceptance & Completion */}
                     {shouldRender('acceptanceControl') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">验收可控性</th>}
                     {shouldRender('mainWorkCompleted') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-32">主体工作是否完成</th>}

                     {/* VIII. Change & Audit Trail */}
                     {shouldRender('changeCount') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-28">变更次数</th>}
                     {shouldRender('lastChangeDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">最近变更通过时间</th>}
                     {shouldRender('documentReceivedDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">验收单获取时间</th>}
                     {shouldRender('receivedThankYouDate') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-36">感谢信接收时间</th>}

                     {/* IX. Miscellaneous */}
                     {shouldRender('remarks') && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-slate-500 uppercase tracking-wider text-center w-48">备注</th>}

                     {/* 自定义列 */}
                     {customColumns.map(col => shouldRender(col.column_key) && (
                        <th key={col.column_key} className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-amber-600 uppercase tracking-wider text-center w-36">
                           {col.column_name}
                        </th>
                     ))}

                     {isAdmin && <th className="whitespace-nowrap px-3 py-3 text-[18px] font-black text-indigo-600 uppercase tracking-wider text-center w-40 sticky right-0 bg-slate-50 z-40">操作管理</th>}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {paginatedProjects.map(p => {
                     const manHourSum = p.manHours.personnelDetails.reduce((sum, person) => sum + person.monthly.reduce((monthSum, hours) => monthSum + hours, 0), 0);

                     return (
                        <tr key={p.id} className={`transition-all duration-150 hover:bg-indigo-50/40 ${selectedId === p.id ? '!bg-indigo-100/60' : ''}`}>
                           {/* I. Identity & Classification */}
                           <td className="p-3 align-middle w-64">
                              <div className="flex items-center gap-3">
                                 <button
                                    onClick={() => onToggleDetail(p.id)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                                       p.isBenchmark ? 'bg-rose-100 text-rose-700' :
                                       p.isHighlight ? 'bg-emerald-100 text-emerald-700' :
                                       'bg-slate-100 text-slate-500'
                                    }`}
                                    title={p.isBenchmark ? '标杆项目' : p.isHighlight ? '亮点工程' : '普通项目'}
                                 >
                                    {p.isBenchmark ? '榜' : p.isHighlight ? '亮' : '项'}
                                 </button>
                                 <div className="flex flex-col min-w-0">
                                    <div className="font-mono text-[14px] font-medium text-slate-800 truncate" title={p.projectName}>{p.projectName}</div>
                                    <div className="text-[14px] text-slate-500 font-normal uppercase tracking-wide">{p.projectCode}</div>
                                 </div>
                              </div>
                           </td>
                           {shouldRender('projectCode') && (
                              <td className="px-3 py-3 text-center align-middle w-40">
                                 <span className="font-mono text-[14px] font-black text-slate-600 truncate" title={p.projectCode}>{p.projectCode}</span>
                              </td>
                           )}
                           {shouldRender('region') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-500 uppercase tracking-widest truncate" title={p.region}>{p.region}</span>
                              </td>
                           )}
                           {shouldRender('securityLevel') && (
                              <td className="px-3 py-3 text-center align-middle w-24">
                                 {(() => {
                                    const normalized = normalizeSecurityLevel(p.securityLevel);
                                    if (!normalized) return null;
                                    return (
                                       <span className={`text-[14px] font-black ${
                                          normalized === 'TM' ? 'text-rose-600' :
                                          normalized === 'NB' ? 'text-blue-600' :
                                          'text-slate-600'
                                       }`}>{normalized}</span>
                                    );
                                 })()}
                              </td>
                           )}
                           {shouldRender('level') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 {p.level ? (
                                    <span className="text-[14px] font-medium text-slate-700 uppercase">{p.level.replace(/（.*?）/, '')}</span>
                                 ) : (
                                    <span className="text-[14px] text-slate-300">-</span>
                                 )}
                              </td>
                           )}
                           {shouldRender('type') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 whitespace-nowrap uppercase truncate" title={p.type}>{p.type}</span>
                              </td>
                           )}
                           {shouldRender('industry') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.industry}>{p.industry}</span>
                              </td>
                           )}
                           {shouldRender('isBenchmark') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className={`text-[14px] font-bold ${p.isBenchmark ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {p.isBenchmark ? '是' : '否'}
                                 </span>
                              </td>
                           )}
                           {shouldRender('isHighlight') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className={`text-[14px] font-bold ${p.isHighlight ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {p.isHighlight ? '是' : '否'}
                                 </span>
                              </td>
                           )}
                           {shouldRender('status') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className={`text-[14px] font-normal px-2 py-1 rounded-full ${
                                    p.status === ProjectStatus.Ongoing ? 'bg-emerald-100 text-emerald-700' :
                                    p.status === ProjectStatus.Delayed ? 'bg-amber-100 text-amber-700' :
                                    p.status === ProjectStatus.Accepted ? 'bg-blue-100 text-blue-700' :
                                    p.status === ProjectStatus.Paused ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                                 }`}>
                                    {p.status}
                                 </span>
                              </td>
                           )}
                           {shouldRender('milestoneNode') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 {p.milestoneNode && (
                                    <span className="text-[14px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                       {MILESTONE_NODE_LABELS[p.milestoneNode] || p.milestoneNode}
                                    </span>
                                 )}
                              </td>
                           )}
                           {shouldRender('phase') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.phase}>{p.phase}</span>
                              </td>
                           )}
                           {shouldRender('statusComment') && (
                              <td className="px-3 py-3 text-center align-middle w-44">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.statusComment}>{p.statusComment}</span>
                              </td>
                           )}

                           {/* Personnel */}
                           {shouldRender('projectManager') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.members.projectManager}>{p.members.projectManager}</span>
                              </td>
                           )}
                           {shouldRender('salesManager') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.members.salesManager}>{p.members.salesManager}</span>
                              </td>
                           )}
                           {shouldRender('preSalesManager') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.members.preSalesManager}>{p.members.preSalesManager}</span>
                              </td>
                           )}
                           {shouldRender('projectDirector') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.members.projectDirector}>{p.members.projectDirector}</span>
                              </td>
                           )}

                           {/* Timeline */}
                           {shouldRender('projectCycle') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.projectCycle || '-'}</span>
                              </td>
                           )}
                           {shouldRender('kickoffDate') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.timeline.kickoffDate}</span>
                              </td>
                           )}
                           {shouldRender('plannedEndDate') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.timeline.plannedEndDate}</span>
                              </td>
                           )}
                           {shouldRender('forecastAcceptanceDate') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.forecastAcceptanceDate}</span>
                              </td>
                           )}
                           {shouldRender('acceptanceDate') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.timeline.acceptanceDate}</span>
                              </td>
                           )}

                           {/* Budget & Cost */}
                           {shouldRender('totalBudget') && (
                              <td className="px-3 py-3 text-center align-middle w-40">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.budget.totalBudget.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('budgetUsage') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.budget?.budgetUsedAmount ? `${((p.budget.budgetUsedAmount / p.budget.totalBudget) * 100).toFixed(2)}%` : '0%'}</span>
                              </td>
                           )}
                           {shouldRender('initialQuote') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.budget.initialQuote.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('reqEvaluationFee') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.budget.reqEvaluationFee.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('internalCost') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.budget.internalCost.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('internalProfit') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.budget.internalProfit.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('marginRate') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className={`text-[14px] font-bold ${
                                    p.marginRate ? (
                                       parseFloat(p.marginRate) > 30 ? 'text-emerald-600' :
                                       parseFloat(p.marginRate) > 10 ? 'text-blue-600' :
                                       parseFloat(p.marginRate) > 0 ? 'text-amber-600' :
                                       'text-rose-600'
                                    ) : 'text-slate-400'
                                 }`}>
                                    {p.marginRate ? `${p.marginRate}%` : '-'}
                                 </span>
                              </td>
                           )}

                           {/* Payment & Revenue */}
                           {shouldRender('contractName') && (
                              <td className="px-3 py-3 text-center align-middle w-48">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.payment.contractName}>{p.payment.contractName}</span>
                              </td>
                           )}
                           {shouldRender('groupCompany') && (
                              <td className="px-3 py-3 text-center align-middle w-48">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.payment.groupCompany}>{p.payment.groupCompany}</span>
                              </td>
                           )}
                           {shouldRender('contractAmount') && (
                              <td className="px-3 py-3 text-center align-middle w-40">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.payment.contractAmount.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('actualPaid') && (
                              <td className="px-3 py-3 text-center align-middle w-40">
                                 <span className="text-[14px] font-bold text-emerald-600 tabular-nums">
                                    {p.payment.paymentNodes?.reduce((sum, node) => sum + (node.actualAmount || 0), 0).toLocaleString()}
                                 </span>
                              </td>
                           )}
                           {shouldRender('pending') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-bold text-amber-600 tabular-nums">{p.payment.pending.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('acceptedPendingRevenue') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-bold text-amber-600 tabular-nums">{p.payment.acceptedPendingRevenue.toLocaleString()}</span>
                              </td>
                           )}

                           {/* Procurement & Outsourcing */}
                           {shouldRender('outsourcerName') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.outsourcerName}>{p.outsourcerName}</span>
                              </td>
                           )}
                           {shouldRender('outsourcerAmount') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.outsourcerAmount?.toLocaleString()}</span>
                              </td>
                           )}
                           {shouldRender('outsourcerTechContent') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.outsourcerTechContent}>{p.outsourcerTechContent}</span>
                              </td>
                           )}
                           {shouldRender('equipmentSpec') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.equipmentSpec}>{p.equipmentSpec}</span>
                              </td>
                           )}
                           {shouldRender('outsourcerRatio') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.outsourcerRatio}</span>
                              </td>
                           )}

                           {/* Execution Metrics */}
                           {shouldRender('inputPercent') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className={`text-[14px] font-bold ${
                                    p.execution.inputPercent && p.execution.progress ?
                                       p.execution.inputPercent > p.execution.progress + 10 ? 'text-rose-600' :
                                       p.execution.inputPercent > p.execution.progress ? 'text-amber-600' :
                                       'text-emerald-600'
                                    : 'text-slate-400'
                                 }`}>
                                    {p.execution.inputPercent?.toFixed(1)}%
                                 </span>
                              </td>
                           )}
                           {shouldRender('progress') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.execution.progress?.toFixed(1)}%</span>
                              </td>
                           )}
                           {shouldRender('plannedTotalHours') && (
                              <td className="px-3 py-3 text-center align-middle w-48">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.manHours.plannedTotal}</span>
                              </td>
                           )}
                           {shouldRender('actualHours') && (
                              <td className="px-3 py-3 text-center align-middle w-48">
                                 <span className="text-[14px] font-black text-slate-600 tabular-nums">{p.manHours.pmoAnnualTotal}</span>
                              </td>
                           )}

                           {/* Acceptance & Completion */}
                           {shouldRender('acceptanceControl') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.timeline.acceptanceControl}</span>
                              </td>
                           )}
                           {shouldRender('mainWorkCompleted') && (
                              <td className="px-3 py-3 text-center align-middle w-32">
                                 <span className="text-[14px] font-black text-slate-600">{p.mainWorkCompleted}</span>
                              </td>
                           )}

                           {/* Change & Audit Trail */}
                           {shouldRender('changeCount') && (
                              <td className="px-3 py-3 text-center align-middle w-28">
                                 <span className="text-[14px] font-bold text-amber-600">{p.changeCount || 0}</span>
                              </td>
                           )}
                           {shouldRender('lastChangeDate') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.lastChangeDate || '-'}</span>
                              </td>
                           )}
                           {shouldRender('documentReceivedDate') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.documentReceivedDate}</span>
                              </td>
                           )}
                           {shouldRender('receivedThankYouDate') && (
                              <td className="px-3 py-3 text-center align-middle w-36">
                                 <span className="text-[14px] font-black text-slate-600">{p.receivedThankYouDate}</span>
                              </td>
                           )}

                           {/* Miscellaneous */}
                           {shouldRender('remarks') && (
                              <td className="px-3 py-3 text-center align-middle w-48">
                                 <span className="text-[14px] font-black text-slate-600 truncate" title={p.remarks || ''}>{p.remarks}</span>
                              </td>
                           )}

                           {/* 自定义列 */}
                           {customColumns.map(col => shouldRender(col.column_key) && (
                              <td key={col.column_key} className="px-3 py-3 text-center align-middle w-36">
                                 {editingCell?.projectId === p.id && editingCell?.columnKey === col.column_key ? (
                                    <input
                                       type={col.data_type === 'number' ? 'number' : 'text'}
                                       value={editValue}
                                       onChange={(e) => setEditValue(e.target.value)}
                                       onBlur={() => {
                                          if (onCustomColumnValueChange) {
                                             onCustomColumnValueChange(p.id, col.column_key, col.data_type === 'number' ? Number(editValue) : editValue);
                                          }
                                          setEditingCell(null);
                                       }}
                                       onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                             if (onCustomColumnValueChange) {
                                                onCustomColumnValueChange(p.id, col.column_key, col.data_type === 'number' ? Number(editValue) : editValue);
                                             }
                                             setEditingCell(null);
                                          } else if (e.key === 'Escape') {
                                             setEditingCell(null);
                                          }
                                       }}
                                       className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                       autoFocus
                                    />
                                 ) : (
                                    <span
                                       className={`text-[14px] font-black truncate block ${isAdmin ? 'cursor-pointer hover:text-indigo-600' : 'text-slate-600'}`}
                                       title={customColumnData[p.id]?.[col.column_key]?.toString() || ''}
                                       onClick={() => {
                                          if (isAdmin && onCustomColumnValueChange) {
                                             setEditingCell({ projectId: p.id, columnKey: col.column_key });
                                             setEditValue(customColumnData[p.id]?.[col.column_key]?.toString() || '');
                                          }
                                       }}
                                    >
                                       {customColumnData[p.id]?.[col.column_key]?.toString() || (isAdmin ? <span className="text-slate-300">点击编辑</span> : '-')}
                                    </span>
                                 )}
                              </td>
                           ))}

                           {isAdmin && (
                               <td className="px-3 py-3 text-center align-middle w-40 sticky right-0 bg-white group-hover:bg-indigo-50/40 z-30 border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">
                                  <div className="flex items-center justify-center space-x-2">
                                     {/* 追踪验收勾选框 */}
                                     <button
                                        onClick={() => {
                                          if (p.isAcceptanceTracking) {
                                            // 已勾选，取消勾选
                                            if (onToggleAcceptanceTracking) {
                                              onToggleAcceptanceTracking(p.id, false, '');
                                            }
                                          } else {
                                            // 未勾选，弹出日期填写框
                                            setTrackingProjectId(p.id);
                                            setTrackingDate(new Date().toISOString().split('T')[0]);
                                            setShowTrackingModal(true);
                                          }
                                        }}
                                        className={`p-1.5 rounded-lg transition-all ${p.isAcceptanceTracking ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                        title={p.isAcceptanceTracking ? `已追踪 (${p.acceptanceTrackingDate || ''})` : '加入验收追踪'}
                                     >
                                        <svg className="w-4 h-4" fill={p.isAcceptanceTracking ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                     </button>
                                     <button
                                        onClick={() => onEdit(p)}
                                        className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-all"
                                        title="编辑项目"
                                     >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                     </button>
                                     <button
                                        onClick={() => {
                                          if (window.confirm(`确定要删除项目 "${p.projectName}" 吗？此操作不可撤销。`)) {
                                             onDelete(p.id);
                                          }
                                        }}
                                        className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-all"
                                        title="删除项目"
                                     >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                     </button>
                                  </div>
                               </td>
                           )}
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* 分页控件 */}
         <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
               {isAdmin && visibleColumns && onVisibleColumnsChange && (
                  <ColumnSelector
                     visibleColumns={visibleColumns}
                     onVisibleColumnsChange={onVisibleColumnsChange}
                     isTopBarLayout={true}
                     token={localStorage.getItem('authToken')}
                     isAdmin={isAdmin}
                     customColumns={customColumns}
                     onCustomColumnsChange={onCustomColumnsChange}
                  />
               )}
               <span className="text-sm font-black text-slate-600">每页显示</span>
               <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
               >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={100}>100</option>
               </select>
               <span className="text-sm font-bold text-slate-400">共 {projects.length} 条记录</span>
            </div>

            <div className="flex items-center gap-2">
               <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
               >
                  首页
               </button>
               <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
               >
                  上一页
               </button>

               <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                     let pageNum;
                     if (totalPages <= 5) {
                        pageNum = i + 1;
                     } else if (currentPage <= 3) {
                        pageNum = i + 1;
                     } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                     } else {
                        pageNum = currentPage - 2 + i;
                     }

                     return (
                        <button
                           key={pageNum}
                           onClick={() => setCurrentPage(pageNum)}
                           className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                              currentPage === pageNum
                                 ? 'bg-indigo-600 text-white shadow-md'
                                 : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                           }`}
                        >
                           {pageNum}
                        </button>
                     );
                  })}
               </div>

               <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
               >
                  下一页
               </button>
               <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
               >
                  末页
               </button>

               <span className="text-sm font-black text-slate-600 ml-2">
                  第 {currentPage} / {totalPages} 页
               </span>
            </div>
         </div>

         {/* 追踪验收日期填写模态框 */}
         {showTrackingModal && trackingProjectId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">加入验收追踪系统</h3>
                  <p className="text-sm text-slate-600 mb-4">请填写追踪验收的勾选日期：</p>
                  <input
                     type="date"
                     value={trackingDate}
                     onChange={(e) => setTrackingDate(e.target.value)}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-3 mt-6">
                     <button
                        onClick={() => {
                           setShowTrackingModal(false);
                           setTrackingProjectId(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
                     >
                        取消
                     </button>
                     <button
                        onClick={() => {
                           if (onToggleAcceptanceTracking && trackingDate) {
                              onToggleAcceptanceTracking(trackingProjectId, true, trackingDate);
                           }
                           setShowTrackingModal(false);
                           setTrackingProjectId(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all"
                     >
                        确认加入
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const App: React.FC = () => {
   const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [userDataScope, setUserDataScope] = useState<{ scope: 'all' | 'region' | 'own' | 'none'; region?: string | null; pmNames?: string[]; readOnly?: boolean }>({ scope: 'none' });
    const [activeNav, setActiveNav] = useState('Business_Data');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // 过滤导航项 - 根据用户权限
    const filteredNavItems = useMemo(() => {
      // 如果用户没有权限信息，尝试从 localStorage 获取
      let permissions = userPermissions;
      if (permissions.length === 0) {
        const permStr = localStorage.getItem('userPermissions');
        if (permStr) {
          try {
            const perms = JSON.parse(permStr);
            // 如果是对象数组，提取 code 字段；否则直接使用
            permissions = perms.map(p => p.code || p);
          } catch (e) {
            permissions = [];
          }
        }
      }

      // 如果没有认证信息，返回空数组（用户会被重定向到登录页）
      if (!isAuthenticated()) {
        return [];
      }

      // 检查用户是否有权限访问某个导航项
      const canAccessNav = (navId: string): boolean => {
        const requiredPerms = NAV_PERMISSION_MAP[navId];
        if (!requiredPerms) return true; // 未定义权限的导航项默认可访问

        // 如果权限数组为空但有认证，给予基本访问权限
        if (permissions.length === 0) {
          // 给予基本查看权限
          const basicPerms = ['project:view', 'dashboard:business'];
          return requiredPerms.some(perm => basicPerms.includes(perm));
        }

        // 用户只需拥有其中一个权限即可访问
        return requiredPerms.some(perm => permissions.includes(perm));
      };

      // 过滤主导航项
      return NAV_ITEMS.filter(item => {
        // 检查主导航项权限
        if (!canAccessNav(item.id)) return false;

        // 如果有子项，过滤子项
        if (item.children) {
          const filteredChildren = item.children.filter(child => canAccessNav(child.id));
          // 如果所有子项都被过滤掉，则隐藏父项
          return filteredChildren.length > 0;
        }

        return true;
      }).map(item => {
        // 复制并过滤子项
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => canAccessNav(child.id))
          };
        }
        return item;
      });
    }, [userPermissions]);

    // Load projects from database
    useEffect(() => {
       const loadData = async () => {
          setLoading(true);
          const result = await ProjectDataService.fetchAllProjects();
          if (result.success) {
             setProjects(result.data);
             setIsAdmin(!!result.isAdmin);

             // 加载用户权限信息
             const permStr = localStorage.getItem('userPermissions');
             const roleStr = localStorage.getItem('userRoles');
             if (permStr) {
               try {
                 const perms = JSON.parse(permStr);
                 // 如果是对象数组，提取 code 字段；否则直接使用
                 const permCodes = perms.map(p => p.code || p);
                 setUserPermissions(permCodes);
                 // 更新 localStorage 格式
                 localStorage.setItem('userPermissions', JSON.stringify(permCodes));
               } catch (e) {
                 console.error('解析权限数据失败:', e);
                 setUserPermissions([]);
               }
             }
             if (roleStr) {
               try {
                 const roles = JSON.parse(roleStr);
                 // 如果是对象数组，提取 name 字段；否则直接使用
                 const roleNames = roles.map(r => r.name || r);
                 setUserRoles(roleNames);
                 // 更新 localStorage 格式
                 localStorage.setItem('userRoles', JSON.stringify(roleNames));
               } catch (e) {
                 console.error('解析角色数据失败:', e);
                 setUserRoles([]);
               }
             }
             // 加载用户数据范围
             const scopeStr = localStorage.getItem('userDataScope');
             if (scopeStr) {
               try {
                 const scope = JSON.parse(scopeStr);
                 setUserDataScope(scope);
               } catch (e) {
                 console.error('解析数据范围失败:', e);
                 setUserDataScope({ scope: 'none' });
               }
             }
          }
          setLoading(false);
       };
       loadData();
    }, []);

   // 检查 URL 中的 projectId 参数，用于从其他页面跳转到项目详情
   useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('projectId');
      if (projectId && projects.length > 0) {
         const projectExists = projects.find(p => p.id === projectId);
         if (projectExists) {
            setActiveNav('Full_Information');
            setSelectedProjectId(projectId);
            // 清除 URL 参数
            window.history.replaceState({}, document.title, window.location.pathname);
         }
      }
   }, [projects]);

    const authenticated = isAuthenticated();
    const currentUser = getCurrentUser();

    const handleLogout = async () => {
       await logout();
       navigate('/login');
    };

    const handleInitializeData = async () => {
        if (!window.confirm('检测到项目库为空，是否将默认演示数据（60个项目）导入数据库？')) return;
        setLoading(true);
        const result = await ProjectDataService.batchImportProjects(MOCK_PROJECTS);
        if (result.success) {
            alert(`数据初始化成功！共导入 ${result.successCount} 个项目。`);
            const reload = await ProjectDataService.fetchAllProjects();
            if (reload.success) setProjects(reload.data);
        } else {
            alert('初始化数据失败，请重试。');
        }
        setLoading(false);
    };

    const [pmoFilters, setPmoFilters] = useState<FilterState>({
      regions: [],
      securityLevels: [],
      projectLevels: [],
      projectNatures: [],
      projectTypes: [],
      industries: [],
      acceptanceYears: [],
      isBenchmark: null,
      milestoneNodes: [],
      years: {},
      managers: [],
      directors: [],
      salesManagers: [],
      preSalesManagers: [],
      statusList: [],
      phases: [],
      changeTypes: [],
      contractRange: [null, null],
      budgetRange: [null, null],
      scoreRange: [null, null],
      preSalesScoreRange: [null, null],
      executionScoreRange: [null, null],
      isHighlight: null,
      kickoffDateRange: [null, null],
      plannedEndDateRange: [null, null],
      forecastAcceptanceDateRange: [null, null],
      acceptanceDateRange: [null, null],
      slipReceiveDateRange: [null, null],
      thanksLetterDateRange: [null, null],
      grossMarginRange: [null, null],
      budgetUsageRange: [null, null],
      inputPercentRange: [null, null],
      progressPercentRange: [null, null],
      plannedManHoursRange: [null, null],
      actualManHoursRange: [null, null],
      isConfirmed: null,
      hasChanges: null,
      hasOutsourcing: null,
      searchTerm: ''
   });
   const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
   const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
   const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'projectName',
    'projectCode',
    'region',
    'securityLevel',
    'level',
    'industry',
    'status',
    'projectManager',
    'projectCycle',
    'kickoffDate',
    'plannedEndDate',
    'acceptanceDate'
]);

   // 自定义列状态
   const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
   const [customColumnData, setCustomColumnData] = useState<{ [projectId: string]: ProjectCustomData }>({});

   // Derived Data for Filters
   const allData = useMemo(() => {
      const managers = Array.from(new Set(projects.map(p => p.members.projectManager))).filter(Boolean);
      const directors = Array.from(new Set(projects.map(p => p.members.projectDirector))).filter(Boolean);
      const sales = Array.from(new Set(projects.map(p => p.members.salesManager))).filter(Boolean);
      const preSales = Array.from(new Set(projects.map(p => p.members.preSalesManager))).filter(Boolean);
      const industries = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
      const years = Array.from(new Set(projects.map(p => p.timeline.acceptanceYear))).filter((y): y is string => Boolean(y)).sort();
      const natures = Array.from(new Set(projects.flatMap(p => p.nature))).filter(Boolean);
      const phases = Array.from(new Set(projects.map(p => p.phase))).filter(Boolean);
      const securityLevels = Array.from(new Set(projects.map(p => p.securityLevel))).filter(Boolean);
      const regions = MAJOR_REGIONS as Region[];

      return { managers, directors, sales, preSales, industries, years, natures, phases, securityLevels, regions };
   }, [projects]);

   // PMO-Specific Filtered Data
   const pmoFilteredProjects = useMemo(() => {
      return projects.filter(p => {
         const mappedPRegion = REGION_MAPPING[p.region] || p.region;
         if (pmoFilters.regions.length > 0 && !pmoFilters.regions.includes(mappedPRegion as Region)) return false;
         if (pmoFilters.securityLevels.length > 0 && !pmoFilters.securityLevels.includes(p.securityLevel)) return false;
         if (pmoFilters.projectLevels.length > 0 && !pmoFilters.projectLevels.includes(p.level)) return false;
         if (pmoFilters.projectTypes.length > 0 && !pmoFilters.projectTypes.includes(p.type)) return false;
         if (pmoFilters.industries.length > 0 && !pmoFilters.industries.includes(p.industry)) return false;
         if (pmoFilters.acceptanceYears.length > 0 && !pmoFilters.acceptanceYears.includes(p.timeline.acceptanceYear || '')) return false;
         if (pmoFilters.isBenchmark !== null && p.isBenchmark !== pmoFilters.isBenchmark) return false;
         if (pmoFilters.isHighlight !== null && p.isHighlight !== pmoFilters.isHighlight) return false;

         // 精准日期筛选 (AND)
         const checkDate = (d: string | undefined, r: [string | null, string | null]) => {
            if (r[0] === null && r[1] === null) return true;
            if (!d) return false;
            if (r[0] && d < r[0]) return false;
            if (r[1] && d > r[1]) return false;
            return true;
         };

         if (!checkDate(p.timeline.kickoffDate, pmoFilters.kickoffDateRange)) return false;
         if (!checkDate(p.timeline.plannedEndDate, pmoFilters.plannedEndDateRange)) return false;
         if (!checkDate(p.forecastAcceptanceDate, pmoFilters.forecastAcceptanceDateRange)) return false;
         if (!checkDate(p.timeline.acceptanceDate, pmoFilters.acceptanceDateRange)) return false;
         if (!checkDate(p.documentReceivedDate, pmoFilters.slipReceiveDateRange)) return false;
         if (!checkDate(p.receivedThankYouDate, pmoFilters.thanksLetterDateRange)) return false;

         // 数值范围筛选
         if (pmoFilters.contractRange[0] !== null && p.payment.contractAmount < pmoFilters.contractRange[0]) return false;
         if (pmoFilters.contractRange[1] !== null && p.payment.contractAmount > pmoFilters.contractRange[1]) return false;
         if (pmoFilters.budgetRange[0] !== null && p.budget.totalBudget < pmoFilters.budgetRange[0]) return false;
         if (pmoFilters.budgetRange[1] !== null && p.budget.totalBudget > pmoFilters.budgetRange[1]) return false;

         // 分数范围筛选
         const totalScore = p.ratings.qualityScoreRaw + p.ratings.preSalesTotal + p.ratings.executionTotal;
         if (pmoFilters.scoreRange[0] !== null && totalScore < pmoFilters.scoreRange[0]) return false;
         if (pmoFilters.scoreRange[1] !== null && totalScore > pmoFilters.scoreRange[1]) return false;

         const preSalesScore = p.ratings.preSalesTotal;
         if (pmoFilters.preSalesScoreRange[0] !== null && preSalesScore < pmoFilters.preSalesScoreRange[0]) return false;
         if (pmoFilters.preSalesScoreRange[1] !== null && preSalesScore > pmoFilters.preSalesScoreRange[1]) return false;

         const executionScore = p.ratings.executionTotal;
         if (pmoFilters.executionScoreRange[0] !== null && executionScore < pmoFilters.executionScoreRange[0]) return false;
         if (pmoFilters.executionScoreRange[1] !== null && executionScore > pmoFilters.executionScoreRange[1]) return false;

         // 毛利率范围
         if (pmoFilters.grossMarginRange[0] !== null && p.marginRate && parseFloat(p.marginRate) < pmoFilters.grossMarginRange[0]) return false;
         if (pmoFilters.grossMarginRange[1] !== null && p.marginRate && parseFloat(p.marginRate) > pmoFilters.grossMarginRange[1]) return false;

         // 预算使用情况范围
         if (p.budget?.budgetUsedAmount && p.budget.totalBudget) {
            const usagePercent = (p.budget.budgetUsedAmount / p.budget.totalBudget) * 100;
            if (pmoFilters.budgetUsageRange[0] !== null && usagePercent < pmoFilters.budgetUsageRange[0]) return false;
            if (pmoFilters.budgetUsageRange[1] !== null && usagePercent > pmoFilters.budgetUsageRange[1]) return false;
         }

         // 投入/进度百分比范围
         if (pmoFilters.inputPercentRange[0] !== null && p.execution.inputPercent && p.execution.inputPercent < pmoFilters.inputPercentRange[0]) return false;
         if (pmoFilters.inputPercentRange[1] !== null && p.execution.inputPercent && p.execution.inputPercent > pmoFilters.inputPercentRange[1]) return false;

         if (pmoFilters.progressPercentRange[0] !== null && p.execution.progress && p.execution.progress < pmoFilters.progressPercentRange[0]) return false;
         if (pmoFilters.progressPercentRange[1] !== null && p.execution.progress && p.execution.progress > pmoFilters.progressPercentRange[1]) return false;

         // 计划/实际工时范围
         if (pmoFilters.plannedManHoursRange[0] !== null && p.manHours.plannedTotal < pmoFilters.plannedManHoursRange[0]) return false;
         if (pmoFilters.plannedManHoursRange[1] !== null && p.manHours.plannedTotal > pmoFilters.plannedManHoursRange[1]) return false;

         if (pmoFilters.actualManHoursRange[0] !== null && p.manHours.pmoAnnualTotal < pmoFilters.actualManHoursRange[0]) return false;
         if (pmoFilters.actualManHoursRange[1] !== null && p.manHours.pmoAnnualTotal > pmoFilters.actualManHoursRange[1]) return false;

         // 年度收入范围
         // 单项筛选
         if (pmoFilters.statusList.length > 0 && !pmoFilters.statusList.includes(p.status)) return false;
         if (pmoFilters.phases.length > 0 && !pmoFilters.phases.includes(p.phase)) return false;
         if (pmoFilters.milestoneNodes && pmoFilters.milestoneNodes.length > 0 && p.milestoneNode) {
           // 将英文 milestoneNode 转换为中文标签进行匹配
           const milestoneLabel = MILESTONE_NODE_LABELS[p.milestoneNode as MilestoneNode] || p.milestoneNode;
           if (!pmoFilters.milestoneNodes.includes(milestoneLabel)) return false;
         }

         if (pmoFilters.isConfirmed !== null && pmoFilters.isConfirmed !== p.payment.isConfirmed) return false;
         if (pmoFilters.hasChanges !== null && pmoFilters.hasChanges !== (p.changes.length > 0)) return false;
         if (pmoFilters.hasOutsourcing !== null && pmoFilters.hasOutsourcing !== !!p.outsourcerName) return false;

         // Search Term Filter (支持多关键词空格分隔，AND逻辑)
         if (pmoFilters.searchTerm.trim()) {
            const keywords = pmoFilters.searchTerm.trim().split(/\s+/).filter(k => k.length > 0);

            // 构建汇总搜索字符串 (小写化处理以支持不区分大小写)
            const searchFields = [
               p.projectName,
               p.projectCode,
               p.region,
               p.status,
               p.phase,
               p.members.projectManager,
               p.members.salesManager,
               p.members.preSalesManager,
               p.members.projectDirector,
               p.level,
               p.type,
               p.industry,
               p.payment.contractName,
               p.payment.groupCompany,
               p.remarks || '',
               p.securityLevel || '',
               p.timeline.acceptanceYear || ''
            ].filter(Boolean).join(' ').toLowerCase();

            // 所有关键词都要匹配（AND逻辑，不区分大小写）
            const matches = keywords.every(keyword =>
               searchFields.includes(keyword.toLowerCase())
            );

            if (!matches) return false;
         }

         return true;
      });
   }, [projects, pmoFilters]);

   // 应用数据范围过滤 - 根据用户角色过滤可见项目
   const dataScopedProjects = useMemo(() => {
      // 使用状态中的数据范围
      const scope = userDataScope;

      // 如果数据范围是 'all'，返回全部已筛选的项目
      if (scope.scope === 'all') {
         return pmoFilteredProjects;
      }

      // 如果数据范围是 'region'，按区域过滤
      if (scope.scope === 'region' && scope.region) {
         return pmoFilteredProjects.filter(p => {
            const projectRegion = p.region || '';
            // 使用包含匹配，支持子区域
            return projectRegion.includes(scope.region!) || scope.region!.includes(projectRegion);
         });
      }

      // 如果数据范围是 'own'，按项目经理过滤
      if (scope.scope === 'own' && scope.pmNames && scope.pmNames.length > 0) {
         return pmoFilteredProjects.filter(p => {
            const pm = p.members?.projectManager || '';
            return scope.pmNames!.some(name => pm.includes(name) || name.includes(pm));
         });
      }

      // 其他情况返回空数组
      return [];
   }, [pmoFilteredProjects, userDataScope]);

   // Find selected project
   const selectedProject = useMemo(() => {
      return projects.find(p => p.id === selectedProjectId) || null;
   }, [projects, selectedProjectId]);

   // Handle project operations
   const handleCreateProject = async (newProject: Project) => {
      // 新项目默认保存"正在进行"状态，系统会自动根据日期计算实际状态
      const projectToSave = { ...newProject };
      if (
         newProject.status !== ProjectStatus.Paused &&
         newProject.status !== ProjectStatus.Accepted
      ) {
         projectToSave.status = ProjectStatus.Ongoing; // 默认状态
      }

      const result = await ProjectDataService.createProject(projectToSave);
      if (result.success && result.data) {
         setProjects(prev => [result.data!, ...prev]);
         setIsFormModalOpen(false);
      } else {
         alert(result.error || '创建项目失败');
      }
   };

   // 专门处理里程碑数据更新（不调用项目更新API，只更新前端state）
   const handleUpdateMilestoneData = (projectId: string, milestoneNodeData: Record<string, MilestoneDateInfo>) => {
      setProjects(prev => prev.map(p => {
         if (p.id === projectId) {
            return {
               ...p,
               milestoneNodeData
            };
         }
         return p;
      }));
   };

   const handleUpdateProject = async (updatedProject: Project) => {
      const projectToSave = { ...updatedProject };
      const currentProject = projects.find(p => p.id === updatedProject.id);

      // 验收日期处理逻辑：
      // 1. 如果当前状态是"已验收"，必须填写验收日期
      const isAcceptedStatus = updatedProject.status === ProjectStatus.Accepted;
      if (isAcceptedStatus && !updatedProject.timeline?.acceptanceDate?.trim()) {
        alert('项目状态为"已验收"时，实际验收日期为必填项！');
        return;
      }

      // 2. 如果状态改为非"已验收"，清空验收日期
      if (!isAcceptedStatus && updatedProject.timeline?.acceptanceDate) {
        projectToSave.timeline = { ...updatedProject.timeline, acceptanceDate: '' };
      }

      const result = await ProjectDataService.updateProject(updatedProject.id, projectToSave);
      if (result.success && result.data) {
         setProjects(prev => prev.map(p => p.id === updatedProject.id ? result.data! : p));
         setEditingProject(null);
         if (selectedProjectId === updatedProject.id) {
            setSelectedProjectId(result.data.id);
         }
      } else {
         alert(result.error || '更新项目失败');
      }
   };

   const handleDeleteProject = async (id: string) => {
      const result = await ProjectDataService.deleteProject(id);
      if (result.success) {
         setProjects(prev => prev.filter(p => p.id !== id));
         if (selectedProjectId === id) setSelectedProjectId(null);
      } else {
         alert(result.error || '删除项目失败');
      }
   };

   // 处理追踪验收切换
   const handleToggleAcceptanceTracking = async (projectId: string, isTracking: boolean, trackingDate: string) => {
      try {
         const response = await fetch(`${API_BASE_URL}/acceptance-tracking/projects/${projectId}/toggle`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isTracking, trackingDate }),
         });
         const result = await response.json();

         if (result.success) {
            // 更新本地项目状态
            setProjects(prev => prev.map(p => {
               if (p.id === projectId) {
                  return {
                     ...p,
                     isAcceptanceTracking: isTracking,
                     acceptanceTrackingDate: isTracking ? trackingDate : '',
                  };
               }
               return p;
            }));
         } else {
            alert(result.error || '操作失败');
         }
      } catch (error) {
         console.error('追踪验收切换失败:', error);
         alert('操作失败');
      }
   };

    // Handle data refresh
    const refreshData = async () => {
       setLoading(true);
       const result = await ProjectDataService.fetchAllProjects();
       if (result.success) {
          setProjects(result.data);
          setIsAdmin(!!result.isAdmin);
       }

       // 加载自定义列和数据
       const customColumnsResult = await ProjectDataService.fetchCustomColumns();
       if (customColumnsResult.success) {
          setCustomColumns(customColumnsResult.data);
       }

       const customDataResult = await ProjectDataService.fetchCustomColumnData();
       if (customDataResult.success) {
          // 将数据转换为按项目ID索引的对象
          const dataMap: { [projectId: string]: ProjectCustomData } = {};
          customDataResult.data.forEach((item: CustomDataItem) => {
             if (!dataMap[item.project_id]) {
                dataMap[item.project_id] = {};
             }
             dataMap[item.project_id][item.column_key] = item.value;
          });
          setCustomColumnData(dataMap);
       }

       setLoading(false);
    };

   // Auto-select first submenu item when clicking main menu
   useEffect(() => {
      if (activeNav === 'PMO_Project_Management') {
         setActiveNav('Progress_Monitor');
      }
   }, [activeNav]);

   return (
      <Routes>
         <Route path="/login" element={<LoginPage />} />
         <Route
            path="/*"
            element={
               <ProtectedRoute>
                  <div className="flex h-screen bg-slate-50 overflow-hidden">
         {/* Sidebar */}
         <Sidebar
            navItems={filteredNavItems}
            activeNav={activeNav}
            isCollapsed={isSidebarCollapsed}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onNavChange={(navId) => {
               // If main menu clicked, navigate to first submenu item
               if (navId === 'PMO_Project_Management') {
                  setActiveNav('Progress_Monitor');
               } else {
                  setActiveNav(navId);
               }
            }}
         />

         <main className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
               <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-medium text-slate-800 tracking-tight">
                     {filteredNavItems.find(n => n.id === activeNav)?.label || filteredNavItems.flatMap(n => n.children || []).find(c => c?.id === activeNav)?.label}
                  </h2>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <span className="text-xs font-bold text-slate-400">
                     总项目数: {activeNav === 'Full_Information' || activeNav === 'PMO' ? dataScopedProjects.length : projects.length}
                  </span>
               </div>
               <div className="flex items-center space-x-4">
                  {/* 智能报告按钮 */}
                  {isAdmin && (
                     <button
                        onClick={() => setActiveNav('Report_Generator')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${activeNav === 'Report_Generator'
                           ? 'bg-indigo-100 text-indigo-600'
                           : 'text-slate-600 hover:bg-slate-100'}`}
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-medium">智能报告</span>
                     </button>
                  )}

                  {/* 系统配置按钮 */}
                  <button
                     onClick={() => setActiveNav('System_Config')}
                     className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${activeNav === 'System_Config'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>
                     <span className="text-sm font-medium">系统配置</span>
                  </button>

                  {currentUser && (
                     <>
                        <span className="text-sm text-slate-600">
                           {currentUser.name} ({currentUser.username})
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                           {currentUser.role === 'admin' ? '管理员' : '用户'}
                        </span>
                        <button
                           onClick={handleLogout}
                           className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                           退出登录
                        </button>
                     </>
                  )}
               </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
               {activeNav === 'Business_Data' && (
                  <DecisionDashboard
                     projects={dataScopedProjects}
                     onNavigateToProject={setSelectedProjectId}
                     onFilterByRegion={() => { }}
                     onDrillDown={setDrillDownData}
                  />
               )}

               {/* 项目信息大图 */}
               {(activeNav === 'Full_Information' || activeNav === 'PMO') && (
                  <div className="h-full flex flex-col space-y-3 relative">
                     <div className="flex flex-col space-y-3 px-2 shrink-0">

                        {/* 统一搜索过滤中心 */}
                        <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-full border border-slate-200 shadow-sm w-fit">
                           {/* 快速搜索：始终显示，支持多维度关键字 */}
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                 <svg className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                 </svg>
                              </div>
                              <input
                                 type="text"
                                 value={pmoFilters.searchTerm}
                                 onChange={(e) => setPmoFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                 placeholder="全局关键字搜索..."
                                 className="pl-10 pr-4 py-1.5 h-8 text-[16px] font-bold bg-white border border-transparent rounded-full w-44 lg:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                              />
                           </div>

                           <div className="h-4 w-px bg-slate-200 mx-1"></div>

                            {/* 高级搜索按钮：带状态指示 */}
                            <button
                               onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                               className={`flex items-center space-x-2 px-4 h-8 rounded-full transition-all text-[16px] font-black uppercase tracking-wider ${(isAdvancedSearchOpen ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-indigo-600')}`}
                            >
                               <span>高级搜索</span>
                               <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${(pmoFilters.regions.length > 0 ||
                                  pmoFilters.projectTypes.length > 0 ||
                                  (pmoFilters.milestoneNodes?.length || 0) > 0 ||
                                  pmoFilters.contractRange[0] !== null ||
                                  pmoFilters.contractRange[1] !== null ||
                                  pmoFilters.searchTerm.trim() !== ''
                                  ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500')}`}>
                                  {pmoFilters.regions.length +
                                   pmoFilters.projectTypes.length +
                                   (pmoFilters.milestoneNodes?.length || 0) +
                                   (pmoFilters.contractRange[0] !== null ? 1 : 0) +
                                   (pmoFilters.contractRange[1] !== null ? 1 : 0) +
                                   (pmoFilters.searchTerm.trim() !== '' ? 1 : 0)}
                               </span>
                            </button>
                            {isAdmin && projects.length === 0 && (
                               <button
                                  onClick={handleInitializeData}
                                  className="flex items-center space-x-2 px-3 h-8 rounded-full bg-indigo-50 text-indigo-600 text-[16px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-200 ml-2"
                               >
                                  <span>初始化演示数据</span>
                               </button>
                            )}

                            {isAdmin && (
                               <>
                                  <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                  <button
                                     onClick={() => {
                                        setEditingProject(null);
                                        setIsFormModalOpen(true);
                                     }}
                                     className="flex items-center space-x-2 px-4 h-8 rounded-full bg-emerald-600 text-white text-[16px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                                  >
                                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                     </svg>
                                     <span>新增项目</span>
                                  </button>
                               </>
                            )}
                         </div>
                      </div>

                     <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

                     {/* 高级搜索下拉面板 */}
                     {isAdvancedSearchOpen && (
                        <AdvancedSearchDropdown
                           isOpen={true}
                           filters={pmoFilters}
                           onFilterUpdate={setPmoFilters}
                           allData={allData}
                           onClose={() => setIsAdvancedSearchOpen(false)}
                        />
                     )}

                     <OverviewTable
                        projects={dataScopedProjects}
                        selectedId={selectedProjectId}
                        onToggleDetail={setSelectedProjectId}
                        onEdit={(p) => {
                           setEditingProject(p);
                           setIsFormModalOpen(true);
                        }}
                        onDelete={handleDeleteProject}
                        isAdmin={isAdmin}
                        onRefresh={refreshData}
                        visibleColumns={visibleColumns}
                        onVisibleColumnsChange={setVisibleColumns}
                        customColumns={customColumns}
                        customColumnData={customColumnData}
                        onCustomColumnValueChange={async (projectId, columnKey, value) => {
                           const result = await ProjectDataService.updateCustomColumnValue(projectId, columnKey, value);
                           if (result.success) {
                              setCustomColumnData(prev => ({
                                 ...prev,
                                 [projectId]: {
                                    ...(prev[projectId] || {}),
                                    [columnKey]: value
                                 }
                              }));
                           }
                        }}
                        onCustomColumnsChange={setCustomColumns}
                        onToggleAcceptanceTracking={handleToggleAcceptanceTracking}
                     />
                  </div>
               )}

               {/* 验收追踪看板 */}
               {activeNav === 'Acceptance_Tracking' && (
                  <AcceptanceTrackingDashboard
                     allProjects={projects}
                     isAdmin={isAdmin}
                  />
               )}

               {/* 亮点工程展示 */}
               {activeNav === 'Highlight_Display' && (
                  <div className="h-full flex flex-col">
                     <HighlightPage />
                  </div>
               )}

               {/* 项目经理档案 */}
               {activeNav === 'PM_Profile' && (
                  <ProjectManagerProfilePage
                     projects={dataScopedProjects}
                     onNavigateToProject={setSelectedProjectId}
                     isAdmin={isAdmin}
                  />
               )}

               {/* 进度监控 */}
               {activeNav === 'Progress_Monitor' && (
                  <div className="h-full flex flex-col">
                     <ProgressMonitorPage
                        projects={dataScopedProjects}
                        onNavigateToProject={setSelectedProjectId}
                        onUpdateMilestoneData={handleUpdateMilestoneData}
                     />
                  </div>
               )}

               {/* 成本监控 */}
               {activeNav === 'Cost_Monitor' && (
                  <div className="h-full flex flex-col">
                     <CostMonitorPage
                        projects={dataScopedProjects}
                        onNavigateToProject={setSelectedProjectId}
                     />
                  </div>
               )}

               {/* 变更管理 */}
               {activeNav === 'Change_Management' && (
                  <div className="h-full flex flex-col">
                     <ChangeManagementPage projects={dataScopedProjects} />
                  </div>
               )}

               {/* 风险预警 */}
               {activeNav === 'Risk_Warning' && (
                  <div className="h-full flex flex-col">
                     <RiskWarningPage
                        projects={dataScopedProjects}
                        onNavigateToProject={setSelectedProjectId}
                     />
                  </div>
               )}

               {/* 区域经营看板 */}
               {activeNav === 'Regional_Dashboard' && (
                  <RegionalDashboardPage
                     projects={dataScopedProjects}
                     onNavigateToProject={setSelectedProjectId}
                  />
               )}

               {/* 项目经理个人看板 */}
               {activeNav === 'PM_Personal_Dashboard' && (
                  <PMPersonalDashboardPage
                     projects={dataScopedProjects}
                     onNavigateToProject={setSelectedProjectId}
                     isAdmin={isAdmin}
                  />
               )}

               {/* 项目成果看板 */}
               {activeNav === 'Project_Result' && (
                  <ProjectResultPage />
               )}

               {/* 智能报告生成 */}
               {activeNav === 'Report_Generator' && (
                  <ReportGeneratorPage isAdmin={isAdmin} />
               )}

               {/* 系统配置 */}
               {activeNav === 'System_Config' && (
                  <div className="h-full flex flex-col">
                     <SystemConfigPage isAdmin={isAdmin} />
                  </div>
               )}

            </div>

            {/* Overlays */}
            {selectedProjectId && selectedProject && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setSelectedProjectId(null)}></div>
                  <div className="relative w-full max-w-[90vw] max-h-[90vh] bg-white rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 overflow-hidden flex flex-col">
                    <ProjectDetailPanel
                        project={selectedProject}
                        onClose={() => setSelectedProjectId(null)}
                        onUpdate={handleUpdateProject}
                        isAdmin={isAdmin}
                        onEdit={(p) => {
                           setEditingProject(p);
                           setIsFormModalOpen(true);
                           setSelectedProjectId(null); // Close panel when editing
                        }}
                     />
                  </div>
               </div>
            )}

            {drillDownData && (
               <DrillDownModal
                  data={drillDownData}
                  onClose={() => setDrillDownData(null)}
                  onNavigateToProject={(id) => {
                     setDrillDownData(null);
                     setSelectedProjectId(id);
                  }}
               />
            )}

            {/* 项目表单模态框 - 新增/编辑项目 */}
            {isFormModalOpen && (
               <ProjectFormModal
                  isOpen={isFormModalOpen}
                  onClose={() => {
                     setIsFormModalOpen(false);
                     setEditingProject(null);
                  }}
                  onSave={editingProject ? handleUpdateProject : handleCreateProject}
                  initialData={editingProject}
                  title={editingProject ? '编辑项目' : '新增项目'}
               />
            )}
         </main>

      </div>
               </ProtectedRoute>
            }
         />
      </Routes>
   );
};

export default App;