/**
 * 智能报告生成页面
 * 提供周报/月报生成功能，支持全局、区域、个人三种范围
 * 先预览报告内容，再选择是否导出Word
 */

import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api.config';

interface ReportGeneratorPageProps {
  isAdmin: boolean;
}

// 辅助函数：获取当前周数
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// 辅助函数：获取指定周的日期范围
function getWeekDates(year: number, week: number): { start: string; end: string } {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay() + 1;
  const startDate = new Date(year, 0, daysOffset);
  const endDate = new Date(year, 0, daysOffset + 6);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

// 辅助函数：获取指定月份的日期范围
function getMonthDates(year: number, month: number): { start: string; end: string } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

// Markdown渲染组件
const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
  // 简单的Markdown渲染
  const renderMarkdown = (text: string) => {
    let html = text;

    // 处理标题
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-bold text-slate-800 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold text-slate-800 mt-6 mb-3 border-b border-slate-200 pb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-slate-900 mt-2 mb-4">$1</h1>');

    // 处理分隔线
    html = html.replace(/^---$/gm, '<hr class="border-t border-slate-200 my-4" />');

    // 处理粗体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>');

    // 处理表格
    html = html.replace(/\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g, (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;

      const headerCells = lines[0].split('|').filter(c => c.trim());
      const bodyLines = lines.slice(2);

      let tableHtml = '<table class="w-full border-collapse my-4 text-sm">';
      tableHtml += '<thead><tr>';
      headerCells.forEach(cell => {
        tableHtml += `<th class="border border-slate-200 px-3 py-2 bg-slate-50 font-medium text-left">${cell.trim()}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      bodyLines.forEach(line => {
        const cells = line.split('|').filter(c => c.trim());
        if (cells.length > 0) {
          tableHtml += '<tr>';
          cells.forEach(cell => {
            tableHtml += `<td class="border border-slate-200 px-3 py-2">${cell.trim()}</td>`;
          });
          tableHtml += '</tr>';
        }
      });

      tableHtml += '</tbody></table>';
      return tableHtml;
    });

    // 处理列表
    html = html.replace(/^- (.*$)/gm, '<li class="ml-4 text-slate-600">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>');

    // 处理数字列表
    html = html.replace(/^\d+\.\s+(.*$)/gm, '<li class="ml-4 text-slate-600">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, '<ol class="list-decimal my-2">$&</ol>');

    // 处理段落
    html = html.split('\n\n').map(para => {
      if (!para.trim() || para.startsWith('<')) return para;
      return `<p class="text-slate-600 my-2 leading-relaxed">${para}</p>`;
    }).join('\n');

    return html;
  };

  return (
    <div
      className="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

const ReportGeneratorPage: React.FC<ReportGeneratorPageProps> = ({ isAdmin }) => {
  // 报告配置状态
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [scope, setScope] = useState<'global' | 'region' | 'personal'>('global');
  const [region, setRegion] = useState<string>('');
  const [projectManager, setProjectManager] = useState<string>('');

  // 自定义文件名
  const [customFileName, setCustomFileName] = useState<string>('');

  // 时间选择（周/月）
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // 计算后的日期范围
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 下拉选项数据
  const [regions, setRegions] = useState<string[]>([]);
  const [projectManagers, setProjectManagers] = useState<string[]>([]);

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>('');

  // 生成的报告内容
  const [reportContent, setReportContent] = useState<string>('');
  const [toolCallsLog, setToolCallsLog] = useState<any[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');

  // API 配置状态
  const [apiConfigured, setApiConfigured] = useState(false);

  // 根据选择的周/月计算日期范围
  useEffect(() => {
    if (reportType === 'weekly') {
      const dates = getWeekDates(selectedYear, selectedWeek);
      setStartDate(dates.start);
      setEndDate(dates.end);
    } else {
      const dates = getMonthDates(selectedYear, selectedMonth);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  }, [reportType, selectedYear, selectedWeek, selectedMonth]);

  // 自动生成默认文件名
  useEffect(() => {
    const typeLabel = reportType === 'weekly' ? '周报' : '月报';
    const scopeLabel = scope === 'global' ? '全局' : scope === 'region' ? region : projectManager;
    const timeLabel = reportType === 'weekly'
      ? `${selectedYear}年第${selectedWeek}周`
      : `${selectedYear}年${selectedMonth}月`;
    const defaultName = `项目管理${typeLabel}_${scopeLabel}_${timeLabel}`;
    if (!customFileName || customFileName.startsWith('项目管理')) {
      setCustomFileName(defaultName);
    }
  }, [reportType, scope, region, projectManager, selectedYear, selectedWeek, selectedMonth]);

  // 加载区域和项目经理列表
  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取区域列表
        const regionsRes = await fetch(`${API_BASE_URL}/reports/regions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (regionsRes.ok) {
          const regionsData = await regionsRes.json();
          if (regionsData.success) {
            setRegions(regionsData.data);
          }
        }

        // 获取项目经理列表
        const pmRes = await fetch(`${API_BASE_URL}/reports/project-managers`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (pmRes.ok) {
          const pmData = await pmRes.json();
          if (pmData.success) {
            setProjectManagers(pmData.data);
          }
        }

        // 检查 API 配置
        const configRes = await fetch(`${API_BASE_URL}/reports/config`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.success) {
            setApiConfigured(configData.data.configured);
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err);
      }
    };

    loadData();
  }, []);

  // 生成报告（先预览）
  const handleGenerate = async () => {
    if (!apiConfigured) {
      setError('AI API 未配置，请在项目根目录的 APIKEY 文件中配置 API Key');
      return;
    }

    if (scope === 'region' && !region) {
      setError('请选择区域');
      return;
    }

    if (scope === 'personal' && !projectManager) {
      setError('请选择项目经理');
      return;
    }

    setIsGenerating(true);
    setError('');
    setReportContent('');

    try {
      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          reportType,
          scope,
          startDate,
          endDate,
          region: scope === 'region' ? region : undefined,
          projectManager: scope === 'personal' ? projectManager : undefined,
          exportFormat: 'markdown' // 先生成markdown预览
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          setError(errorData.error || '报告生成失败');
        } else {
          setError(`请求失败：${response.status} ${response.statusText}`);
        }
        setIsGenerating(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setReportContent(data.data.markdown || data.data.content);
        setToolCallsLog(data.data.toolCallsLog || []);
        setGeneratedAt(data.data.generatedAt || new Date().toISOString());
      } else {
        setError(data.error || '报告生成失败');
      }

    } catch (err: any) {
      setError(err.message || '报告生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出Word文档
  const handleExportWord = async () => {
    if (!reportContent) {
      setError('请先生成报告');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          reportType,
          scope,
          startDate,
          endDate,
          region: scope === 'region' ? region : undefined,
          projectManager: scope === 'personal' ? projectManager : undefined,
          exportFormat: 'docx'
        })
      });

      // 检查是否是文件响应
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/vnd.openxmlformats')) {
        const blob = await response.blob();
        const filename = `${customFileName}.docx`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // 显示成功提示
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        successDiv.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg><span>Word 报告已下载：${filename}</span>`;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
      } else {
        const data = await response.json();
        setError(data.error || '导出失败');
      }

    } catch (err: any) {
      setError(err.message || '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 清除报告
  const handleClearReport = () => {
    setReportContent('');
    setToolCallsLog([]);
    setGeneratedAt('');
    setError('');
  };

  // 非管理员提示
  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">权限不足</h3>
          <p className="text-sm text-slate-500">智能报告功能仅限管理员使用</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">智能报告生成</h1>
        <p className="text-sm text-slate-500 mt-1">使用 AI 自动生成项目管理周报/月报</p>
      </div>

      {/* API 配置警告 */}
      {!apiConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">AI API 未配置</p>
              <p className="text-xs text-amber-600 mt-1">
                请在项目根目录的 <code className="bg-amber-100 px-1 rounded">APIKEY</code> 文件中配置 ANTHROPIC_API_KEY
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 左侧配置面板 */}
        <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 shrink-0 overflow-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-4">报告配置</h2>

          {/* 报告类型 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">报告类型</label>
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('weekly')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reportType === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                周报
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reportType === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                月报
              </button>
            </div>
          </div>

          {/* 报告范围 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">报告范围</label>
            <div className="space-y-2">
              {[
                { id: 'global', label: '全局报告', desc: '覆盖所有区域、所有项目经理' },
                { id: 'region', label: '区域报告', desc: '指定区域的所有项目' },
                { id: 'personal', label: '个人报告', desc: '指定项目经理的项目' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScope(item.id as 'global' | 'region' | 'personal')}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                    scope === item.id
                      ? 'bg-indigo-50 border-2 border-indigo-500'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 区域选择 */}
          {scope === 'region' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">选择区域</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">请选择区域</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* 项目经理选择 */}
          {scope === 'personal' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">选择项目经理</label>
              <select
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">请选择项目经理</option>
                {projectManagers.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
          )}

          {/* 时间选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">时间选择</label>

            {reportType === 'weekly' ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">年份</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">周数</label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>第{w}周</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">年份</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">月份</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-2 px-2 py-1 bg-slate-50 rounded text-xs text-slate-500">
              日期范围：{startDate} 至 {endDate}
            </div>
          </div>

          {/* 文件名设置 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">文件名称</label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="请输入文件名"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              导出文件名：<span className="text-slate-600 font-medium">{customFileName}.docx</span>
            </p>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !apiConfigured}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isGenerating || !apiConfigured
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                正在生成...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                生成报告预览
              </>
            )}
          </button>
        </div>

        {/* 右侧内容展示 */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-w-0">
          {/* 错误提示 */}
          {error && (
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            </div>
          )}

          {/* 内容区域 */}
          <div className="flex-1 overflow-auto">
            {reportContent ? (
              <div className="p-6">
                {/* 报告概览头部 */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-emerald-800">报告已生成</h3>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          工具调用次数：{toolCallsLog.length} | 生成时间：{new Date(generatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearReport}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                      >
                        清除预览
                      </button>
                      <button
                        onClick={handleExportWord}
                        disabled={isExporting}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                          isExporting
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        }`}
                      >
                        {isExporting ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            导出中...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            导出 Word 文档
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 工具调用记录 */}
                  {toolCallsLog.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700 mb-2">AI 调用的数据工具：</p>
                      <div className="flex flex-wrap gap-1">
                        {toolCallsLog.map((log, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                          >
                            {log.tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 报告内容预览 */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <MarkdownPreview content={reportContent} />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">智能报告生成</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    AI 将自动调用数据工具获取项目信息，生成专业的周报/月报文档。
                    先预览报告内容，确认后可导出 Word 文档。
                  </p>

                  {/* 使用说明 */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">1</div>
                      <p className="text-sm text-slate-600">选择报告类型（周报/月报）</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">2</div>
                      <p className="text-sm text-slate-600">选择报告范围和数据时间</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">3</div>
                      <p className="text-sm text-slate-600">点击"生成报告预览"查看内容</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">4</div>
                      <p className="text-sm text-slate-600">确认后点击"导出 Word 文档"</p>
                    </div>
                  </div>

                  {/* 生成中的状态 */}
                  {isGenerating && (
                    <div className="mt-6 bg-indigo-50 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm font-medium text-indigo-700">正在生成报告，请稍候...</p>
                      </div>
                      <p className="text-xs text-indigo-500 mt-2">AI 正在调用工具获取数据，预计需要 10-30 秒</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorPage;