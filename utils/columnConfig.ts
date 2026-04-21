
export interface ColumnConfig {
    id: string;
    label: string;
    group: string;
    fixed?: boolean;
}

export const COLUMN_GROUPS = [
    "身份与分类",
    "关键人员",
    "时间进度",
    "财务健康",
    "外协采购",
    "执行进度",
    "交付保障",
    "项目变更",
    "备注信息"
];

export const COLUMN_CONFIGS: ColumnConfig[] = [
    // I. Identity & Classification
    { id: 'projectName', label: '项目名称', group: '身份与分类', fixed: true },
    { id: 'projectCode', label: '项目编号', group: '身份与分类' },
    { id: 'region', label: '所属区域', group: '身份与分类' },
    { id: 'securityLevel', label: '密级', group: '身份与分类' },
    { id: 'level', label: '项目级别', group: '身份与分类' },
    { id: 'type', label: '项目类型', group: '身份与分类' },
    { id: 'industry', label: '行业', group: '身份与分类' },
    { id: 'isBenchmark', label: '是否为标杆项目', group: '身份与分类' },
    { id: 'isHighlight', label: '是否为亮点工程', group: '身份与分类' },
    { id: 'status', label: '项目状态', group: '身份与分类' },
    { id: 'milestoneNode', label: '里程碑节点', group: '身份与分类' },
    { id: 'phase', label: '项目阶段', group: '身份与分类' },
    { id: 'statusComment', label: '项目状态说明', group: '身份与分类' },

    // Personnel
    { id: 'projectManager', label: '项目经理', group: '关键人员' },
    { id: 'salesManager', label: '销售经理', group: '关键人员' },
    { id: 'preSalesManager', label: '售前经理', group: '关键人员' },
    { id: 'projectDirector', label: '项目总监', group: '关键人员' },

    // II. Timeline
    { id: 'projectCycle', label: '项目周期', group: '时间进度' },
    { id: 'kickoffDate', label: '立项日期', group: '时间进度' },
    { id: 'plannedEndDate', label: '计划结束日期', group: '时间进度' },
    { id: 'forecastAcceptanceDate', label: '预测验收时间', group: '时间进度' },
    { id: 'acceptanceDate', label: '验收日期', group: '时间进度' },

    // III. Budget & Cost
    { id: 'totalBudget', label: '预算总金额', group: '财务健康' },
    { id: 'budgetUsage', label: '预算使用情况', group: '财务健康' },
    { id: 'initialQuote', label: '初步报价', group: '财务健康' },
    { id: 'reqEvaluationFee', label: '需求评估费用', group: '财务健康' },
    { id: 'internalCost', label: '内部预估成本', group: '财务健康' },
    { id: 'internalProfit', label: '内部预估利润', group: '财务健康' },
    { id: 'marginRate', label: '毛利率', group: '财务健康' },

    // IV. Revenue & Payment
    { id: 'contractName', label: '合同名称', group: '财务健康' },
    { id: 'groupCompany', label: '集团公司', group: '财务健康' },
    { id: 'contractAmount', label: '合同总额', group: '财务健康' },
    { id: 'actualPaid', label: '已回款额度', group: '财务健康' },
    { id: 'pending', label: '未回款额度', group: '财务健康' },
    { id: 'acceptedPendingRevenue', label: '已验收待确认收入', group: '财务健康' },

    // V. Outsourcing 
    { id: 'outsourcerName', label: '外协单位名称', group: '外协采购' },
    { id: 'outsourcerAmount', label: '外协采购金额', group: '外协采购' },
    { id: 'outsourcerTechContent', label: '外协主要技术内容', group: '外协采购' },
    { id: 'equipmentSpec', label: '采购设备规格内容', group: '外协采购' },
    { id: 'outsourcerRatio', label: '外协采购费用占比', group: '外协采购' },

    // VI. Execution
    { id: 'inputPercent', label: '投入百分比 (%)', group: '执行进度' },
    { id: 'progress', label: '进度百分比 (%)', group: '执行进度' },
    { id: 'plannedTotalHours', label: '项目整体计划总工时', group: '执行进度' },
    { id: 'actualHours', label: '项目整体实际总工时', group: '执行进度' },

    // VII. Qualitative
    { id: 'acceptanceControl', label: '验收可控性', group: '交付保障' },
    { id: 'mainWorkCompleted', label: '主体工作是否完成', group: '交付保障' },

    // VIII. Changes
    { id: 'changeCount', label: '变更次数', group: '项目变更' },
    { id: 'lastChangeDate', label: '最近变更通过时间', group: '项目变更' },
    { id: 'documentReceivedDate', label: '验收单获取时间', group: '项目变更' },
    { id: 'receivedThankYouDate', label: '感谢信接收时间', group: '项目变更' },

    // IX. Remarks
    { id: 'remarks', label: '备注', group: '备注信息' },
];

export const getColumnConfig = (id: string) => COLUMN_CONFIGS.find(c => c.id === id);
