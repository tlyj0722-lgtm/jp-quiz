import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { Question } from '../types/domain.js';

export function sendWrongPdf(res: Response, opts: { name: string; studentId: string; wrongQuestions: Question[] }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // If you want CJK text to render correctly, provide a font file path (e.g., NotoSansCJK)
  const fontPath = process.env.PDF_FONT_PATH;
  if (fontPath) {
    try {
      doc.font(fontPath);
    } catch {
      // ignore
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="wrong-questions-${opts.studentId}.pdf"`);

  doc.pipe(res);

  doc.fontSize(18).text('錯題表', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`姓名: ${opts.name}    學號: ${opts.studentId}    匯出時間: ${new Date().toLocaleString('zh-TW')}`);
  doc.moveDown(1);

  if (opts.wrongQuestions.length === 0) {
    doc.fontSize(12).text('目前沒有錯題 🎉');
    doc.end();
    return;
  }

  const lineGap = 6;
  opts.wrongQuestions.forEach((q, idx) => {
    doc.fontSize(12).text(`${idx + 1}.`, { continued: true });
    doc.text(' ', { continued: true });

    if (q.type === 'sentence') {
      doc.text(q.cloze || '');
      if (q.clozeZh) doc.fontSize(10).text(q.clozeZh, { indent: 14 });
    } else {
      doc.text(`（單字題）${q.answerZh}`);
    }

    doc.moveDown(0.25);
    doc.fontSize(10).text(`正解(平假名): ${q.answerKana}`, { indent: 14 });
    doc.fontSize(10).text(`中文: ${q.answerZh}`, { indent: 14 });
    doc.fontSize(10).text(`單字原貌: ${q.wordOriginal}`, { indent: 14 });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeOpacity(0.2).stroke().strokeOpacity(1);
    doc.moveDown(0.5);
    doc.y += lineGap;
  });

  doc.end();
}
