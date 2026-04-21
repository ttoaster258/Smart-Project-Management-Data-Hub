import { Project } from '../types';

/**
 * 安全解析日期字符串
 * 支持多种格式如: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY 等
 */
function parseDateSafe(dateStr: string): Date | null {
  if (!dateStr) return null;

  // 如果已经是 YYYY-MM-DD 格式，直接解析
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // 替换各种分隔符为 -
  const normalized = dateStr.replace(/[\/\\.]/g, '-');

  // 尝试解析标准化后的日期
  try {
    const date = new Date(normalized);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // 如果标准解析失败，尝试手动解析
  }

  // 如果上面的方法都失败，返回 null
  return null;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 更新项目日期字段
 * - 将所有项目的立项日期年份改为2026年
 * - 如果计划结束日期、预测验收时间、验收日期早于新的立项日期，则设为新立项日期6个月后
 */
export function updateProjectDates(projects: Project[]): Project[] {
  return projects.map(project => {
    // 解析当前立项日期并更新年份为2026
    const currentKickoffDate = parseDateSafe(project.timeline.kickoffDate);

    if (!currentKickoffDate) {
      // 如果无法解析原始日期，则保持原样
      return project;
    }

    const newKickoffDate = new Date(
      2026, // 年
      currentKickoffDate.getMonth(), // 月
      currentKickoffDate.getDate()  // 日
    );

    // 创建6个月后的日期（用于修正过期日期）
    const sixMonthsLater = new Date(newKickoffDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    // 解析其他日期
    const plannedEndDate = parseDateSafe(project.timeline.plannedEndDate);
    const acceptanceDate = parseDateSafe(project.timeline.acceptanceDate);
    const forecastAcceptanceDate = parseDateSafe(project.forecastAcceptanceDate || '');

    // 检查是否需要修正日期
    const correctedPlannedEndDate = plannedEndDate && plannedEndDate < newKickoffDate ? sixMonthsLater : plannedEndDate;
    const correctedAcceptanceDate = acceptanceDate && acceptanceDate < newKickoffDate ? sixMonthsLater : acceptanceDate;
    const correctedForecastAcceptanceDate = forecastAcceptanceDate && forecastAcceptanceDate < newKickoffDate ? sixMonthsLater : forecastAcceptanceDate;

    // 返回更新后的项目对象
    return {
      ...project,
      timeline: {
        ...project.timeline,
        kickoffDate: formatDate(newKickoffDate), // 格式化为 YYYY-MM-DD
        plannedEndDate: correctedPlannedEndDate ? formatDate(correctedPlannedEndDate) : project.timeline.plannedEndDate,
        acceptanceDate: correctedAcceptanceDate ? formatDate(correctedAcceptanceDate) : project.timeline.acceptanceDate,
        acceptanceYear: '2026', // 更新验收年份
      },
      forecastAcceptanceDate: correctedForecastAcceptanceDate ? formatDate(correctedForecastAcceptanceDate) : project.forecastAcceptanceDate
    };
  });
}

// 用于测试的简单函数
if (typeof require !== 'undefined' && require.main === module) {
  // 此处可以添加测试代码，但在这个环境中我们不会直接运行它
  console.log("Date update utility loaded");
}