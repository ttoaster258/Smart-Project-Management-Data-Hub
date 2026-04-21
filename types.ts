
export enum ProjectStatus {
  Ongoing = '正在进行',
  Delayed = '延期',
  Accepted = '已验收',
  Paused = '暂停'
}

// 里程碑节点枚举（13个节点）
export enum MilestoneNode {
  EarlyQuote = 'early_quote', // 早期报价
  LevelDetermined = 'level_determined', // 级别确定
  RequirementEvaluation = 'requirement_evaluation', // 需求评估
  QuoteApproval = 'quote_approval', // 报价审批
  ProjectBidding = 'project_bidding', // 项目投标
  TaskApproval = 'task_approval', // 任务书审批
  ContractApproval = 'contract_approval', // 合同审批
  ProjectStart = 'project_start', // 项目启动
  PlanBudget = 'plan_budget', // 计划预算
  OverviewSolution = 'overview_solution', // 概要方案
  DetailedSolution = 'detailed_solution', // 详细方案
  InternalAcceptance = 'internal_acceptance', // 内部验收
  Accepted = 'accepted' // 已验收
}

// 回款节点接口
export interface PaymentNode {
  id?: string;             // 节点ID（编辑时需要）
  nodeName: string;        // 回款节点名称
  expectedAmount: number;  // 应回款额度
  actualAmount: number;    // 实际回款额度
  paymentDate: string;     // 回款时间
}

// 里程碑节点中文映射
export const MILESTONE_NODE_LABELS: Record<MilestoneNode, string> = {
  [MilestoneNode.EarlyQuote]: '早期报价',
  [MilestoneNode.LevelDetermined]: '级别确定',
  [MilestoneNode.RequirementEvaluation]: '需求评估',
  [MilestoneNode.QuoteApproval]: '报价审批',
  [MilestoneNode.ProjectBidding]: '项目投标',
  [MilestoneNode.TaskApproval]: '任务书审批',
  [MilestoneNode.ContractApproval]: '合同审批',
  [MilestoneNode.ProjectStart]: '项目启动',
  [MilestoneNode.PlanBudget]: '计划预算',
  [MilestoneNode.OverviewSolution]: '概要方案',
  [MilestoneNode.DetailedSolution]: '详细方案',
  [MilestoneNode.InternalAcceptance]: '内部验收',
  [MilestoneNode.Accepted]: '已验收'
};

// 里程碑节点选项列表（按顺序，13个完整节点）
export const MILESTONE_NODE_OPTIONS: { value: MilestoneNode; label: string }[] = [
  { value: MilestoneNode.EarlyQuote, label: '早期报价' },
  { value: MilestoneNode.LevelDetermined, label: '级别确定' },
  { value: MilestoneNode.RequirementEvaluation, label: '需求评估' },
  { value: MilestoneNode.QuoteApproval, label: '报价审批' },
  { value: MilestoneNode.ProjectBidding, label: '项目投标' },
  { value: MilestoneNode.TaskApproval, label: '任务书审批' },
  { value: MilestoneNode.ContractApproval, label: '合同审批' },
  { value: MilestoneNode.ProjectStart, label: '项目启动' },
  { value: MilestoneNode.PlanBudget, label: '计划预算' },
  { value: MilestoneNode.OverviewSolution, label: '概要方案' },
  { value: MilestoneNode.DetailedSolution, label: '详细方案' },
  { value: MilestoneNode.InternalAcceptance, label: '内部验收' },
  { value: MilestoneNode.Accepted, label: '已验收' }
];

// 关键里程碑节点（5个，用于质量风险判断等重点监控）
export const CRITICAL_MILESTONES: MilestoneNode[] = [
  MilestoneNode.LevelDetermined,   // 级别确定
  MilestoneNode.ProjectStart,      // 项目启动
  MilestoneNode.PlanBudget,        // 计划预算
  MilestoneNode.OverviewSolution,  // 概要方案
  MilestoneNode.InternalAcceptance // 内部验收
];

// Simplified to string to accept raw Excel values
export type ProjectPhase = string;

export enum ProjectType {
  Sales = '销售项目',
  Dev = '开发项目',
  Mixed = '混合项目',
  Internal = '内部项目',
  Other = '其他项目'
}

export type ProjectNature = string;

// 项目性质选项（多选）
export const PROJECT_NATURE_OPTIONS = [
  '建模开发',
  '软件开发',
  '产品销售',
  '综合',
  '采购',
  '其他'
] as const;

// 项目验收风险等级选项
export const ACCEPTANCE_RISK_LEVELS = [
  '高风险',
  '中风险',
  '低风险',
  '无风险'
] as const;

export enum ProjectLevel {
  Major = '重大项目（B类项目）',
  Priority = '重点项目（C类项目）',
  Regular = '常规项目（D类项目）',
  Critical = '核心项目（A类项目）'
}

export enum Region {
  East = '东区',
  South = '南区',
  West = '西区',
  NorthCentral = '北区（华中）',
  NorthNortheast = '北区（华北，东北）',
  InnovationTrans = '创景可视（内转）'
}

export const PRIMARY_REGIONS = [
  '东区',
  '南区',
  '西区',
  '北区（华中）',
  '北区（华北，东北）',
  '创景可视（内转）'
];

export const MAJOR_REGIONS = [
  '东区',
  '南区',
  '西区',
  '北区（华中）',
  '北区（华北，东北）',
  '创景可视（内转）'
];

export const REGION_MAPPING: Record<string, string> = {
  // 西区相关
  '西区': '西区',
  '西区（西北）': '西区',
  '西区（西南）': '西区',

  // 北区相关
  '北区（华中）': '北区（华中）',
  '北区（华北，东北）': '北区（华北，东北）',
  '华北': '北区（华北，东北）',
  '东北': '北区（华北，东北）',
  '华中': '北区（华中）',

  // 其他
  '东区': '东区',
  '南区': '南区',
  '创景可视（内转）': '创景可视（内转）',
  '创景可视': '创景可视（内转）',
  '总部': '东区'
};


export enum OutsourcingType {
  Hardware = '硬件设备',
  Supplier = '供应商外协',
  ThirdParty = '第三方测评',
  Other = '其他'
}

export interface OutsourcingItem {
  id: string;
  type: OutsourcingType;
  name: string;
  spec: string;
  quantity: number;
  supplier: string;
  totalAmount: number;
}

export type MilestoneStatus = 'completed' | 'processing' | 'pending' | 'delayed';

export interface MilestoneDateInfo {
  plannedDate?: string;
  actualDate?: string;
}

export interface MilestoneNodeItem {
  id: string;
  name: string;
  status: MilestoneStatus;
  actualDate?: string; // Used for Market & Implementation
  plannedDate?: string; // Used primarily for Implementation
  isKeyNode?: boolean;
}

export interface ProjectMilestones {
  market: MilestoneNodeItem[];
  implementation: MilestoneNodeItem[];
  external: MilestoneNodeItem[];
}

export interface ProjectTimeline {
  acceptanceDate: string;
  kickoffDate: string;
  plannedEndDate: string;
  contractEndDate: string;
  delayMonths: number;
  acceptanceYear?: string;
  acceptanceControl?: string; // New field: 可控 / 不可控
}

export interface ProjectBudget {
  totalBudget: number;         // 预算总金额
  human: number;               // 预算-人力
  travel: number;              // 预算-差旅
  outsourcing: number;         // 预算-外协
  procurement: number;         // 预算-采购
  business: number;            // 预算-商务
  risk: number;                // 预算-风险
  review: number;              // 预算-评审
  other: number;               // 预算-其他

  // ===== 新增字段 =====
  initialQuote: number;        // 初步报价
  reqEvaluationFee: number;    // 需求评估费
  internalCost: number;        // 内部预估成本
  internalProfit: number;      // 内部预估利润

  budgetUsedAmount: number;    // For dashboard calc
  outsourcingItems: OutsourcingItem[];
}

export interface ProjectPayment {
  contractName: string;        // 合同名称
  groupCompany: string;        // 集团公司
  contractAmount: number;      // 合同金额
  historicalPaid: number;      // 历史回款
  paid2026: number;            // 2026年回款
  pending: number;             // 剩余回款金额 (Total Pending)
  pendingThisYear: number;     // 2025年待回款 (New field)
  ratio: number;               // 回款比例
  totalPaid: number;           // Helper for dashboard (can be same as paid2026 + historical)

  // ===== 新增确认收入相关字段 =====
  isConfirmed: boolean;           // 是否已确认收入
  confirmedDate?: string;         // 确认收入日期

  // ===== 新增回款节点数组 =====
  paymentNodes: PaymentNode[];    // 回款节点列表

  // ===== 原有字段（从 paymentNodes 计算得出，保持向后兼容） =====
  annualConfirmedRevenue: number;        // 全年已确认收入
  acceptedPendingRevenue: number;        // 已验收待确认收入
}

export interface PersonMonthlyHours {
  name: string;
  role: string;
  monthly: number[];
}

export interface ProjectManHours {
  plannedTotal: number;        // 项目整体计划总工时 (人周)
  pmoAnnualTotal: number;      // PMO统计项目整体实际工时总和 (人周)
  personnelDetails: PersonMonthlyHours[];
}

export interface ProjectRatings {
  preSalesTotal: number;
  executionTotal: number;
  qualityScoreRaw: number; // New: 原始15分制
  preSalesHard: { category: string; score: number }[];
  preSalesSoft: { category: string; score: number }[];
  executionHard: { category: string; score: number }[];
  executionSoft: { category: string; score: number }[];
}

export interface ProjectChange {
  id: number;
  projectId: string;
  projectName?: string;
  projectManager?: string;
  type: ChangeType;
  reasonCategory: ReasonCategory;
  reason: string;
  content: string;
  impactsPerformance: boolean;
  changeDate: string;
  changeCount: number;
  before?: string;
  after?: string;
  // 变更前后对比字段
  oldProjectManager?: string;
  newProjectManager?: string;
  oldBudgetTotal?: number;
  newBudgetTotal?: number;
  oldProjectCycle?: string;
  newProjectCycle?: string;
}

// 变更类型枚举
export enum ChangeType {
  Personnel = '人员变更',
  Budget = '预算变更',
  Schedule = '进度变更'
}

// 变更原因概括枚举
export enum ReasonCategory {
  External = '外部原因',
  Internal = '内部原因',
  Comprehensive = '综合原因'
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface ProjectMember {
  projectManager: string;
  preSalesManager: string;
  salesManager: string;
  projectDirector: string;
  teamMembers: TeamMember[];
}

export interface ProjectExecution {
  progress: number;            // 项目整体进度百分比(%) - Gray Column
  inputPercent: number;        // 项目整体投入百分比(%) - Gray Column
}

export interface QualityRiskDetail {
  node: string;                // 里程碑节点名称
  type: '超期' | '遗漏';       // 风险类型
  days?: number;               // 超期天数（仅超期类型有）
}

export interface QualityRisks {
  riskLevel: '高' | '中' | '低' | null;  // 风险等级
  riskDetails: QualityRiskDetail[];       // 风险详情
}

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  securityLevel: string;
  status: ProjectStatus;
  statusComment: string;
  riskReason?: string; // Added field for specific risk categorization
  milestoneNode?: MilestoneNode; // 里程碑节点
  milestoneNodeData?: Record<string, MilestoneDateInfo>; // 存储13个节点的计划和实际时间

  // ===== 项目里程碑管理 (2个字段) =====
  forecastAcceptanceDate?: string;        // 预测验收时间
  mainWorkCompleted?: string;             // 主体工作是否完成

  // ===== 财务健康度扩展 (1个字段) =====
  budgetUsage?: string;                   // 预算使用情况(%)
  marginRate?: string;                    // 毛利率(%)

  // ===== 项目变更统计 (2个字段) =====
  changeCount?: number;                   // 变更次数
  lastChangeDate?: string;                // 最近变更通过时间

  // ===== 项目周期 (1个字段) =====
  projectCycle?: string;                  // 项目周期（格式：YYYY-MM 至 YYYY-MM）

  // ===== 合同与收入管理 (2个字段) =====
  forecast2026Revenue?: number;           // 预测2026年可获收入
  forecast2026LossRevenue?: number;       // 预测2026年无法获收入

  // ===== 外协采购管理 (5个字段) =====
  outsourcerName?: string;                // 外协单位名称
  outsourcerAmount?: number;              // 外协采购金额
  outsourcerTechContent?: string;         // 外协主要技术内容
  equipmentSpec?: string;                 // 采购设备规格内容
  outsourcerRatio?: string;               // 外协采购费用占比

  // ===== 新增字段 =====
  receivedThankYouDate?: string;          // 感谢信接收时间
  documentReceivedDate?: string;           // 验收单获取时间
  remarks?: string;                       // 备注
  projectHighlight?: string;              // 项目亮点（标杆/亮点项目必填，最多500字）

  // ===== 项目验收风险等级 =====
  acceptanceRiskLevel?: string;           // 项目验收风险等级（高风险、中风险、低风险、无风险）

  // ===== 项目性质（多选） =====
  projectNature?: string[];               // 项目性质（建模开发、软件开发、产品销售、综合、采购、其他）

  // ===== 验收追踪系统专属字段 =====
  isAcceptanceTracking?: boolean;         // 是否追踪验收
  acceptanceTrackingDate?: string;        // 追踪验收勾选时间
  trackingAcceptanceRisk?: string;        // 验收追踪-验收风险（高/中/低/无/已验收）
  trackingRevenueRisk?: string;           // 验收追踪-确认收入风险（高/中/低/无/已确认）
  isNewTracking?: boolean;                // 是否为新增追踪项目
  solutionMeasures?: string;              // 解决措施

  phase: string;
  type: string;
  nature: string[];
  level: string;
  industry: string;
  region: Region;
  isBenchmark: boolean;
  isHighlight: boolean;
  timeline: ProjectTimeline;
  milestones: ProjectMilestones;
  budget: ProjectBudget;
  payment: ProjectPayment;
  manHours: ProjectManHours;
  execution: ProjectExecution; // Added Execution Section
  ratings: ProjectRatings;
  changes: ProjectChange[];
  members: ProjectMember;
  qualityRisks?: QualityRisks;  // 质量风险（基于里程碑判定）
}

export interface FilterState {
  regions: Region[];
  securityLevels: string[];
  projectLevels: string[];
  projectNatures: string[];
  projectTypes: string[];
  industries: string[];
  acceptanceYears: string[];
  isBenchmark: boolean | null;
  milestoneNodes?: string[]; // 里程碑节点筛选（存储中文标签）
  years: Record<string, number[]>;
  managers: string[];
  directors: string[];
  salesManagers: string[];
  preSalesManagers: string[];
  statusList: ProjectStatus[];
  phases: string[];
  changeTypes: string[];
  contractRange: [number | null, number | null];
  budgetRange: [number | null, number | null];
  scoreRange: [number | null, number | null];
  preSalesScoreRange: [number | null, number | null];
  executionScoreRange: [number | null, number | null];

  // ===== 新增精准筛选字段 =====
  isHighlight: boolean | null; // 亮点工程

  // 日期区间 (存入 YYYY-MM-DD 字符串数组)
  kickoffDateRange: [string | null, string | null];       // 立项日期
  plannedEndDateRange: [string | null, string | null];    // 计划结束时间
  forecastAcceptanceDateRange: [string | null, string | null]; // 预测验收时间
  acceptanceDateRange: [string | null, string | null];    // 验收日期
  slipReceiveDateRange: [string | null, string | null];   // 验收单获取时间
  thanksLetterDateRange: [string | null, string | null];  // 感谢信接收时间

  // 数字区间
  grossMarginRange: [number | null, number | null];       // 毛利率
  budgetUsageRange: [number | null, number | null];       // 预算使用情况
  inputPercentRange: [number | null, number | null];      // 投入百分比 (%)
  progressPercentRange: [number | null, number | null];   // 进度百分比 (%)
  plannedManHoursRange: [number | null, number | null];   // 项目整体计划总工时
  actualManHoursRange: [number | null, number | null];    // 项目整体实际总工时

  // 单项筛选
  isConfirmed: boolean | null; // 是否确认收入
  hasChanges: boolean | null;          // 是否有变更
  hasOutsourcing: boolean | null;      // 是否有外协采购

  searchTerm: string;
}

export interface DrillDownData {
  title: string;
  projects: Project[];
  type?: 'general' | 'manhours' | 'budget' | 'outsourcing' | 'schedule' | 'risk' | 'quality' | 'change' | 'composition' | 'revenue' | 'contract_kpi' | 'revenue_kpi' | 'acceptance_kpi';
}

// 自定义列定义
export interface CustomColumn {
  id: number;
  column_key: string;
  column_name: string;
  data_type: 'text' | 'number';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// 项目自定义列数据
export interface ProjectCustomData {
  [columnKey: string]: string | number;
}

// 自定义列数据项（从数据库返回的格式）
export interface CustomDataItem {
  project_id: string;
  column_key: string;
  value: string;
}

// ==================== 验收追踪系统类型 ====================

// 验收追踪状态（7种状态，前端计算）
export type TrackingStatus =
  | '未立项已确认'
  | '未立项'
  | '实施中'
  | '实施中已确认'
  | '已验收未确认'
  | '已验收已确认'
  | '往年验收今年确认';

// 重点关注等级
export type TrackingFocusLevel = '一级' | '二级' | '';

// 验收风险等级
export type TrackingAcceptanceRisk = '高' | '中' | '低' | '无' | '已验收';

// 确认收入风险等级
export type TrackingRevenueRisk = '高' | '中' | '低' | '无' | '已确认';

// 验收可控性
export type TrackingControllability = '可控' | '不可控' | '新增';

// 统计周期类型
export type TrackingPeriodType = 'thisWeek' | 'lastMonth' | 'thisMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'custom';

// 区域季度收入目标
export interface RevenueTarget {
  region: string;
  quarterlyTargets: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
  };
}

// 验收追踪全局配置
export interface AcceptanceTrackingConfig {
  expectedRevenue: number;      // 确认收入指标
  forecastRevenue: number;      // 预测可确认
  visibleColumns: string[];     // 可见列
  columnOrder: string[];        // 列顺序
}

// 验收追踪筛选状态
export interface TrackingFilterState {
  regions: string[];
  levels: string[];
  statuses: TrackingStatus[];
  acceptanceRisks: TrackingAcceptanceRisk[];
  revenueRisks: TrackingRevenueRisk[];
  acceptanceStatus: '全部' | '已验收' | '未验收';
  searchTerm: string;
}

// 验收追踪列定义
export interface TrackingColumn {
  id: string;
  label: string;
  minWidth?: string;
  visible?: boolean;
}

// 验收追踪统计数据
export interface TrackingStats {
  // Count指标
  countMetrics: {
    expected: number;           // 应验收总数
    forecast: number;           // 预测验收值
    completed: number;          // 已完成验收
    sprint: number;             // 冲刺争取项
    lagging: number;            // 高危滞后项
    completedDetails: {
      onSchedule: Project[];    // 准时验收
      early: Project[];         // 提前验收
    };
  };
  // Sum指标
  sumMetrics: {
    expected: number;           // 确认收入指标
    totalAcquired: number;      // 已确认金额累计
    acquired: number;           // 本期确认金额
    totalAcceptedNotAcquired: number;  // 已验收未确认累计
    newAcceptedNotAcquired: number;    // 本期新增已验收未确认
    forecast: number;           // 预测可确认
    highRisk: number;           // 确认高风险
    acquiredDetails: {
      normal: Project[];        // 正常回款
      advance: Project[];       // 提前确权
      pastYear: Project[];      // 往年清理
    };
    acceptedNotAcquiredDetails: Project[];
  };
  // 趋势对比
  trends?: {
    expected: number;
    forecast: number;
    completed: number;
    sprint: number;
    lagging: number;
    acquired: number;
    newAcceptedNotAcquired: number;
    forecastSum: number;
    highRisk: number;
    label: string;
  };
  // 完成率
  completionRate: number;
  // 图表数据
  regionData: { name: string; value: number }[];
  riskData: { name: string; value: number }[];
  regionalAchievementData: any[];
  acceptanceRiskDistribution: any[];
  revenueRiskDistribution: any[];
  highRiskReasonAnalysis: { reason: string; count: number; percentage: number }[];
  highRiskProjects: Project[];
}

// 区域季度目标常量
export const REGION_QUARTERLY_TARGETS: Record<string, Record<number, number>> = {
  '北区（华中）': { 1: 5000000, 2: 6000000, 3: 7000000, 4: 8000000 },
  '北区（华北，东北）': { 1: 6000000, 2: 7000000, 3: 8000000, 4: 9000000 },
  '东区': { 1: 10000000, 2: 12000000, 3: 15000000, 4: 18000000 },
  '南区': { 1: 8000000, 2: 10000000, 3: 12000000, 4: 15000000 },
  '创景可视（内转）': { 1: 4000000, 2: 5000000, 3: 6000000, 4: 7000000 },
  '西区': { 1: 7000000, 2: 8000000, 3: 9000000, 4: 10000000 },
};

// 验收追踪列定义常量
export const TRACKING_ALL_COLUMNS: TrackingColumn[] = [
  { id: 'projectCode', label: '项目编号' },
  { id: 'projectName', label: '项目名称', minWidth: '280px' },
  { id: 'type', label: '项目类型' },
  { id: 'level', label: '项目级别' },
  { id: 'region', label: '所属区域' },
  { id: 'projectManager', label: '项目经理', minWidth: '120px' },
  { id: 'salesManager', label: '销售经理' },
  { id: 'contractAmount', label: '合同金额' },
  { id: 'kickoffDate', label: '监控开始时间' },
  { id: 'plannedEndDate', label: '监控截止时间' },
  { id: 'forecastAcceptanceDate', label: '预测验收时间' },
  { id: 'acceptanceTrackingDate', label: '新增时间' },
  { id: 'acceptanceDate', label: '实际验收时间' },
  { id: 'confirmedDate', label: '确认收入时间' },
  { id: 'documentReceivedDate', label: '验收单获取时间' },
  { id: 'trackingAcceptanceRisk', label: '验收风险' },
  { id: 'trackingRevenueRisk', label: '确认收入风险' },
  { id: 'acceptanceControl', label: '验收可控性' },
  { id: 'mainWorkCompleted', label: '主体工作是否完成' },
  { id: 'changeCount', label: '变更项目' },
  { id: 'isNewTracking', label: '标记为新增项目' },
  { id: 'focusLevel', label: '重点关注' },
  { id: 'trackingStatus', label: '项目状态', minWidth: '120px' },
  { id: 'remarks', label: '备注' },
  { id: 'solutionMeasures', label: '解决措施' },
];

// ==================== 产品相关类型 ====================

// 产品定义
export interface Product {
  id: number;
  name: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// 项目-产品关联（包含销售金额）
export interface ProjectProduct {
  id: number;
  project_id: string;
  product_id: number;
  product_name?: string;  // 关联查询时返回的产品名称
  sales_amount: number;
  created_at?: string;
  updated_at?: string;
}

// 项目产品编辑项（用于前端表单）
export interface ProjectProductItem {
  product_id: number;
  product_name: string;
  sales_amount: number;
}

// 产品销售统计
export interface ProductSalesStats {
  id: number;
  name: string;
  sort_order: number;
  total_sales_amount: number;
  project_count: number;
}

// ==================== 项目成果相关类型 ====================

// 文档类型常量
export const DOCUMENT_TYPES = [
  '立项论证报告',
  '项目建议书',
  '可研报告',
  '单项论证报告',
  '任务书/技术要求/技术协议/招标要求',
  '技术评估表',
  '报价',
  '初步设计方案/标书',
  '合同',
  '项目立项公告',
  '项目计划和预算',
  '概要设计报告',
  '详细设计报告',
  '测试大纲',
  '模型/软件开发说明',
  '测试报告',
  '用户手册',
  '代码审查记录',
  '模型/软件/硬件系统完善意见',
  '系统安装部署说明书',
  '安装调试记录',
  '应用验证报告',
  '培训材料（计划、通知、签到表等）',
  '培训通知',
  '培训教材',
  '培训记录（含签到表和现场培训照片）',
  '培训考核记录',
  '培训意见反馈表',
  '研制总结报告（WORD和PPT）',
  '验收材料交接单',
  '验收评审结论',
  '用户证明',
  '项目综合评分表',
  '跟踪维护记录',
  '项目总结PPT',
  '源代码',
  '会议纪要（启动会、计划预算、内部方案、内部验收）',
  '任务书要求的其他材料'
];

// 模型成果
export interface ModelResult {
  id?: number;
  modelName: string;              // 定制模型库名称
  problemScenario: string;        // 项目解决的问题及应用场景
  valueExtraction: string;        // 价值提炼
}

// 软件成果
export interface SoftwareResult {
  id?: number;
  softwareName: string;           // 定制软件或工具箱名称
  problemScenario: string;        // 项目解决的问题及应用场景
  valueExtraction: string;        // 价值提炼
}

// 文档状态
export interface DocumentStatus {
  id?: number;
  documentType: string;           // 文档类型名称
  isSubmitted: boolean;           // 是否已提交
}

// 项目成果主表
export interface ProjectResult {
  id?: number;
  projectId: string;
  svnAddress: string;

  // ========== 实施团队评分 ==========
  // 区域总监硬性分 (45分)
  implIsRecommended: boolean;     // 是否推荐
  implHardSatisfaction: number;   // 质量控制-满意度 (15分)
  implHardSubmitQuality: number;  // 质量控制-提交物质量 (10分)
  implHardRequirement: number;    // 需求控制情况 (10分)
  implHardRisk: number;           // 风险控制情况 (10分)

  // 实施团队软性分 (20分)
  implSoftTechReason: string;             // 技术提升-推荐理由
  implSoftTechPmoConclusion: string;      // 技术提升-PMO评议结论
  implSoftTechScore: number;              // 技术提升-得分 (8分)
  implSoftTeamReason: string;             // 团队建设-推荐理由
  implSoftTeamPmoConclusion: string;      // 团队建设-PMO评议结论
  implSoftTeamScore: number;              // 团队建设-得分 (6分)
  implSoftResultReason: string;           // 成果积累-推荐理由
  implSoftResultPmoConclusion: string;    // 成果积累-PMO评议结论
  implSoftResultScore: number;            // 成果积累-得分 (6分)

  // PMO硬性分 (55分)
  implPmoHardDelay: number;       // 进度控制-延期 (15分)
  implPmoHardNode: number;        // 进度控制-节点 (15分)
  implPmoHardMaterial: number;    // 质量控制-材料提交 (5分)
  implPmoHardDigital: number;     // 数字化执行 (10分)
  implPmoHardCost: number;        // 成本控制 (10分)

  implTotalScore: number;         // 实施团队合计

  // ========== 售前团队评分 ==========
  // 区域总监硬性分 (70分)
  preSalesIsRecommended: boolean; // 是否推荐
  preSalesHardRequirement: number;// 需求把控 (30分)
  preSalesHardSolution: number;   // 售前方案质量 (25分)
  preSalesHardRisk: number;       // 风险识别 (15分)

  // 售前团队软性分 (20分)
  preSalesSoftTechReason: string;             // 技术产品牵引-推荐理由
  preSalesSoftTechPmoConclusion: string;      // 技术产品牵引-PMO评议结论
  preSalesSoftTechScore: number;              // 技术产品牵引-得分 (8分)
  preSalesSoftDirectionReason: string;        // 新方向拓展-推荐理由
  preSalesSoftDirectionPmoConclusion: string; // 新方向拓展-PMO评议结论
  preSalesSoftDirectionScore: number;         // 新方向拓展-得分 (6分)
  preSalesSoftPromotionReason: string;        // 成果推广-推荐理由
  preSalesSoftPromotionPmoConclusion: string; // 成果推广-PMO评议结论
  preSalesSoftPromotionScore: number;         // 成果推广-得分 (6分)

  // PMO硬性分 (30分)
  preSalesPmoHardActivity: number;  // 售前活动执行 (10分)
  preSalesPmoHardDigital: number;   // 数字化执行 (5分)
  preSalesPmoHardInput: number;     // 投入评估 (15分)

  preSalesTotalScore: number;       // 售前团队合计
}

// 项目成果列表项（包含项目基本信息）
export interface ProjectResultListItem {
  id: string;
  projectCode: string;
  projectName: string;
  groupCompany: string;           // 甲方单位
  type: string;                   // 项目类型
  industry: string;               // 行业
  level: string;                  // 项目M级
  region: string;                 // 所属区域
  projectManager: string;         // 项目经理
  salesManager: string;           // 销售经理
  preSalesManager: string;        // 售前经理
  kickoffDate: string;            // 立项时间
  acceptanceDate: string;         // 验收时间
  securityLevel: string;          // 密级
  modelResults: ModelResult[];    // 模型成果
  softwareResults: SoftwareResult[]; // 软件成果
  submittedDocCount: number;      // 已提交文档数
  totalDocCount: number;          // 总文档数
  svnAddress: string;             // SVN地址
  projectResult: ProjectResult | null; // 成果主数据
}

// 项目成果详情（包含完整的评分和文档信息）
export interface ProjectResultDetail extends ProjectResultListItem {
  documentStatus: DocumentStatus[];
}

// ==================== 下钻模态框相关类型 ====================

// 下钻模态框额外字段定义
export interface DrillDownExtraField {
  key: string;                      // 字段key
  label: string;                    // 字段标签
  type: 'currency' | 'percent' | 'date' | 'text' | 'tags';
}

// 下钻模态框数据
export interface DrillDownModalData {
  title: string;                    // 模态框标题
  module: 'region' | 'industry' | 'margin' | 'regionalMargin' | 'highlight' | 'risk';
  projects: Project[];              // 筛选后的项目列表
  extraFields?: DrillDownExtraField[];  // 额外展示字段
  filterInfo?: string;              // 筛选条件描述
}
