import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  HeadingLevel, AlignmentType, PageBreak,
  Header, Footer, PageNumber, NumberFormat,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  TableOfContents, ShadingType,
} from "docx";
import { TableSchema } from "../chart/diagram-generator";

interface ThesisChapter {
  title: string;
  content: string;
}

interface DiagramImage {
  label: string;
  caption: string;
  pngBuffer: Buffer;
  width: number;
  height: number;
}

interface ThesisOptions {
  title: string;
  author: string;
  chapters: ThesisChapter[];
  diagrams?: {
    architecture?: DiagramImage;
    er?: DiagramImage;
    useCase?: DiagramImage;
  };
  tableSchemas?: TableSchema[];
}

const chapterTitleMap: Record<string, string> = {
  abstract: "摘  要",
  introduction: "第一章 绪论",
  requirements: "第二章 需求分析",
  design: "第三章 系统设计",
  implementation: "第四章 系统实现",
  testing: "第五章 系统测试",
  conclusion: "第六章 总结与展望",
  references: "参考文献",
  acknowledgements: "致  谢",
};

const FONT_BODY = "SimSun";
const FONT_HEADING = "SimHei";
const BODY_SIZE = 24;
const LINE_SPACING = 360;

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.trim(), size: BODY_SIZE, font: FONT_BODY })],
    spacing: { after: 120, line: LINE_SPACING },
    indent: { firstLine: 480 },
  });
}

function captionParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: FONT_BODY, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200 },
  });
}

function imageParagraph(img: DiagramImage): Paragraph[] {
  const maxWidth = 550;
  const scale = Math.min(1, maxWidth / (img.width / 96 * 72));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  return [
    new Paragraph({
      children: [
        new ImageRun({
          data: img.pngBuffer,
          transformation: { width: w, height: h },
          type: "png",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
    captionParagraph(img.caption),
  ];
}

function buildFieldTable(schema: TableSchema): Paragraph[] {
  const result: Paragraph[] = [];

  result.push(
    new Paragraph({
      children: [new TextRun({
        text: `表 ${schema.displayName}（${schema.name}）结构`,
        size: 22,
        font: FONT_HEADING,
        bold: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
    })
  );

  const headerCells = ["字段名", "数据类型", "说明"].map(
    (text) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, font: FONT_BODY })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { type: ShadingType.SOLID, color: "E8E8E8" },
        width: { size: 33, type: WidthType.PERCENTAGE },
      })
  );

  const rows = [new TableRow({ children: headerCells, tableHeader: true })];

  for (const field of schema.fields) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: field.name, size: 20, font: "Consolas" })],
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: field.type, size: 20, font: "Consolas" })],
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: field.comment, size: 20, font: FONT_BODY })],
            })],
          }),
        ],
      })
    );
  }

  const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  const borders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

  result.push(
    new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...borders, insideHorizontal: borderStyle, insideVertical: borderStyle },
    }) as unknown as Paragraph
  );

  return result;
}

export async function buildDocx(options: ThesisOptions): Promise<Buffer> {
  const children: Paragraph[] = [];
  const { diagrams, tableSchemas } = options;

  // --- Cover page ---
  children.push(
    new Paragraph({ spacing: { after: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: "毕 业 论 文", bold: true, size: 56, font: FONT_HEADING })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: options.title, bold: true, size: 44, font: FONT_HEADING })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `作者：${options.author}`, size: 28, font: FONT_BODY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `日期：${new Date().getFullYear()} 年`, size: 28, font: FONT_BODY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // --- Table of contents placeholder ---
  children.push(
    new Paragraph({
      text: "目  录",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "（请在 Word 中右键此处 → 更新域 → 更新整个目录）",
        size: 20, font: FONT_BODY, italics: true, color: "888888",
      })],
      spacing: { after: 200 },
    })
  );

  try {
    children.push(new TableOfContents("目录", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }) as unknown as Paragraph);
  } catch {
    // fallback if TOC not supported
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- Chapters ---
  for (const chapter of options.chapters) {
    const chTitle = chapterTitleMap[chapter.title] || chapter.title;

    children.push(
      new Paragraph({
        text: chTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const paragraphs = chapter.content.split("\n").filter((p) => p.trim());
    for (const para of paragraphs) {
      const heading2Match = para.match(/^#{2}\s+(.+)/);
      const heading3Match = para.match(/^#{3}\s+(.+)/);

      if (heading2Match) {
        children.push(
          new Paragraph({
            text: heading2Match[1],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          })
        );
      } else if (heading3Match) {
        children.push(
          new Paragraph({
            text: heading3Match[1],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      } else {
        children.push(bodyParagraph(para));
      }
    }

    // Insert diagrams and tables at appropriate chapters
    if (chapter.title === "requirements" || chapter.title === "需求分析") {
      if (diagrams?.useCase) {
        children.push(
          new Paragraph({
            text: "系统用例分析",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
          bodyParagraph("根据上述需求分析，本系统的角色与功能模块关系如下图所示。"),
          ...imageParagraph(diagrams.useCase)
        );
      }
    }

    if (chapter.title === "design" || chapter.title === "系统设计") {
      if (diagrams?.architecture) {
        children.push(
          new Paragraph({
            text: "系统架构设计",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
          bodyParagraph("本系统采用前后端分离的B/S架构，整体架构如下图所示。"),
          ...imageParagraph(diagrams.architecture)
        );
      }

      if (diagrams?.er) {
        children.push(
          new Paragraph({
            text: "数据库设计",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
          bodyParagraph("根据系统需求分析，设计了如下数据库E-R图，展示各实体之间的关系。"),
          ...imageParagraph(diagrams.er)
        );
      }

      if (tableSchemas && tableSchemas.length > 0) {
        children.push(
          new Paragraph({
            text: "数据库表结构设计",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
          bodyParagraph(`本系统共设计了 ${tableSchemas.length} 张数据库表，各表的详细字段定义如下。`)
        );

        for (const schema of tableSchemas) {
          children.push(...buildFieldTable(schema));
        }
      }
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: options.title, size: 18, font: FONT_BODY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [new TextRun({ children: [PageNumber.CURRENT] })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
