/**
 * 报告生成器
 * 使用 Tool Use 方式生成报告
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REPORT_TOOLS } from './ToolDefinitions.js';
import { executeTool } from './ToolExecutor.js';
import DocxGenerator from './DocxGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载配置（配置文件在项目根目录）
const configPath = path.join(__dirname, '../../../APIKEY');

function loadConfig() {
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = {};

    configContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=');
        config[key.trim()] = value.trim();
      }
    });

    return config;
  }

  // 默认配置
  return {
    ANTHROPIC_BASE_URL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_MODEL: 'glm-5',
    MAX_OUTPUT_TOKENS_WEEKLY: 6000,
    MAX_OUTPUT_TOKENS_MONTHLY: 10000,
    TEMPERATURE: 0.3
  };
}

const config = loadConfig();

// 初始化 Anthropic 客户端
const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || 'dummy-key',
  baseURL: config.ANTHROPIC_BASE_URL
});

/**
 * 生成报告
 * @param {object} params - 生成参数
 * @param {string} params.reportType - 报告类型：weekly 或 monthly
 * @param {string} params.scope - 报告范围：global、region、personal
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.region - 区域（仅 scope=region 时需要）
 * @param {string} params.projectManager - 项目经理（仅 scope=personal 时需要）
 * @param {string} params.exportFormat - 导出格式：markdown、docx、pdf
 * @returns {object} - 生成结果
 */
export async function generateReport(params) {

  const { reportType, scope, startDate, endDate, region, projectManager, exportFormat } = params;

  console.log('[ReportGenerator] 开始生成报告');
  console.log('[ReportGenerator] 参数：', JSON.stringify(params, null, 2));

  // 验证参数
  if (!reportType || !scope || !startDate || !endDate) {
    throw new Error('缺少必要参数：reportType, scope, startDate, endDate');
  }

  if (scope === 'region' && !region) {
    throw new Error('区域报告需要指定 region 参数');
  }

  if (scope === 'personal' && !projectManager) {
    throw new Error('个人报告需要指定 projectManager 参数');
  }

  // 构建初始提示词
  const initialPrompt = buildInitialPrompt(reportType, scope, startDate, endDate, region, projectManager);

  // 确定 max_tokens
  const maxTokens = reportType === 'monthly'
    ? parseInt(config.MAX_OUTPUT_TOKENS_MONTHLY || 10000)
    : parseInt(config.MAX_OUTPUT_TOKENS_WEEKLY || 6000);

  // 发送初始请求
  let response = await client.messages.create({
    model: config.ANTHROPIC_MODEL || 'glm-5',
    max_tokens: maxTokens,
    temperature: parseFloat(config.TEMPERATURE || 0.3),
    tools: REPORT_TOOLS,
    messages: [{
      role: 'user',
      content: initialPrompt
    }]
  });

  // 检查响应格式
  if (!response.content || !Array.isArray(response.content)) {
    console.error('[ReportGenerator] 初始响应格式异常:', response);
    throw new Error('API响应格式异常，请重试');
  }

  // 处理多轮工具调用
  const toolCallsLog = [];
  let roundCount = 0;
  const maxRounds = 15; // 最大调用轮数，防止无限循环

  // 定义必需的工具调用（用于智能检测）
  const requiredTools = [
    'get_project_stats',
    'get_region_performance',
    'get_industry_distribution',
    'get_milestone_status',
    'get_risk_projects',
    'get_key_projects'
  ];

  // 累积对话历史 - 关键：保留所有工具调用和结果
  const conversationHistory = [
    { role: 'user', content: initialPrompt }
  ];

  // 已调用的工具集合
  const calledTools = new Set();

  while (response.stop_reason === 'tool_use' && roundCount < maxRounds) {

    roundCount++;
    console.log(`[ReportGenerator] 第 ${roundCount} 轮工具调用`);

    // 安全检查响应内容
    if (!Array.isArray(response.content)) {
      console.error('[ReportGenerator] 响应content不是数组:', typeof response.content);
      break;
    }

    // 获取工具调用请求
    const toolUseBlock = response.content.find(block => block.type === 'tool_use');

    if (!toolUseBlock) {
      console.error('[ReportGenerator] 未找到 tool_use block');
      break;
    }

    // 记录已调用的工具
    calledTools.add(toolUseBlock.name);

    // 记录日志
    toolCallsLog.push({
      round: roundCount,
      tool: toolUseBlock.name,
      input: toolUseBlock.input,
      timestamp: new Date().toISOString()
    });

    // 执行工具
    const toolResult = await executeTool(toolUseBlock.name, toolUseBlock.input);

    console.log(`[ReportGenerator] 工具 ${toolUseBlock.name} 执行完成`);
    console.log(`[ReportGenerator] 工具返回数据:`, JSON.stringify(toolResult, null, 2));

    // 将工具结果转换为字符串格式
    // 阿里云百炼 API 要求 tool_result 的 content 是字符串类型
    let resultContent;
    if (typeof toolResult === 'string') {
      resultContent = toolResult;
    } else if (toolResult && typeof toolResult === 'object') {
      // 如果是对象，转换为格式化的 JSON 字符串
      resultContent = JSON.stringify(toolResult, null, 2);
    } else {
      resultContent = String(toolResult || '');
    }

    console.log(`[ReportGenerator] 工具结果长度: ${resultContent.length} 字符`);

    // 检查是否已获取所有必需数据
    const hasAllRequiredData = requiredTools.every(tool => calledTools.has(tool));
    console.log(`[ReportGenerator] 已调用工具: ${Array.from(calledTools).join(', ')}`);
    console.log(`[ReportGenerator] 是否已获取所有必需数据: ${hasAllRequiredData}`);

    // 如果已获取足够数据，在工具结果后添加提示
    let finalResultContent = resultContent;
    if (hasAllRequiredData && roundCount >= 6) {
      // 检查是否需要继续调用工具
      const optionalTools = ['get_change_analysis', 'get_financial_health'];
      const hasOptionalTools = optionalTools.some(tool => calledTools.has(tool));

      if (hasOptionalTools || roundCount >= 8) {
        finalResultContent = resultContent + '\n\n---\n💡 提示：你已获取了所有必需数据。现在请停止调用工具，直接根据这些真实数据生成完整的报告。不要再调用更多工具。';
        console.log('[ReportGenerator] 添加停止提示，引导AI生成报告');
      }
    }

    // 累积对话历史：添加assistant响应和tool_result
    conversationHistory.push({ role: 'assistant', content: response.content });
    conversationHistory.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseBlock.id,
        content: finalResultContent,
        is_error: false
      }]
    });

    // 如果已获取足够数据且收到停止提示，使用不带tools的请求强制生成报告
    if (hasAllRequiredData && roundCount >= 8) {
      console.log('[ReportGenerator] 已获取足够数据，强制生成报告');
      try {
        response = await client.messages.create({
          model: config.ANTHROPIC_MODEL || 'glm-5',
          max_tokens: maxTokens,
          temperature: parseFloat(config.TEMPERATURE || 0.3),
          // 不传递tools，强制AI生成文本
          messages: conversationHistory
        });

        if (response.content && Array.isArray(response.content)) {
          const hasText = response.content.some(block => block.type === 'text');
          if (hasText) {
            console.log('[ReportGenerator] 成功获取文本报告');
            break; // 退出循环，开始生成报告
          }
        }
      } catch (err) {
        console.error('[ReportGenerator] 强制生成失败:', err.message);
      }
    }

    // 返回结果给 Claude - 使用累积的对话历史
    response = await client.messages.create({
      model: config.ANTHROPIC_MODEL || 'glm-5',
      max_tokens: maxTokens,
      temperature: parseFloat(config.TEMPERATURE || 0.3),
      tools: REPORT_TOOLS,
      messages: conversationHistory
    });

    // 检查响应格式
    if (!response.content || !Array.isArray(response.content)) {
      console.error('[ReportGenerator] 第${roundCount}轮响应格式异常');
      break;
    }

    console.log(`[ReportGenerator] 第 ${roundCount} 轮响应 stop_reason: ${response.stop_reason}`);
    console.log(`[ReportGenerator] 响应内容类型: ${response.content.map(b => b.type).join(', ')}`);

    // 如果 stop_reason 是 end_turn，说明AI已经完成
    if (response.stop_reason === 'end_turn') {
      console.log('[ReportGenerator] AI已主动结束，开始提取报告');
      break;
    }
  }

  // 检查是否达到最大轮数
  if (roundCount >= maxRounds && response.stop_reason === 'tool_use') {
    console.log('[ReportGenerator] 达到最大轮数限制，强制结束');

    // 添加assistant响应到历史，然后发送强制结束消息
    conversationHistory.push({ role: 'assistant', content: response.content });

    // 简化处理：告诉AI停止调用工具，开始生成报告（保留对话历史）
    try {
      response = await client.messages.create({
        model: config.ANTHROPIC_MODEL || 'glm-5',
        max_tokens: maxTokens,
        temperature: parseFloat(config.TEMPERATURE || 0.3),
        messages: [
          ...conversationHistory,
          { role: 'user', content: '请根据你刚才获取的所有数据，直接生成完整的项目管理报告，以Markdown格式输出。不要再调用任何工具。所有数据必须使用你刚才获取的真实数据。' }
        ]
      });

      // 检查响应
      if (!response.content || !Array.isArray(response.content)) {
        throw new Error('强制结束响应格式异常');
      }
    } catch (err) {
      console.error('[ReportGenerator] 强制结束请求失败:', err.message);
      // 继续使用之前的响应
    }
  }

  // 提取最终报告文本
  console.log('[ReportGenerator] 最终响应内容:', response.content);
  const textBlock = response.content.find(block => block.type === 'text');

  if (!textBlock) {
    console.error('[ReportGenerator] 未找到 text block，响应内容:', JSON.stringify(response.content, null, 2));
    throw new Error('报告生成失败：AI 未返回文本内容，可能需要更多轮次或调整参数');
  }

  const markdownContent = textBlock.text;

  console.log('[ReportGenerator] 报告生成完成');
  console.log(`[ReportGenerator] 工具调用次数：${roundCount}`);
  console.log(`[ReportGenerator] 工具调用记录：`, toolCallsLog);

  // 根据导出格式处理
  let outputContent = markdownContent;
  let outputFormat = 'markdown';

  if (exportFormat === 'docx') {
    const docxBuffer = await DocxGenerator.generate(markdownContent, {
      title: getReportTitle(reportType, scope, startDate, endDate, region, projectManager)
    });
    outputContent = docxBuffer;
    outputFormat = 'docx';
  }

  return {
    content: outputContent,
    format: outputFormat,
    markdown: markdownContent,
    toolCallsLog,
    roundCount,
    generatedAt: new Date().toISOString()
  };
}

/**
 * 构建初始提示词
 */
function buildInitialPrompt(reportType, scope, startDate, endDate, region, projectManager) {

  // 报告类型配置
  const typeConfig = {
    weekly: {
      title: '项目管理周报',
      focus: '本周进展、下周计划、短期风险',
      structure: `
报告结构要求：
1. 本周概述（约150字，概括核心数据和主要进展）
2. 项目统计概览（使用表格展示关键指标）
3. 里程碑进展（本周完成的节点和延期情况）
4. 风险预警（三类风险的简要分析）
5. 重点事项跟进（TOP 5 重点项目状态）
6. 下周工作计划（3-5条具体安排）
`
    },
    monthly: {
      title: '项目管理月报',
      focus: '月度业绩分析、财务健康度、变更分析、深度风险评估',
      structure: `
报告结构要求：
1. 本月概述（约300字，核心指标汇总及月度亮点）
2. 项目统计详表（项目总数、新增、完成、延期等详细数据）
3. 区域业绩分析（各区域KPI达成情况对比，差距分析）
4. 行业分布分析（占比及变化趋势）
5. 里程碑达成分析（各节点完成率和延期情况）
6. 变更情况汇总（变更类型统计、主要原因分析）
7. 财务健康度分析（毛利率分布、预算执行情况）
8. 风险项目追踪（三类风险详细分析、建议措施）
9. 重点项目进展（TOP 10 项目状态更新）
10. 下月工作建议（5-8条，按优先级排序）
`
    }
  };

  // 范围描述
  const scopeDescriptions = {
    global: '全局报告（覆盖所有区域、所有项目经理）',
    region: `区域报告（仅覆盖 ${region} 区域）`,
    personal: `个人报告（仅覆盖项目经理 ${projectManager} 负责的项目）`
  };

  const config = typeConfig[reportType] || typeConfig.weekly;

  return `
请生成一份【${config.title}】

## 基本信息
- 时间范围：${startDate} 至 ${endDate}
- 报告范围：${scopeDescriptions[scope]}
- 报告类型：${reportType === 'weekly' ? '周报' : '月报'}

## ⚠️ 重要规则 - 必须严格遵守

1. **所有数据必须来自工具调用结果**，禁止编造、估算或猜测任何数据
2. **金额数值**：必须使用工具返回的精确数值，不要随意修改
3. **行业分布**：使用真实返回的行业名称和数量
4. **区域数据**：使用真实返回的区域名称和数值
5. **重点项目**：如果返回空数组，写"当前无重点项目数据"

## 🔄 工具调用顺序（请按此顺序调用）

**第一步：获取核心统计数据**
调用 get_project_stats 获取项目总数、合同总额、收入、回款等

**第二步：获取区域和行业分布**
- 调用 get_region_performance 获取各区域业绩
- 调用 get_industry_distribution 获取行业分布

**第三步：获取进度和风险数据**
- 调用 get_milestone_status 获取里程碑状态
- 调用 get_risk_projects（参数 riskType="progress"）获取进度风险
- 调用 get_risk_projects（参数 riskType="cost"）获取成本风险
- 调用 get_risk_projects（参数 riskType="quality"）获取质量风险

**第四步：获取重点项目**
调用 get_key_projects 获取重点项目列表

**第五步：生成报告**
完成以上工具调用后，立即停止调用工具，根据获取的真实数据生成报告。
不要再调用其他工具（get_change_analysis、get_financial_health 等可选工具）。

${config.structure}

## 输出要求
1. 使用 Markdown 格式输出
2. 表格使用 Markdown 表格语法
3. 重要数据加粗显示
4. 空数据如实报告"当前无该类数据"

请开始生成报告。按上述顺序调用工具获取数据，获取完成后立即生成报告。
`;
}

/**
 * 获取报告标题
 */
function getReportTitle(reportType, scope, startDate, endDate, region, projectManager) {

  const typeName = reportType === 'monthly' ? '月报' : '周报';

  const scopeName = scope === 'global' ? '全局报告' :
                   scope === 'region' ? `${region}区域报告` :
                   `${projectManager}个人报告`;

  return `项目管理${typeName} - ${scopeName}（${startDate} 至 ${endDate}）`;
}

export default generateReport;