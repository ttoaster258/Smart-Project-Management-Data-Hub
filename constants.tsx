
import { Project, ProjectStatus, Region, PersonMonthlyHours, OutsourcingType, OutsourcingItem, MilestoneNode, ProjectMilestones, MilestoneNodeItem } from './types';

// --- Configuration ---
const SYSTEM_DATE = new Date('2026-02-28');

/**
 * 计算项目实际状态
 * 规则：
 * - "暂停"和"已验收" 是手动设置的状态，直接返回
 * - 其他状态根据当前日期和计划结束日期自动判断：
 *   - 今天 < 计划结束日期 => "正在进行"
 *   - 今天 >= 计划结束日期 => "延期"
 */
const calculateProjectStatus = (
  currentStatus: string,
  plannedEndDate: string
): ProjectStatus => {
  // 手动设置的状态优先返回
  if (currentStatus === ProjectStatus.Paused) return ProjectStatus.Paused;
  if (currentStatus === ProjectStatus.Accepted) return ProjectStatus.Accepted;

  // 解析计划结束日期
  const plannedDate = new Date(plannedEndDate);
  if (isNaN(plannedDate.getTime())) {
    // 无法解析日期，默认返回正在进行
    return ProjectStatus.Ongoing;
  }

  // 使用今天日期进行比较
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(plannedDate);
  planned.setHours(0, 0, 0, 0);

  // 今天 < 计划结束日期 => 正在进行
  // 今天 >= 计划结束日期 => 延期
  return today < planned ? ProjectStatus.Ongoing : ProjectStatus.Delayed;
};

// --- Helper Functions ---
const parseDate = (val: string): string => {
    if (!val || val === '/' || val === '-') return '';
    return val.replace(/\./g, '-').replace(/\//g, '-');
};

const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const normalizePhase = (rawPhase: string): string => {
    if (!rawPhase) return '立项';
    if (rawPhase.includes('开发') || rawPhase.includes('构建') || rawPhase.includes('规格')) return '开发测试阶段';
    if (rawPhase.includes('验证')) return '应用验证阶段';
    if (rawPhase.includes('方案')) return '方案阶段';
    if (rawPhase.includes('验收')) return '验收阶段';
    if (rawPhase.includes('售后')) return '售后阶段';
    if (rawPhase.includes('立项')) return '立项阶段';
    return rawPhase;
};

// NEW: Normalize Region Logic
const normalizeRegion = (rawRegion: string): string => {
    if (!rawRegion) return '东区'; // Default or keep as is
    return rawRegion;
};

// 密级转换函数 - 统一转换为字母格式
const normalizeSecurityLevel = (raw: string): string => {
    if (!raw) return '';
    const sl = raw.toString().trim();
    // 公开项目不显示
    if (sl === '公开' || sl === '普通') return '';
    // 已经是字母格式
    if (sl === 'NB') return 'NB';
    if (sl === 'SM') return 'TM'; // SM统一改为TM
    if (sl === 'TM') return 'TM';
    // 中文转换
    if (sl.includes('内部')) return 'NB';
    if (sl.includes('秘密') || sl.includes('涉密') || sl.includes('机密')) return 'TM';
    return '';
};

const determineStatus = (endDateStr: string, rawStatus: string): { status: ProjectStatus, comment: string } => {
    // 1. Priority: Paused (Explicit flag in raw data)
    if (rawStatus && rawStatus.includes('暂停')) {
        return { status: ProjectStatus.Paused, comment: rawStatus };
    }

    // 2. Priority: Accepted (Explicit flag in raw data)
    // Covers '等待验收', '验收', '已验收'
    if (rawStatus && (rawStatus.includes('验收') || rawStatus === '已验收' || rawStatus.includes('等待验收'))) {
        return { status: ProjectStatus.Accepted, comment: rawStatus };
    }

    // 3. Dynamic Calculation for Delayed vs Ongoing
    // Logic: If not Paused/Accepted, compare System Date vs Planned End Date
    const endDate = new Date(parseDate(endDateStr));

    // Check if date is valid
    if (!isNaN(endDate.getTime())) {
        // If System Date is AFTER the planned end date, it is Delayed
        if (SYSTEM_DATE > endDate) {
            return { status: ProjectStatus.Delayed, comment: '已逾期' };
        }
    }

    // Default: Ongoing (System Date <= End Date, or invalid date assumed ongoing)
    return { status: ProjectStatus.Ongoing, comment: '进度正常' };
};

// NOTE: This function distributes monthly total hours to personnel in a 2:1:1 ratio
// PM: 50%, Sales: 25%, Pre-Sales: 25%
const generatePersonnel = (pm: string, sales: string, preSales: string, monthlyTrend: number[]): PersonMonthlyHours[] => {
    const pmMonthly = monthlyTrend.map(v => Number((v * 0.5).toFixed(2)));
    const salesMonthly = monthlyTrend.map(v => Number((v * 0.25).toFixed(2)));
    const preMonthly = monthlyTrend.map(v => Number((v * 0.25).toFixed(2)));

    return [
        { name: pm, role: '项目经理', monthly: pmMonthly },
        { name: sales, role: '销售经理', monthly: salesMonthly },
        { name: preSales, role: '售前经理', monthly: preMonthly },
    ];
};

const generateOutsourcingItems = (totalAmount: number): OutsourcingItem[] => {
    if (!totalAmount || totalAmount <= 0) return [];
    return [{
        id: `item-${Math.random()}`,
        type: OutsourcingType.Other,
        name: '外协服务项(批量)',
        spec: '批',
        quantity: 1,
        supplier: '待定',
        totalAmount
    }];
};

// --- Milestone Simulation Logic ---
const generateMilestones = (startStr: string, endStr: string, status: ProjectStatus): ProjectMilestones => {
    const marketNodes = ['级别确定', '需求评估', '项目投标', '合同审批'];
    const implNodes = ['项目启动', '计划预算', '概要方案', '详细方案', '内部验收', '项目验收'];

    // 1. Anchor Dates
    const startDate = new Date(parseDate(startStr));
    const endDate = new Date(parseDate(endStr));

    // Safety check for dates
    if (isNaN(startDate.getTime())) return { market: [], implementation: [], external: [] };
    const validEndDate = isNaN(endDate.getTime()) ? addDays(startDate, 180) : endDate; // Default 6 months if no end date

    // 2. Generate Market Phase (Backwards from Start)
    // Assume market phase takes about 60-90 days before kickoff
    const marketMilestones: MilestoneNodeItem[] = marketNodes.map((name, index) => {
        // Reverse index for day subtraction: 0 (Early Quote) is furthest back
        const reverseIdx = marketNodes.length - 1 - index;
        const daysBack = reverseIdx * 14 + 10; // Approx 2 weeks per step + buffer
        const actualDate = addDays(startDate, -daysBack);

        return {
            id: `mkt-${index}`,
            name,
            status: 'completed' as const, // Market phase usually completed if project started
            actualDate: formatDate(actualDate)
        };
    });

    // 3. Generate Implementation Phase
    // Determine the "Active Index" (The node currently being worked on or stuck at)
    let activeIndex = 0;

    if (status === ProjectStatus.Accepted) {
        activeIndex = implNodes.length; // All done
    } else if (status === ProjectStatus.Paused) {
        // Stop somewhere in the middle (e.g. index 2 or 3)
        // Use a hash of startStr to make it deterministic but "random" per project
        const hash = startStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        activeIndex = 2 + (hash % 3); // 2, 3, 4
    } else if (status === ProjectStatus.Delayed) {
        // Stop near the end but not done (e.g. 3, 4, 5)
        // Delayed means time is up but not finished.
        const hash = startStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        activeIndex = 3 + (hash % 3); // 3, 4, 5. Max index is 5.
        // Ensure strictly less than length if Delayed
        if (activeIndex >= implNodes.length) activeIndex = implNodes.length - 1;
    } else {
        // Ongoing: Calculate based on time progress relative to SYSTEM_DATE
        const totalDuration = validEndDate.getTime() - startDate.getTime();
        const elapsed = SYSTEM_DATE.getTime() - startDate.getTime();

        if (totalDuration <= 0) {
            activeIndex = 0;
        } else {
            const progress = elapsed / totalDuration;
            activeIndex = Math.floor(progress * implNodes.length);
        }

        if (activeIndex < 0) activeIndex = 0;
        if (activeIndex >= implNodes.length) activeIndex = implNodes.length - 1;
    }

    const implMilestones: MilestoneNodeItem[] = implNodes.map((name, index) => {
        // Calculate Planned Date
        const totalDuration = validEndDate.getTime() - startDate.getTime();
        const ratio = index / (implNodes.length - 1);
        const plannedDate = new Date(startDate.getTime() + (totalDuration * ratio));

        let nodeStatus: 'completed' | 'processing' | 'pending' | 'delayed' = 'pending';
        let actualDate: string | undefined = undefined;

        if (index < activeIndex) {
            nodeStatus = 'completed';
            // Simulate actual date (planned +/- variance)
            const variance = Math.floor(Math.random() * 15) - 5;
            actualDate = formatDate(addDays(plannedDate, variance));
        } else if (index === activeIndex) {
            // The active node
            if (status === ProjectStatus.Delayed) {
                nodeStatus = 'delayed'; // Visual: Red/Amber block
            } else if (status === ProjectStatus.Paused) {
                nodeStatus = 'processing'; // Visual: Handled as Pause by component logic
            } else if (status === ProjectStatus.Accepted) {
                nodeStatus = 'completed';
                actualDate = formatDate(validEndDate);
            } else {
                nodeStatus = 'processing'; // Ongoing Active
            }
        } else {
            // Future nodes
            nodeStatus = 'pending';
        }

        return {
            id: `impl-${index}`,
            name,
            status: nodeStatus,
            plannedDate: formatDate(plannedDate),
            actualDate: actualDate,
            isKeyNode: index === 0 || index === implNodes.length - 1
        };
    });

    return {
        market: marketMilestones,
        implementation: implMilestones,
        external: [] // As requested, empty
    };
};

// --- Real Risk Data Injection ---
// Mapping based on the provided table order
const RISK_REASONS_DATA = [
    '大课题影响', '大课题影响', '人力不足', '大课题影响', '', '甲方推进慢', '人力不足', '甲方推进慢', '', '',
    '', '外部外协影响', '', '', '', '', '外部外协影响', '综合原因', '', '外部外协影响',
    '', '甲方推进慢', '', '', '', '', '', '', '', '甲方推进慢',
    '大课题影响', '人力不足', '人力不足', '大课题影响', '甲方推进慢', '甲方推进慢', '', '', '', '',
    '', '', '', '', '', '', '', '', '外部外协影响', '甲方推进慢',
    '甲方推进慢', '外部外协影响', '外部外协影响', '', '', '', '', '', '大课题影响', '甲方推进慢'
];

// --- Raw Data ---
// Extracted from the provided 60-project table
// FIXED: PMO Actual Man-Hours = History + Sum(Monthly)
const RAW_DATA = [
    { id: 'TY-XN0001', name: '测试项目1', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发、建模开发、采购、外协', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '西区', industry: '核能', kickoff: '2026/4/8', end: '2026/10/8', contractEnd: '2026/10/8', pm: '陈经理', sales: '何销售', pre: '周售前', dir: '吕经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 3647432.00, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 7695000, histPaid: 6156000, paid25: 0, pending25: 1539000 }, hours: { eval: 0, plan: 137.2, act: 51.4, pmo: 73.60, monthly: [1.7, 1.14, 0.70, 0.2, 0.7, 1.1, 1.2, 2, 2, 0, 0, 0] }, exec: { prog: 58, input: 53.64 }, control: '可控', quality: 15, changes: [{ date: '2024/7/29', type: '进度变更', reason: '外部原因' }] },
    { id: 'TY-XB0004', name: '测试项目2', sec: '', statusRaw: '延期', phase: '验收阶段', nature: '外协', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '航空', kickoff: '2026/7/13', end: '2027/1/13', contractEnd: '2027/1/13', pm: '曾经理', sales: '曾销售', pre: '王售前', dir: '王经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 2911818.87, human: 24020.35, travel: 41600, review: 10000, risk: 10830, out: 440000, procure: 0, other: 2385368.52 }, pay: { contract: 2980000, histPaid: 1832000, paid25: 0, pending25: 1148000 }, hours: { eval: 0, plan: 71.4, act: 139, pmo: 281.98, monthly: [1.2, 0.4, 0.92, 0, 0.14, 0.04, 0, 0.06, 1.2, 0, 0, 0] }, exec: { prog: 99, input: 394.93 }, control: '可控', quality: 15, changes: [{ date: '2022/8/3', type: '进度变更', reason: '外部原因' }] },
    { id: 'TY-HB0071', name: '测试项目3', sec: '', statusRaw: '暂停（4月）', phase: '应用验证阶段', nature: '建模开发、采购', type: '销售项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航空', kickoff: '2026/12/23', end: '2027/6/23', contractEnd: '2027/6/23', pm: '吕经理', sales: '刘销售', pre: '何售前', dir: '何经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 1830000, histPaid: 0, paid25: 0, pending25: 1830000 }, hours: { eval: 0, plan: 3, act: 3.1, pmo: 7.20, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 92, input: 240 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-CJ0020-XN0001', name: '测试项目4', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '可视化建模开发', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '创景可视（内转）', industry: '核能', kickoff: '2026/8/30', end: '2027/3/2', contractEnd: '2027/3/2', pm: '周经理', sales: '吕销售', pre: '吕售前', dir: '吕经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 900000, histPaid: 270000, paid25: 0, pending25: 630000 }, hours: { eval: 0, plan: 69, act: 60.06, pmo: 1.72, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 71, input: 2.49 }, control: '可控', quality: 0, changes: [{ date: '2024/12/18', type: '人员变更', reason: '自身原因' }] },
    { id: 'TY-HB0066', name: '测试项目5', sec: 'NB', statusRaw: '正在进行', phase: '开发测试阶段', nature: '建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/1/12', end: '2026/12/31', contractEnd: '2026/12/31', pm: '何经理', sales: '何销售', pre: '周售前', dir: '王经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 571700.73, human: 485727.73, travel: 57075, review: 20000, risk: 0, out: 0, procure: 8898, other: 0 }, pay: { contract: 1876000, histPaid: 1313200, paid25: 0, pending25: 562800 }, hours: { eval: 0, plan: 70.9, act: 73, pmo: 38.19, monthly: [0.76, 3.7, 0.2, 1.14, 1.4, 2.5, 1, 0.9, 1.98, 1, 0, 0] }, exec: { prog: 75, input: 53.86 }, control: '可控', quality: 12, changes: [{ date: '2024/8/23', type: '进度变更', reason: '外部原因' }] },
    { id: 'TY-HB0069', name: '测试项目6', sec: 'NB', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发、其他', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '北区', industry: '航天', kickoff: '2026/3/1', end: '2026/9/1', contractEnd: '2026/9/1', pm: '李经理', sales: '何销售', pre: '吕售前', dir: '何经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 1393600, human: 1071670.51, travel: 241900, review: 80000, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 0, histPaid: 0, paid25: 0, pending25: 0 }, hours: { eval: 0, plan: 148.6, act: 230, pmo: 52.89, monthly: [4.28, 5.82, 2.94, 0.42, 2.9, 0, 0, 1.8, 0.9, 0, 0, 0] }, exec: { prog: 97.5, input: 35.59 }, control: '可控', quality: 0, changes: [{ date: '2025/6/26', type: '进度变更', reason: '客户原因' }] },
    { id: 'TY-HZ0024', name: '测试项目7', sec: '', statusRaw: '暂停（6月）', phase: '应用验证阶段', nature: '建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '核能', kickoff: '2026/3/6', end: '2026/9/6', contractEnd: '2026/9/6', pm: '何经理', sales: '吕销售', pre: '王售前', dir: '何经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 2010000, histPaid: 1000000, paid25: 0, pending25: 1010000 }, hours: { eval: 38, plan: 38, act: 70, pmo: 66.61, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 97, input: 175.3 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-CJ0052-HZ0038', name: '测试项目8', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '可视化建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '船舶', kickoff: '2026/8/1', end: '2027/2/1', contractEnd: '2027/2/1', pm: '李经理', sales: '周销售', pre: '王售前', dir: '何经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 183000, histPaid: 0, paid25: 0, pending25: 183000 }, hours: { eval: 0, plan: 20, act: 16.7, pmo: 9.44, monthly: [1.2, 1.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 83.5, input: 47.2 }, control: '可控', quality: 15, changes: [{ date: '2024/12/18', type: '人员变更', reason: '自身原因' }] },
    { id: 'TY-HZ0036', name: '测试项目9', sec: 'SM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/8/9', end: '2027/2/9', contractEnd: '2027/2/9', pm: '王经理', sales: '王销售', pre: '何售前', dir: '吕经理', budget: { quote: 824000, eval: 0, cost: 0, profit: 0, total: 543946.38, human: 340691.38, travel: 75200, review: 75000, risk: 53055, out: 0, procure: 0, other: 0 }, pay: { contract: 0, histPaid: 0, paid25: 0, pending25: 0 }, hours: { eval: 0, plan: 61, act: 53, pmo: 42.86, monthly: [1.8, 1.7, 2.2, 0.6, 1.6, 0.4, 3.4, 1.4, 0.4, 0.8, 0.6, 0] }, exec: { prog: 83, input: 70.26 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HZ0033', name: '测试项目10', sec: 'SM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/8/30', end: '2027/3/2', contractEnd: '2027/3/2', pm: '刘经理', sales: '何销售', pre: '何售前', dir: '王经理', budget: { quote: 880000, eval: 0, cost: 0, profit: 0, total: 639086.75, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 260000, other: 0 }, pay: { contract: 880000, histPaid: 352000, paid25: 0, pending25: 528000 }, hours: { eval: 0, plan: 43, act: 34.5, pmo: 50.20, monthly: [2, 2.2, 3.10, 1, 0.8, 0.2, 0, 1, 1.2, 2.4, 2.7, 0] }, exec: { prog: 86, input: 116.75 }, control: '可控', quality: 0, changes: [{ date: '2025/11/25', type: '进度变更', reason: '客户原因' }] },
    { id: 'TY-HB0103', name: '测试项目11', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/9/25', end: '2027/3/25', contractEnd: '2027/3/25', pm: '鲍经理', sales: '吕销售', pre: '曾售前', dir: '何经理', budget: { quote: 1460000, eval: 0, cost: 0, profit: 0, total: 412519.96, human: 259876.21, travel: 83600, review: 20000, risk: 49043.75, out: 0, procure: 0, other: 0 }, pay: { contract: 1460000, histPaid: 860000, paid25: 0, pending25: 600000 }, hours: { eval: 37, plan: 41, act: 15, pmo: 4.70, monthly: [0, 1.4, 2.3, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 85, input: 11.46 }, control: '可控', quality: 0, changes: [{ date: '2024/6/14', type: '人员变更', reason: '自身原因' }] },
    { id: 'TY-HB0086', name: '测试项目12', sec: 'TM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/9/28', end: '2026/12/30', contractEnd: '2026/12/30', pm: '张经理', sales: '鲍销售', pre: '李售前', dir: '鲍经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 942240.94, human: 748244.94, travel: 181996, review: 12000, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 3150000, histPaid: 2650000, paid25: 500000, pending25: 0 }, hours: { eval: 0, plan: 113.2, act: 104, pmo: 67.66, monthly: [2.4, 5.5, 1, 4.1, 0.2, 1.4, 0, 1.2, 1.2, 1, 0, 0] }, exec: { prog: 93, input: 59.77 }, control: '可控', quality: 0, changes: [{ date: '2024/6/3', type: '进度变更', reason: '综合原因' }] },
    { id: 'TY-HZ0046', name: '测试项目13', sec: '', statusRaw: '等待验收', phase: '验收阶段', nature: '建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/1/2', end: '2026/3/30', contractEnd: '2026/3/30', pm: '李经理', sales: '刘销售', pre: '李售前', dir: '刘经理', budget: { quote: 660000, eval: 0, cost: 0, profit: 0, total: 164255.78, human: 112505.78, travel: 36750, review: 15000, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 660000, histPaid: 198000, paid25: 0, pending25: 462000 }, hours: { eval: 17.8, plan: 20.6, act: 20.3, pmo: 15.46, monthly: [0.4, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 99.6, input: 75.06 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-XB0027', name: '测试项目14', sec: '', statusRaw: '等待验收', phase: '验收阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '能源', kickoff: '2026/1/3', end: '2026/7/3', contractEnd: '2026/7/3', pm: '李经理', sales: '周销售', pre: '鲍售前', dir: '周经理', budget: { quote: 690000, eval: 0, cost: 0, profit: 0, total: 790806.68, human: 362203.18, travel: 98000, review: 22000, risk: 58603.5, out: 0, procure: 50000, other: 200000 }, pay: { contract: 672000, histPaid: 201600, paid25: 0, pending25: 470400 }, hours: { eval: 61, plan: 65.5, act: 12.59, pmo: 43.22, monthly: [0.54, 0.8, 2.48, 0, 0, 0, 0, 0, 1.5, 0, 0, 0] }, exec: { prog: 97, input: 65.99 }, control: '可控', quality: 12, changes: [{ date: '2024/7/30', type: '预算变更', reason: '综合原因' }] },
    { id: 'TY-XN0142', name: '测试项目15', sec: '', statusRaw: '延期', phase: '验收阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '是', level: '重点项目（C类项目）', region: '西区', industry: '核能', kickoff: '2026/2/5', end: '2026/8/5', contractEnd: '2026/8/5', pm: '鲍经理', sales: '李销售', pre: '刘售前', dir: '李经理', budget: { quote: 5173000, eval: 0, cost: 0, profit: 0, total: 2392320.22, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 405600, other: 0 }, pay: { contract: 4390000, histPaid: 0, paid25: 2195000, pending25: 2195000 }, hours: { eval: 194.6, plan: 243.6, act: 342, pmo: 325.39, monthly: [22.88, 13.36, 10.66, 6.04, 5.64, 6.4, 2.9, 0.64, 0.2, 3.46, 0, 0] }, exec: { prog: 95, input: 133.58 }, control: '可控', quality: 15, changes: [{ date: '2025/9/5', type: '预算变更', reason: '客户原因' }] },
    { id: 'TY-CJ0041-HZ0043', name: '测试项目16', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '可视化建模开发', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '创景可视（内转）', industry: '船舶', kickoff: '2026/3/4', end: '2026/9/4', contractEnd: '2026/9/4', pm: '刘经理', sales: '余销售', pre: '余售前', dir: '李经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 112859.96, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 290000, histPaid: 87000, paid25: 0, pending25: 203000 }, hours: { eval: 0, plan: 34.2, act: 34.2, pmo: 7.58, monthly: [0.2, 0.2, 1.2, 0.4, 0, 0, 0, 0, 0, 0.6, 0, 0] }, exec: { prog: 100, input: 22.16 }, control: '可控', quality: 0, changes: [{ date: '2024/12/18', type: '人员变更', reason: '自身原因' }] },
    { id: 'TY-HD0097', name: '测试项目17', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '船舶', kickoff: '2026/3/5', end: '2026/9/5', contractEnd: '2026/9/5', pm: '李经理', sales: '李销售', pre: '李售前', dir: '李经理', budget: { quote: 1800000, eval: 0, cost: 0, profit: 0, total: 846665.2, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 350000, other: 0 }, pay: { contract: 1769600, histPaid: 530880, paid25: 0, pending25: 1238720 }, hours: { eval: 68.8, plan: 66.8, act: 304, pmo: 60.94, monthly: [1.64, 3.56, 5.9, 2.9, 2.12, 1.3, 2.14, 1.44, 0.7, 1, 3.96, 0] }, exec: { prog: 85, input: 91.23 }, control: '可控', quality: 0, changes: [{ date: '2025/6/6', type: '预算变更', reason: '综合原因' }] },
    { id: 'TY-XN0119', name: '测试项目18', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '核能', kickoff: '2026/3/12', end: '2026/9/12', contractEnd: '2026/9/12', pm: '余经理', sales: '余销售', pre: '李售前', dir: '李经理', budget: { quote: 915000, eval: 0, cost: 0, profit: 0, total: 258012.5, human: 197434.72, travel: 20100, review: 0, risk: 38477.78, out: 0, procure: 0, other: 2000 }, pay: { contract: 880000, histPaid: 0, paid25: 0, pending25: 880000 }, hours: { eval: 34.2, plan: 41, act: 42.4, pmo: 53.83, monthly: [0.92, 5.5, 3.42, 0.6, 0.6, 0.4, 0.4, 0.4, 0, 0, 0.8, 0] }, exec: { prog: 99, input: 131.28 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0107', name: '测试项目19', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '航空', kickoff: '2026/5/14', end: '2026/11/14', contractEnd: '2026/11/14', pm: '余经理', sales: '李销售', pre: '余售前', dir: '李经理', budget: { quote: 3120000, eval: 0, cost: 0, profit: 0, total: 539033.07, human: 307541.75, travel: 132000, review: 0, risk: 0, out: 0, procure: 99491.32, other: 0 }, pay: { contract: 2856000, histPaid: 856800, paid25: 856800, pending25: 1142400 }, hours: { eval: 65.2, plan: 48.4, act: 35.77, pmo: 33.86, monthly: [2.5, 2.08, 1.34, 2.66, 1.88, 1.26, 2.88, 1.02, 2.28, 0.8, 1.6, 0] }, exec: { prog: 0, input: 69.96 }, control: '不可控', quality: 0, changes: [{ date: '2024/7/4', type: '预算变更', reason: '甲方原因' }] },
    { id: 'TY-HB0157', name: '测试项目20', sec: 'SM', statusRaw: '延期', phase: '开发测试阶段', nature: '建模开发、采购', type: '混合项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航空', kickoff: '2026/6/6', end: '2026/12/6', contractEnd: '2026/12/6', pm: '周经理', sales: '余销售', pre: '鲍售前', dir: '李经理', budget: { quote: 2965000, eval: 0, cost: 0, profit: 0, total: 298540, human: 219740, travel: 28800, review: 50000, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 0, histPaid: 0, paid25: 0, pending25: 0 }, hours: { eval: 0, plan: 32, act: 15.2, pmo: 27.12, monthly: [3.04, 4.16, 0.44, 0.8, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 32, input: 84.75 }, control: '不可控', quality: 0, changes: [{ date: '2025/5/29', type: '进度变更', reason: '客户原因' }] },
    { id: 'TY-HN0052', name: '测试项目21', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '可视化建模开发', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '创景可视（内转）', industry: '船舶', kickoff: '2026/11/18', end: '2027/5/18', contractEnd: '2027/5/18', pm: '余经理', sales: '余销售', pre: '王售前', dir: '李经理', budget: { quote: 13300000, eval: 0, cost: 0, profit: 0, total: 2565304.54, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 828917, other: 0 }, pay: { contract: 13300000, histPaid: 9310000, paid25: 3990000, pending25: 0 }, hours: { eval: 0.7, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 85, input: 41.76 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-HN0049', name: '测试项目22', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '南区', industry: '船舶', kickoff: '2026/11/18', end: '2027/12/30', contractEnd: '2027/12/30', pm: '余经理', sales: '李销售', pre: '余售前', dir: '余经理', budget: { quote: 685000, eval: 311000, cost: 239500, profit: 65.78, total: 266403.63, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 215000, other: 0 }, pay: { contract: 685000, histPaid: 0, paid25: 616500, pending25: 68500 }, hours: { eval: 1, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 98.5, input: 73.57 }, control: '不可控', quality: 15, changes: [{ date: '2025/4/14', type: '预算变更', reason: '综合原因' }] },
    { id: 'TY-HD0110', name: '测试项目23', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '核能', kickoff: '2026/11/18', end: '2027/5/18', contractEnd: '2027/5/18', pm: '鲍经理', sales: '吕销售', pre: '吕售前', dir: '何经理', budget: { quote: 1500000, eval: 0, cost: 0, profit: 0, total: 357487.31, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 80000, other: 0 }, pay: { contract: 980000, histPaid: 0, paid25: 0, pending25: 980000 }, hours: { eval: 25, plan: 28.15, act: 26, pmo: 23.77, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2, 0] }, exec: { prog: 100, input: 83.54 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-XB0039', name: '测试项目24', sec: 'SM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '航空', kickoff: '2026/11/18', end: '2027/5/18', contractEnd: '2027/5/18', pm: '张经理', sales: '鲍销售', pre: '周售前', dir: '鲍经理', budget: { quote: 900000, eval: 953600, cost: 347300, profit: 61.41, total: 235787.2, human: 119467.2, travel: 14400, review: 0, risk: 11920, out: 90000, procure: 0, other: 0 }, pay: { contract: 900000, histPaid: 0, paid25: 810000, pending25: 90000 }, hours: { eval: 14.8, plan: 17.2, act: 19.8, pmo: 12.44, monthly: [0.4, 0, 0, 1, 3, 1.2, 0.4, 0.2, 0.8, 0.4, 0, 0] }, exec: { prog: 100, input: 98.1 }, control: '不可控', quality: 0, changes: [{ date: '2025/6/25', type: '进度变更', reason: '客户原因' }] },
    { id: 'TY-HD0130', name: '测试项目25', sec: 'SM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '建模开发、采购', type: '混合项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/11/24', end: '2027/5/24', contractEnd: '2027/5/24', pm: '鲍经理', sales: '何销售', pre: '周售前', dir: '何经理', budget: { quote: 200000, eval: 14400, cost: 4400, profit: 97.8, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 200000, histPaid: 0, paid25: 200000, pending25: 0 }, hours: { eval: 12.1, plan: 11.9, act: 10.2, pmo: 8.80, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4.4, 4.4] }, exec: { prog: 95, input: 82.61 }, control: '不可控', quality: 0, changes: [{ date: '2025/9/24', type: '周期变更', reason: '综合原因' }] },
    { id: 'TY-HZ0064', name: '测试项目26', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '南区', industry: '船舶', kickoff: '2026/11/24', end: '2027/5/24', contractEnd: '2027/5/24', pm: '陈经理', sales: '何销售', pre: '吕售前', dir: '吕经理', budget: { quote: 198000, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 198000, histPaid: 0, paid25: 178200, pending25: 19800 }, hours: { eval: 0, plan: 5.8, act: 1.2, pmo: 0.40, monthly: [0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 90, input: 0 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-XB0040', name: '测试项目27', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/11/26', end: '2027/5/26', contractEnd: '2027/5/26', pm: '曾经理', sales: '曾销售', pre: '王售前', dir: '王经理', budget: { quote: 3583000, eval: 0, cost: 0, profit: 0, total: 839494.3, human: 623731.8, travel: 52300, review: 0, risk: 48562.5, out: 0, procure: 114900, other: 0 }, pay: { contract: 3583000, histPaid: 0, paid25: 3224700, pending25: 358300 }, hours: { eval: 56.6, plan: 56.6, act: 23.9, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 95, input: 30.22 }, control: '不可控', quality: 15, changes: [] },
    { id: 'TY-HB0184', name: '测试项目28', sec: 'SM', statusRaw: '延期', phase: '开发测试阶段', nature: '建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '核能', kickoff: '2026/11/26', end: '2027/5/26', contractEnd: '2027/5/26', pm: '吕经理', sales: '刘销售', pre: '何售前', dir: '何经理', budget: { quote: 1240000, eval: 0, cost: 0, profit: 0, total: 328223.23, human: 190526.35, travel: 97000, review: 30000, risk: 10696.88, out: 0, procure: 0, other: 0 }, pay: { contract: 1240000, histPaid: 744000, paid25: 496000, pending25: 0 }, hours: { eval: 28, plan: 29.6, act: 22.94, pmo: 8.94, monthly: [0, 0, 0, 0, 0, 0, 3.34, 1.1, 3.9, 0.6, 0, 0] }, exec: { prog: 80, input: 25.9 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-HB0204', name: '测试项目29', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '南区', industry: '航空', kickoff: '2026/11/28', end: '2027/5/28', contractEnd: '2027/5/28', pm: '周经理', sales: '吕销售', pre: '吕售前', dir: '吕经理', budget: { quote: 386900, eval: 0, cost: 0, profit: 0, total: 386905.42, human: 217886.67, travel: 95000, review: 20000, risk: 21018.75, out: 33000, procure: 0, other: 0 }, pay: { contract: 1210000, histPaid: 726000, paid25: 484000, pending25: 0 }, hours: { eval: 561.64, plan: 528.2, act: 112.3, pmo: 84.16, monthly: [0, 0, 0, 0, 0, 0, 31.92, 31.08, 21.16, 0, 0, 0] }, exec: { prog: 90, input: 0 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-HZ0085', name: '测试项目30', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '软件开发、建模开发', type: '混合项目', isBench: '', level: '常规项目（D类项目）', region: '南区', industry: '航空', kickoff: '2026/12/8', end: '2027/6/8', contractEnd: '2027/6/8', pm: '何经理', sales: '何销售', pre: '周售前', dir: '王经理', budget: { quote: 1400000, eval: 912000, cost: 363800, profit: 74.01, total: 348967.04, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 50000, other: 0 }, pay: { contract: 1400000, histPaid: 560000, paid25: 700000, pending25: 140000 }, hours: { eval: 220, plan: 63.7, act: 24.28, pmo: 48.06, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 26.86, 21.2, 0, 0] }, exec: { prog: 80, input: 53.29 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HB0198', name: '测试项目31', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '可视化建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '南区', industry: '航天', kickoff: '2026/12/8', end: '2027/6/8', contractEnd: '2027/6/8', pm: '李经理', sales: '何销售', pre: '吕售前', dir: '何经理', budget: { quote: 195000, eval: 96000, cost: 24500, profit: 87.43, total: 22657.51, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 195000, histPaid: 0, paid25: 195000, pending25: 0 }, hours: { eval: 11.2, plan: 50.5, act: 29.5, pmo: 5.60, monthly: [0, 0, 0, 0, 0, 0, 1.6, 1.8, 0.9, 0.5, 0.8, 0] }, exec: { prog: 85, input: 70.16 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-XN0180', name: '测试项目32', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '核能', kickoff: '2026/12/9', end: '2027/6/9', contractEnd: '2027/6/9', pm: '何经理', sales: '吕销售', pre: '刘售前', dir: '何经理', budget: { quote: 498000, eval: 96000, cost: 30600, profit: 93.85, total: 65194.81, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 490000, histPaid: 0, paid25: 441000, pending25: 49000 }, hours: { eval: 12, plan: 13, act: 11.1, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 70, input: 1.71 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HB0217', name: '测试项目33', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '航空', kickoff: '2026/12/12', end: '2027/6/12', contractEnd: '2027/6/12', pm: '周经理', sales: '余销售', pre: '何售前', dir: '李经理', budget: { quote: 900000, eval: 348000, cost: 98057, profit: 89.1, total: 185020, human: 95824.88, travel: 25200, review: 24000, risk: 0, out: 40000, procure: 0, other: 0 }, pay: { contract: 885000, histPaid: 177000, paid25: 681450, pending25: 26550 }, hours: { eval: 24.2, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 0, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HN0044', name: '测试项目34', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '船舶', kickoff: '2026/12/12', end: '2027/6/12', contractEnd: '2027/6/12', pm: '王经理', sales: '王销售', pre: '吕售前', dir: '吕经理', budget: { quote: 9800000, eval: 9131000, cost: 5870500, profit: 40.16, total: 6125421.07, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 5115000, other: 0 }, pay: { contract: 9798600, histPaid: 9308670, paid25: 489930, pending25: 0 }, hours: { eval: 568, plan: 296.4, act: 71.2, pmo: 329.98, monthly: [7.1, 4.56, 18.1, 5.72, 4.8, 6.78, 11.46, 7.48, 3.4, 5, 5.4, 0] }, exec: { prog: 100, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HN0040', name: '测试项目35', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、采购', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '核能', kickoff: '2026/12/12', end: '2027/6/12', contractEnd: '2027/6/12', pm: '曾经理', sales: '曾销售', pre: '李售前', dir: '王经理', budget: { quote: 750000, eval: 761600, cost: 313600, profit: 58.18, total: 373203.33, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 193947.19, other: 0 }, pay: { contract: 750000, histPaid: 0, paid25: 750000, pending25: 0 }, hours: { eval: 9, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 99, input: 84.45 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HB0227', name: '测试项目36', sec: 'SM', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '船舶', kickoff: '2026/12/12', end: '2027/6/12', contractEnd: '2027/6/12', pm: '吕经理', sales: '刘销售', pre: '余售前', dir: '何经理', budget: { quote: 310000, eval: 384000, cost: 98100, profit: 63.68, total: 69990.25, human: 53090.25, travel: 16900, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 310000, histPaid: 0, paid25: 279000, pending25: 31000 }, hours: { eval: 1, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 99.9, input: 72.33 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0187', name: '测试项目37', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发', type: '销售项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航空', kickoff: '2026/12/22', end: '2027/6/22', contractEnd: '2027/6/22', pm: '周经理', sales: '吕销售', pre: '吕售前', dir: '吕经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 290000, histPaid: 0, paid25: 87000, pending25: 203000 }, hours: { eval: 46.4, plan: 42, act: 7, pmo: 5.16, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2.58, 2.58] }, exec: { prog: 90, input: 36.97 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-CJ0101-DB0019', name: '测试项目38', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发、建模开发', type: '销售项目', isBench: '是', level: '常规项目（D类项目）', region: '北区', industry: '航空', kickoff: '2026/12/29', end: '2027/6/29', contractEnd: '2027/6/29', pm: '张经理', sales: '鲍销售', pre: '王售前', dir: '王经理', budget: { quote: 730000, eval: 0, cost: 0, profit: 0, total: 196059.25, human: 141798.75, travel: 28698, review: 12800, risk: 12762.5, out: 0, procure: 0, other: 0 }, pay: { contract: 730000, histPaid: 0, paid25: 292000, pending25: 438000 }, hours: { eval: 54, plan: 59.8, act: 59.5, pmo: 83.64, monthly: [4.1, 8.1, 8.8, 5.6, 7.5, 4.7, 6.56, 6.8, 5.8, 7.4, 4.1, 0] }, exec: { prog: 95, input: 6.9 }, control: '可控', quality: 15, changes: [] },
    { id: 'TY-HB0240', name: '测试项目39', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、采购', type: '销售项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '航空', kickoff: '2026/2/3', end: '2026/11/30', contractEnd: '2026/11/30', pm: '鲍经理', sales: '吕销售', pre: '何售前', dir: '何经理', budget: { quote: 1890000, eval: 1132800, cost: 317900, profit: 83.18, total: 257859.5, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 1890000, histPaid: 0, paid25: 1701000, pending25: 189000 }, hours: { eval: 1.6, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 42, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-XN0201', name: '测试项目40', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区', industry: '核能', kickoff: '2026/12/29', end: '2027/6/29', contractEnd: '2027/6/29', pm: '陈经理', sales: '何销售', pre: '李售前', dir: '吕经理', budget: { quote: 5000000, eval: 0, cost: 0, profit: 0, total: 3373100, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 2470000, other: 0 }, pay: { contract: 4900000, histPaid: 3430000, paid25: 1470000, pending25: 0 }, hours: { eval: 2, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 60, input: 30.2 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-DB0027', name: '测试项目41', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发、其他', type: '销售项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/12/29', end: '2027/6/29', contractEnd: '2027/6/29', pm: '李经理', sales: '周销售', pre: '李售前', dir: '王经理', budget: { quote: 5500000, eval: 4630000, cost: 3546400, profit: 35.05, total: 3573375.05, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 3070000, other: 0 }, pay: { contract: 5460000, histPaid: 0, paid25: 1638000, pending25: 3822000 }, hours: { eval: 10.2, plan: 16.2, act: 44, pmo: 3.60, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 3.6, 0, 0, 0] }, exec: { prog: 98, input: 15.93 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0203', name: '测试项目42', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '核能', kickoff: '2026/12/29', end: '2027/6/29', contractEnd: '2027/6/29', pm: '王经理', sales: '王销售', pre: '李售前', dir: '吕经理', budget: { quote: 4800000, eval: 0, cost: 0, profit: 0, total: 690503.54, human: 489144.91, travel: 38450, review: 30000, risk: 32908.63, out: 0, procure: 100000, other: 0 }, pay: { contract: 3000000, histPaid: 900000, paid25: 1950000, pending25: 150000 }, hours: { eval: 41, plan: 41.3, act: 40.8, pmo: 39.00, monthly: [1, 2.2, 2.8, 1, 0, 3, 0, 2.8, 0, 0, 0, 0] }, exec: { prog: 79, input: 75.45 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0200', name: '测试项目43', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '建模开发、采购', type: '开发项目', isBench: '', level: '重点项目（C类项目）', region: '北区', industry: '航空', kickoff: '2026/12/30', end: '2027/6/30', contractEnd: '2027/6/30', pm: '曾经理', sales: '曾销售', pre: '李售前', dir: '王经理', budget: { quote: 370000, eval: 0, cost: 0, profit: 0, total: 112183.25, human: 60735.75, travel: 23150, review: 15000, risk: 13297.5, out: 0, procure: 0, other: 0 }, pay: { contract: 370000, histPaid: 300000, paid25: 0, pending25: 70000 }, hours: { eval: 9.8, plan: 8.3, act: 1.2, pmo: 0.18, monthly: [0, 0, 0, 0, 0, 0, 0.18, 0, 0, 0, 0, 0] }, exec: { prog: 95, input: 11.09 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-XB0080', name: '测试项目44', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/6/25', end: '2026/12/25', contractEnd: '2026/12/25', pm: '陈经理', sales: '李销售', pre: '吕售前', dir: '吕经理', budget: { quote: 300000, eval: 408000, cost: 128200, profit: 57.23, total: 183112.37, human: 183112.37, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 300000, histPaid: 0, paid25: 0, pending25: 300000 }, hours: { eval: 0, plan: 35, act: 35, pmo: 34.96, monthly: [0.1, 0, 0, 0, 0, 0, 0, 0, 1.4, 1, 0, 0] }, exec: { prog: 90, input: 0 }, control: '不可控', quality: 15, changes: [] },
    { id: 'TY-HD0214', name: '测试项目45', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/9/2', end: '2027/3/2', contractEnd: '2027/3/2', pm: '张经理', sales: '鲍销售', pre: '李售前', dir: '鲍经理', budget: { quote: 99800, eval: 90000, cost: 22600, profit: 77.33, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 99800, histPaid: 0, paid25: 99800, pending25: 0 }, hours: { eval: 27.4, plan: 27, act: 1.6, pmo: 16.21, monthly: [0, 0, 0, 0, 0, 0, 1.32, 0.15, 5.12, 6.1, 3.52, 0] }, exec: { prog: 0, input: 0 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-XN0186', name: '测试项目46', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '软件开发、建模开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '船舶', kickoff: '2026/3/5', end: '2026/9/5', contractEnd: '2026/9/5', pm: '李经理', sales: '刘销售', pre: '李售前', dir: '刘经理', budget: { quote: 760000, eval: 758000, cost: 478800, profit: 37, total: 523183.45, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 380000, other: 0 }, pay: { contract: 746000, histPaid: 0, paid25: 0, pending25: 746000 }, hours: { eval: 13, plan: 16.8, act: 6.3, pmo: 3.20, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 2.4, 0.8, 0, 0] }, exec: { prog: 98, input: 111.33 }, control: '不可控', quality: 0, changes: [{ date: '2025/10/17', type: '人员变更', reason: '自身原因' }] },
    { id: 'TY-CJ0128-HB0235', name: '测试项目47', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '航天', kickoff: '2026/9/27', end: '2027/3/27', contractEnd: '2027/3/27', pm: '李经理', sales: '周销售', pre: '鲍售前', dir: '周经理', budget: { quote: 800000, eval: 0, cost: 0, profit: 0, total: 401380.38, human: 127969.75, travel: 29200, review: 0, risk: 4210.63, out: 240000, procure: 0, other: 0 }, pay: { contract: 780000, histPaid: 0, paid25: 0, pending25: 780000 }, hours: { eval: 1.8, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 0, input: 0 }, control: '不可控', quality: 15, changes: [] },
    { id: 'TY-HN0053', name: '测试项目48', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、采购', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区', industry: '船舶', kickoff: '2026/11/18', end: '2027/5/18', contractEnd: '2027/5/18', pm: '鲍经理', sales: '吕销售', pre: '吕售前', dir: '李经理', budget: { quote: 200000, eval: 300800, cost: 84200, profit: 57.92, total: 63968.5, human: 54918.5, travel: 3300, review: 0, risk: 5750, out: 0, procure: 0, other: 0 }, pay: { contract: 200000, histPaid: 0, paid25: 0, pending25: 200000 }, hours: { eval: 1.2, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 0, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HZ0098', name: '测试项目49', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '船舶', kickoff: '2026/6/9', end: '2026/12/9', contractEnd: '2026/12/9', pm: '刘经理', sales: '何销售', pre: '周售前', dir: '李经理', budget: { quote: 1600000, eval: 268800, cost: 68600, profit: 95.71, total: 103747.26, human: 61897.26, travel: 25850, review: 16000, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 1600000, histPaid: 0, paid25: 0, pending25: 1600000 }, hours: { eval: 12.8, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 75, input: 6.14 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0116', name: '测试项目50', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '创景可视（内转）', industry: '航天', kickoff: '2026/10/10', end: '2027/4/10', contractEnd: '2027/4/10', pm: '李经理', sales: '何销售', pre: '吕售前', dir: '周经理', budget: { quote: 180000, eval: 177600, cost: 56600, profit: 68.57, total: 66613.98, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 180000, histPaid: 0, paid25: 180000, pending25: 0 }, hours: { eval: 22.4, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 94, input: 139.87 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HD0126', name: '测试项目51', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区（西南）', industry: '船舶', kickoff: '2026/2/3', end: '2026/8/3', contractEnd: '2026/8/3', pm: '余经理', sales: '吕销售', pre: '王售前', dir: '李经理', budget: { quote: 580388.16, eval: 435600, cost: 118500, profit: 80.25, total: 168361.34, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 6000, other: 0 }, pay: { contract: 456585.46, histPaid: 0, paid25: 0, pending25: 456585.46 }, hours: { eval: 38.4, plan: 25.6, act: 14, pmo: 15.90, monthly: [0, 0.3, 2.7, 0.9, 1.7, 0.3, 1.4, 1, 3.2, 4.4, 0, 0] }, exec: { prog: 0, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HN0022', name: '测试项目52', sec: '', statusRaw: '已验收', phase: '售后阶段', nature: '软件开发', type: '开发项目', isBench: '是', level: '常规项目（D类项目）', region: '西区（西北）', industry: '船舶', kickoff: '2026/6/3', end: '2026/12/3', contractEnd: '2026/12/3', pm: '余经理', sales: '周销售', pre: '王售前', dir: '李经理', budget: { quote: 4530000, eval: 1604800, cost: 499200, profit: 88.98, total: 0, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 1750000, histPaid: 525000, paid25: 525000, pending25: 700000 }, hours: { eval: 23, plan: 17.8, act: 5.42, pmo: 4.30, monthly: [0, 0, 0, 0.12, 1.12, 2.06, 0.6, 0, 0, 0, 0.4, 0] }, exec: { prog: 0, input: 0 }, control: '可控', quality: 0, changes: [{ date: '2025/5/16', type: '预算变更', reason: '客户原因' }, { date: '2025/5/16', type: '预算变更', reason: '客户原因' }] },
    { id: 'TY-HN0024', name: '测试项目53', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区（华中）', industry: '航天', kickoff: '2026/2/3', end: '2026/7/30', contractEnd: '2026/7/30', pm: '鲍经理', sales: '王销售', pre: '何售前', dir: '周经理', budget: { quote: 0, eval: 0, cost: 0, profit: 0, total: 723713.7, human: 364338.7, travel: 160380, review: 60000, risk: 18995, out: 0, procure: 120000, other: 0 }, pay: { contract: 2980000, histPaid: 894000, paid25: 894000, pending25: 1192000 }, hours: { eval: 3.2, plan: 3.2, act: 15.8, pmo: 2.40, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2, 1.2] }, exec: { prog: 0, input: 0 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-HB0183', name: '测试项目54', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '是', level: '重点项目（C类项目）', region: '东区', industry: '船舶', kickoff: '2026/9/22', end: '2027/3/22', contractEnd: '2027/3/22', pm: '刘经理', sales: '何销售', pre: '何售前', dir: '鲍经理', budget: { quote: 810000, eval: 83200, cost: 21200, profit: 97.38, total: 63139.98, human: 23839.98, travel: 39300, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 810000, histPaid: 0, paid25: 243000, pending25: 567000 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 98.7, input: 94.43 }, control: '不可控', quality: 15, changes: [] },
    { id: 'TY-HZ0084', name: '测试项目55', sec: '', statusRaw: '延期', phase: '方案阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区（西南）', industry: '船舶', kickoff: '2026/5/7', end: '2026/11/7', contractEnd: '2026/11/7', pm: '周经理', sales: '吕销售', pre: '曾售前', dir: '李经理', budget: { quote: 1380000, eval: 1197000, cost: 458300, profit: 66.79, total: 475121, human: 211185, travel: 58936, review: 0, risk: 0, out: 160000, procure: 45000, other: 0 }, pay: { contract: 1385000, histPaid: 0, paid25: 900000, pending25: 485000 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 95, input: 2.17 }, control: '不可控', quality: 0, changes: [] },
    { id: 'TY-HD0172', name: '测试项目56', sec: '', statusRaw: '延期', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '西区（西北）', industry: '航天', kickoff: '2026/12/8', end: '2027/6/8', contractEnd: '2027/6/8', pm: '李经理', sales: '刘销售', pre: '李售前', dir: '李经理', budget: { quote: 1800000, eval: 0, cost: 0, profit: 0, total: 662655.39, human: 473882.89, travel: 10000, review: 0, risk: 117772.5, out: 0, procure: 61000, other: 0 }, pay: { contract: 1873620, histPaid: 1498896, paid25: 0, pending25: 374724 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 99.5, input: 99.89 }, control: '不可控', quality: 15, changes: [] },
    { id: 'TY-HN0031', name: '测试项目57', sec: '', statusRaw: '正在进行', phase: '立项阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区（华中）', industry: '船舶', kickoff: '2026/10/23', end: '2027/4/23', contractEnd: '2027/4/23', pm: '李经理', sales: '刘销售', pre: '李售前', dir: '李经理', budget: { quote: 160000, eval: 195000, cost: 74800, profit: 53.25, total: 41200.62, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 0, histPaid: 0, paid25: 0, pending25: 0 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 40, input: 60.04 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HB0130', name: '测试项目58', sec: '', statusRaw: '正在进行', phase: '方案阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '船舶', kickoff: '2026/8/18', end: '2027/2/18', contractEnd: '2027/2/18', pm: '周经理', sales: '周销售', pre: '鲍售前', dir: '王经理', budget: { quote: 7000000, eval: 0, cost: 0, profit: 0, total: 4895500, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 2597110, other: 0 }, pay: { contract: 7500000, histPaid: 2250000, paid25: 5250000, pending25: 0 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 60, input: 19.05 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-HZ0102', name: '测试项目59', sec: '', statusRaw: '正在进行', phase: '开发测试阶段', nature: '软件开发', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '东区', industry: '航天', kickoff: '2026/1/2', end: '2026/3/30', contractEnd: '2026/3/30', pm: '李经理', sales: '王销售', pre: '李售前', dir: '曾经理', budget: { quote: 4160000, eval: 2899200, cost: 937100, profit: 77.47, total: 851352.75, human: 797052.75, travel: 46300, review: 0, risk: 0, out: 0, procure: 0, other: 8000 }, pay: { contract: 4160000, histPaid: 0, paid25: 1870000, pending25: 2290000 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 0, input: 0 }, control: '可控', quality: 0, changes: [] },
    { id: 'TY-XN0202', name: '测试项目60', sec: 'SM', statusRaw: '正在进行', phase: '开发测试阶段', nature: '建模开发、软件开发、其他', type: '开发项目', isBench: '', level: '常规项目（D类项目）', region: '北区（华中）', industry: '船舶', kickoff: '2026/10/23', end: '2027/4/23', contractEnd: '2027/4/23', pm: '李经理', sales: '曾销售', pre: '李售前', dir: '曾经理', budget: { quote: 600000, eval: 436800, cost: 158300, profit: 68.34, total: 164151.25, human: 0, travel: 0, review: 0, risk: 0, out: 0, procure: 0, other: 0 }, pay: { contract: 600000, histPaid: 0, paid25: 185400, pending25: 414600 }, hours: { eval: 0, plan: 0, act: 0, pmo: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, exec: { prog: 99, input: 0 }, control: '可控', quality: 0, changes: [] }
];

export const MOCK_PROJECTS: Project[] = RAW_DATA.map((raw, index) => {
    const { status, comment } = determineStatus(raw.end, raw.statusRaw);
    const normalizedRegion = normalizeRegion(raw.region) as Region;

    const endD = new Date(parseDate(raw.end));
    const contractD = new Date(parseDate(raw.contractEnd));
    let delay = 0;
    if (status === ProjectStatus.Delayed) {
        if (!isNaN(endD.getTime()) && !isNaN(contractD.getTime())) {
            const diff = endD.getTime() - contractD.getTime();
            if (diff > 0) {
                delay = Math.ceil(diff / (1000 * 60 * 60 * 24 * 30));
            }
        }
    }

    let accYear = '';
    if (!isNaN(endD.getTime())) {
        accYear = endD.getFullYear().toString();
    }

    const natures = raw.nature ? raw.nature.split('、') : [];

    const score = raw.quality > 0 ? (raw.quality / 15) * 100 : 0;

    // GENERATE SIMULATED MILESTONES
    const simulatedMilestones = generateMilestones(raw.kickoff, raw.end, status);

    // MAP REAL RISK REASON FROM PROVIDED DATA
    const realRiskReason = RISK_REASONS_DATA[index] || '';

    return {
        id: raw.id,
        projectCode: raw.id,
        projectName: raw.name,
        securityLevel: raw.sec || '公开',
        status: status,
        statusComment: comment,
        riskReason: realRiskReason, // Added mapped field
        phase: normalizePhase(raw.phase),
        type: raw.type,
        nature: natures,
        level: raw.level,
        industry: raw.industry,
        region: normalizedRegion,
        isBenchmark: raw.isBench === '是',
        timeline: {
            acceptanceDate: raw.end,
            kickoffDate: raw.kickoff,
            plannedEndDate: raw.contractEnd,
            contractEndDate: raw.contractEnd,
            delayMonths: delay,
            acceptanceYear: accYear,
            acceptanceControl: raw.control
        },
        milestones: simulatedMilestones,
        budget: {
            initialQuote: raw.budget.quote,
            reqEvaluationFee: raw.budget.eval,
            internalCost: raw.budget.cost,
            internalProfit: raw.budget.profit,
            totalBudget: raw.budget.total,
            human: raw.budget.human,
            travel: raw.budget.travel,
            outsourcing: raw.budget.out,
            procurement: raw.budget.procure,
            business: 0,
            risk: raw.budget.risk,
            review: raw.budget.review,
            other: raw.budget.other,
            budgetUsedAmount: raw.budget.total * 0.8,
            outsourcingItems: generateOutsourcingItems(raw.budget.out + raw.budget.procure)
        },
        payment: {
            contractName: raw.name + '合同',
            groupCompany: '',
            contractAmount: raw.pay.contract,
            historicalPaid: raw.pay.histPaid,
            paid2026: raw.pay.paid25,
            pending: raw.pay.pending25,
            pendingThisYear: raw.pay.pending25,
            ratio: raw.pay.contract > 0 ? (raw.pay.histPaid + raw.pay.paid25) / raw.pay.contract : 0,
            totalPaid: raw.pay.histPaid + raw.pay.paid25,
            annualConfirmedRevenue: raw.pay.histPaid + raw.pay.paid25,
            acceptedPendingRevenue: raw.pay.pending25,
            isConfirmed: false,
            paymentNodes: []
        },
        manHours: {
            evaluated: raw.hours.eval,
            plannedTotal: raw.hours.plan,
            actualTB: raw.hours.act,
            pmoAnnualTotal: raw.hours.pmo,
            personnelDetails: generatePersonnel(raw.pm, raw.sales, raw.pre, raw.hours.monthly)
        },
        execution: {
            progress: raw.exec.prog,
            inputPercent: raw.exec.input
        },
        ratings: {
            preSalesTotal: 0,
            executionTotal: score,
            qualityScoreRaw: raw.quality,
            preSalesHard: [], preSalesSoft: [], executionHard: [], executionSoft: []
        },
        changes: raw.changes.map((c, i) => ({
            id: i + 1,
            projectId: raw.id,
            projectName: raw.name,
            projectManager: raw.pm,
            type: c.type as any, // ChangeType enum
            reasonCategory: '外部原因' as any, // ReasonCategory enum - default from data
            reason: c.reason,
            content: `关于${c.type}的详细说明...`,
            impactsPerformance: c.type.includes('预算'),
            changeDate: c.date,
            changeCount: 1,
            before: '变更前',
            after: '变更后'
        })),
        members: {
            projectManager: raw.pm,
            preSalesManager: raw.pre,
            salesManager: raw.sales,
            projectDirector: raw.dir,
            teamMembers: []
        },
        isHighlight: false // 添加缺失的 isHighlight 属性
    };
});

export {
  parseDate,
  formatDate,
  addDays,
  normalizePhase,
  normalizeRegion,
  normalizeSecurityLevel,
  determineStatus,
  calculateProjectStatus
};
