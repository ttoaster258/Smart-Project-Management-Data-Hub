/**
 * PDF 文档生成器
 * 将 Markdown 报告转换为 PDF 文档
 *
 * 注意：需要中文字体支持
 * 请将中文字体文件放置在 server/fonts/ 目录下
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 字体路径
const fontsDir = path.join(__dirname, '../../fonts');
const defaultFont = path.join(fontsDir, 'SimSun.ttf');

// 检查字体是否存在
const hasChineseFont = fs.existsSync(defaultFont);

/**
 * Markdown 解析器（简化版）
 */
class SimpleMarkdownParser {

  parse(markdownText) {
    const lines = markdownText.split('\n');
    const elements = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('# ') && !line.startsWith('## ')) {
        elements.push({ type: 'heading', level: 1, text: line.substring(2).trim() });
      } else if (line.startsWith('## ')) {
        elements.push({ type: 'heading', level: 2, text: line.substring(3).trim() });
      } else if (line.startsWith('### ')) {
        elements.push({ type: 'heading', level: 3, text: line.substring(4).trim() });
      } else if (line.startsWith('|') && line.includes('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        i--;
        elements.push({ type: 'table', data: this.parseTable(tableLines) });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push({ type: 'listItem', text: line.substring(2).trim() });
      } else if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push({ type: 'orderedListItem', number: parseInt(match[1]), text: match[2].trim() });
        }
      } else if (line.trim() === '---') {
        elements.push({ type: 'divider' });
      } else if (line.trim().length > 0) {
        elements.push({ type: 'paragraph', text: line.replace(/\*\*/g, '') });
      }
    }

    return elements;
  }

  parseTable(tableLines) {
    if (tableLines.length < 2) return { headers: [], rows: [] };

    const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
    const rows = tableLines.slice(2).map(line =>
      line.split('|').filter(c => c.trim()).map(c => c.trim())
    );

    return { headers, rows };
  }
}

const parser = new SimpleMarkdownParser();

/**
 * 生成 PDF 文档
 */
async function generate(markdownContent, options = {}) {

  const elements = parser.parse(markdownContent);

  // 创建 PDF 文档
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: options.title || '项目管理报告',
      Author: '智慧项目管理数据中心',
      Subject: '自动生成报告'
    }
  });

  // 注册中文字体
  if (hasChineseFont) {
    doc.registerFont('Chinese', defaultFont);
    doc.font('Chinese');
  }

  // 文档标题
  if (options.title) {
    doc.fontSize(18).fillColor('#1F2937').text(options.title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6B7280').text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'center' });
    doc.moveDown(1);
  }

  // 渲染各元素
  elements.forEach(element => {
    renderElement(doc, element);
  });

  // 文档结尾
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#9CA3AF').text('—— 智慧项目管理数据中心 ——', { align: 'center' });

  // 导出为 Buffer
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.end();

  return new Promise(resolve => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * 渲染元素
 */
function renderElement(doc, element) {

  // 检查是否需要换页
  if (doc.y > 700) {
    doc.addPage();
  }

  switch (element.type) {

    case 'heading':
      renderHeading(doc, element);
      break;

    case 'paragraph':
      renderParagraph(doc, element);
      break;

    case 'table':
      renderTable(doc, element.data);
      break;

    case 'listItem':
      renderListItem(doc, element.text);
      break;

    case 'orderedListItem':
      renderOrderedListItem(doc, element.number, element.text);
      break;

    case 'divider':
      renderDivider(doc);
      break;
  }
}

/**
 * 渲染标题
 */
function renderHeading(doc, element) {

  const fontSizeMap = { 1: 16, 2: 14, 3: 12 };
  doc.fontSize(fontSizeMap[element.level] || 12);
  doc.fillColor('#1F2937');
  doc.text(element.text, { underline: element.level === 1 });
  doc.moveDown(0.5);
}

/**
 * 渲染段落
 */
function renderParagraph(doc, element) {
  doc.fontSize(11).fillColor('#374151');
  doc.text(element.text, { lineGap: 4 });
  doc.moveDown(0.3);
}

/**
 * 渲染表格
 */
function renderTable(doc, tableData) {

  const { headers, rows } = tableData;

  if (headers.length === 0) return;

  const pageWidth = doc.page.width - 100;
  const colWidth = pageWidth / headers.length;
  const rowHeight = 22;

  // 表头背景
  doc.fillColor('#2563EB');
  doc.rect(50, doc.y, pageWidth, rowHeight).fill();

  // 表头文字
  doc.fillColor('#FFFFFF').fontSize(10);
  headers.forEach((header, i) => {
    doc.text(header, 50 + i * colWidth + 5, doc.y + 6, {
      width: colWidth - 10,
      align: 'center'
    });
  });

  doc.y += rowHeight;

  // 数据行
  rows.forEach((row, rowIndex) => {

    if (doc.y > 700) {
      doc.addPage();
    }

    // 偶数行背景
    if (rowIndex % 2 === 0) {
      doc.fillColor('#F3F4F6');
      doc.rect(50, doc.y, pageWidth, rowHeight).fill();
    }

    doc.fillColor('#374151').fontSize(9);

    row.forEach((cell, i) => {
      doc.text(cell || '-', 50 + i * colWidth + 5, doc.y + 6, {
        width: colWidth - 10,
        align: 'center'
      });
    });

    // 行边框
    doc.strokeColor('#E5E7EB');
    doc.rect(50, doc.y, pageWidth, rowHeight).stroke();

    doc.y += rowHeight;
  });

  doc.moveDown(0.5);
}

/**
 * 渲染列表项
 */
function renderListItem(doc, text) {
  doc.fontSize(11).fillColor('#374151');
  doc.text(`• ${text}`, { indent: 20 });
  doc.moveDown(0.2);
}

/**
 * 渲染有序列表项
 */
function renderOrderedListItem(doc, number, text) {
  doc.fontSize(11).fillColor('#374151');
  doc.text(`${number}. ${text}`, { indent: 20 });
  doc.moveDown(0.2);
}

/**
 * 渲染分割线
 */
function renderDivider(doc) {
  doc.strokeColor('#E5E7EB');
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.5);
}

export default { generate };