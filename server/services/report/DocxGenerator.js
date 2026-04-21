/**
 * Word 文档生成器
 * 将 Markdown 报告转换为 Word 文档
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';

/**
 * Markdown 解析器
 */
class MarkdownParser {

  parse(markdownText) {
    const lines = markdownText.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 标题
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        elements.push({
          type: 'heading',
          level: 1,
          text: line.substring(2).trim()
        });
        i++;
      } else if (line.startsWith('## ')) {
        elements.push({
          type: 'heading',
          level: 2,
          text: line.substring(3).trim()
        });
        i++;
      } else if (line.startsWith('### ')) {
        elements.push({
          type: 'heading',
          level: 3,
          text: line.substring(4).trim()
        });
        i++;
      }
      // 表格
      else if (line.startsWith('|') && line.includes('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        elements.push({
          type: 'table',
          data: this.parseTable(tableLines)
        });
      }
      // 无序列表
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push({
          type: 'listItem',
          text: line.substring(2).trim()
        });
        i++;
      }
      // 有序列表
      else if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push({
            type: 'orderedListItem',
            number: parseInt(match[1]),
            text: match[2].trim()
          });
        }
        i++;
      }
      // 分割线
      else if (line.trim() === '---') {
        elements.push({ type: 'divider' });
        i++;
      }
      // 普通段落
      else if (line.trim().length > 0) {
        elements.push({
          type: 'paragraph',
          text: line
        });
        i++;
      }
      // 空行
      else {
        i++;
      }
    }

    return elements;
  }

  parseTable(tableLines) {
    if (tableLines.length < 2) {
      return { headers: [], rows: [] };
    }

    // 第一行是表头
    const headers = tableLines[0]
      .split('|')
      .filter(cell => cell.trim().length > 0)
      .map(cell => cell.trim());

    // 第二行是分隔线，跳过
    // 后续行是数据
    const rows = tableLines.slice(2).map(line => {
      return line
        .split('|')
        .filter(cell => cell.trim().length > 0)
        .map(cell => cell.trim());
    });

    return { headers, rows };
  }
}

const parser = new MarkdownParser();

/**
 * 生成 Word 文档
 */
async function generate(markdownContent, options = {}) {

  const elements = parser.parse(markdownContent);

  const docElements = [];

  // 文档标题
  if (options.title) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: options.title,
            bold: true,
            size: 48,
            color: '1F2937'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 }
      })
    );

    // 生成时间
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
            size: 22,
            color: '6B7280'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 }
      })
    );
  }

  // 转换各元素
  elements.forEach(el => {
    docElements.push(convertElement(el));
  });

  // 文档结尾
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '—— 智慧项目管理数据中心 ——',
          size: 20,
          color: '9CA3AF'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 }
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: docElements
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 转换元素为 Word 元素
 */
function convertElement(element) {

  switch (element.type) {

    case 'heading':
      return createHeading(element);

    case 'paragraph':
      return createParagraph(element);

    case 'table':
      return createTable(element.data);

    case 'listItem':
      return createListItem(element.text);

    case 'orderedListItem':
      return createOrderedListItem(element.number, element.text);

    case 'divider':
      return createDivider();

    default:
      return new Paragraph({ text: '' });
  }
}

/**
 * 创建标题
 */
function createHeading(element) {

  const levelMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3
  };

  const sizeMap = {
    1: 36,
    2: 28,
    3: 24
  };

  return new Paragraph({
    children: [
      new TextRun({
        text: element.text,
        bold: true,
        size: sizeMap[element.level] || 24,
        color: '1F2937'
      })
    ],
    heading: levelMap[element.level] || HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 }
  });
}

/**
 * 创建段落
 */
function createParagraph(element) {

  const textRuns = parseTextFormatting(element.text);

  return new Paragraph({
    children: textRuns,
    spacing: { before: 60, after: 60, line: 360 }
  });
}

/**
 * 解析文本格式（加粗等）
 */
function parseTextFormatting(text) {

  const runs = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {

    // 匹配前的普通文本
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.substring(lastIndex, match.index),
        size: 24
      }));
    }

    // 加粗文本
    runs.push(new TextRun({
      text: match[1],
      bold: true,
      size: 24
    }));

    lastIndex = match.index + match[0].length;
  }

  // 剩余文本
  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.substring(lastIndex),
      size: 24
    }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text, size: 24 })];
}

/**
 * 创建表格
 */
function createTable(tableData) {

  const { headers, rows } = tableData;

  if (headers.length === 0) {
    return new Paragraph({ text: '' });
  }

  // 表头行
  const headerRow = new TableRow({
    children: headers.map(header =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: header,
                bold: true,
                size: 22,
                color: 'FFFFFF'
              })
            ],
            alignment: AlignmentType.CENTER
          })
        ],
        shading: { fill: '2563EB' },
        width: {
          size: 100 / headers.length,
          type: WidthType.PERCENTAGE
        }
      })
    ),
    tableHeader: true
  });

  // 数据行
  const dataRows = rows.map((row, index) =>
    new TableRow({
      children: row.map((cell, cellIndex) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell || '-',
                  size: 22
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ],
          shading: {
            fill: index % 2 === 0 ? 'F3F4F6' : 'FFFFFF'
          },
          width: {
            size: 100 / headers.length,
            type: WidthType.PERCENTAGE
          }
        })
      )
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
    }
  });
}

/**
 * 创建列表项
 */
function createListItem(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `• ${text}`,
        size: 24
      })
    ],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 }
  });
}

/**
 * 创建有序列表项
 */
function createOrderedListItem(number, text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${number}. ${text}`,
        size: 24
      })
    ],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 }
  });
}

/**
 * 创建分割线
 */
function createDivider() {
  return new Paragraph({
    border: {
      bottom: {
        color: 'E5E7EB',
        size: 6,
        style: BorderStyle.SINGLE
      }
    },
    spacing: { before: 200, after: 200 }
  });
}

export default { generate };