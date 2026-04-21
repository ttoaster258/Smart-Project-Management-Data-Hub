/**
 * Tool 定义文件
 * 定义 AI 可以调用的工具（函数）
 *
 * 支持的报告范围：
 * - global: 全局报告（所有项目）
 * - region: 区域报告（指定区域的项目）
 * - personal: 个人报告（指定项目经理的项目）
 */

// 工具定义数组
export const REPORT_TOOLS = [

  // ==================== 项目统计工具 ====================

  {
    name: 'get_project_stats',
    description: '获取项目统计数据，包括项目总数、新增数、完成数、延期数、合同总额、收入总额、回款总额等核心指标',
    input_schema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: '查询开始日期，格式：YYYY-MM-DD，例如：2026-04-01'
        },
        endDate: {
          type: 'string',
          description: '查询结束日期，格式：YYYY-MM-DD，例如：2026-04-07'
        },
        scope: {
          type: 'string',
          description: '报告范围：global=全局，region=区域，personal=个人',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域名称（仅当scope=region时需要），可选值：东区、南区、西区、北区（华中）、北区（华北，东北）'
        },
        projectManager: {
          type: 'string',
          description: '项目经理名称（仅当scope=personal时需要）'
        }
      },
      required: ['startDate', 'endDate', 'scope']
    }
  },

  // ==================== 区域业绩工具 ====================

  {
    name: 'get_region_performance',
    description: '获取区域业绩数据，包括各区域的项目数、收入、KPI达成率等。可获取所有区域数据或指定区域数据',
    input_schema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '区域名称（可选），不传则返回所有区域数据'
        }
      }
    }
  },

  // ==================== 行业分布工具 ====================

  {
    name: 'get_industry_distribution',
    description: '获取项目行业分布数据，包括各行业的项目数、合同额占比',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域名称（仅当scope=region时需要）'
        },
        projectManager: {
          type: 'string',
          description: '项目经理名称（仅当scope=personal时需要）'
        }
      },
      required: ['scope']
    }
  },

  // ==================== 风险项目工具 ====================

  {
    name: 'get_risk_projects',
    description: '获取风险项目列表，支持按风险类型（进度风险、成本风险、质量风险）筛选。可限定范围',
    input_schema: {
      type: 'object',
      properties: {
        riskType: {
          type: 'string',
          description: '风险类型：progress=进度风险，cost=成本风险，quality=质量风险',
          enum: ['progress', 'cost', 'quality']
        },
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域筛选（仅当scope=region时需要）'
        },
        projectManager: {
          type: 'string',
          description: '项目经理筛选（仅当scope=personal时需要）'
        }
      },
      required: ['riskType', 'scope']
    }
  },

  // ==================== 里程碑状态工具 ====================

  {
    name: 'get_milestone_status',
    description: '获取项目里程碑节点达成情况，包括各节点的完成数、延期数等',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域筛选'
        },
        projectManager: {
          type: 'string',
          description: '项目经理筛选'
        }
      },
      required: ['scope']
    }
  },

  // ==================== 变更分析工具 ====================

  {
    name: 'get_change_analysis',
    description: '获取项目变更统计，包括变更类型分布（人员/预算/进度）和主要变更原因',
    input_schema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: '查询开始日期'
        },
        endDate: {
          type: 'string',
          description: '查询结束日期'
        },
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域筛选'
        },
        projectManager: {
          type: 'string',
          description: '项目经理筛选'
        }
      },
      required: ['startDate', 'endDate', 'scope']
    }
  },

  // ==================== 财务健康度工具 ====================

  {
    name: 'get_financial_health',
    description: '获取财务健康度数据，包括毛利率分布、预算执行情况等',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域筛选'
        },
        projectManager: {
          type: 'string',
          description: '项目经理筛选'
        }
      },
      required: ['scope']
    }
  },

  // ==================== 重点项目工具 ====================

  {
    name: 'get_key_projects',
    description: '获取重点项目列表（重大项目、核心项目），包括项目基本信息和当前进度',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: '报告范围：global、region、personal',
          enum: ['global', 'region', 'personal']
        },
        region: {
          type: 'string',
          description: '区域筛选'
        },
        projectManager: {
          type: 'string',
          description: '项目经理筛选'
        },
        limit: {
          type: 'integer',
          description: '返回项目数量，默认10'
        }
      },
      required: ['scope']
    }
  },

  // ==================== 项目经理列表工具 ====================

  {
    name: 'get_project_managers',
    description: '获取项目经理列表，用于个人报告选择',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // ==================== 区域列表工具 ====================

  {
    name: 'get_regions',
    description: '获取区域列表，用于区域报告选择',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

export default REPORT_TOOLS;