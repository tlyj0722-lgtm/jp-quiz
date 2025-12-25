import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { Question } from "../types/domain.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ESM 下取得目前檔案目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 依你 repo 的實際位置：api/src/fonts/NotoSansTC-Regular.ttf
function resolveFontPath() {
  // 1) env 覆蓋（例如 Render secret file：/etc/secrets/xxx.ttf）
  const envPath = process.env.PDF_FONT_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) 最穩：用 process.cwd() 從 repo root 找（Render checkout 後通常會在 root）
  const cwdPath = path.resolve(process.cwd(), "api", "src", "fonts", "NotoSansTC-Regular.ttf");
  if (fs.existsSync(cwdPath)) return cwdPath;

  // 3) 若目前檔案是跑在 api/src/services/pdf.ts（dev / ts-node）
  const fromSrc = path.resolve(__dirname, "..", "fonts", "NotoSansTC-Regular.ttf"); // api/src/fonts/...
  if (fs.existsSync(fromSrc)) return fromSrc;

  // 4) 若目前檔案是跑在 api/dist/services/pdf.js（tsc 後）
  //    往上兩層回到 api/dist，再去 api/src/fonts（repo 仍會存在）
  const fromDistToSrc = path.resolve(__dirname, "..", "..", "src", "fonts", "NotoSansTC-Regular.ttf");
  if (fs.existsSync(fromDistToSrc)) return fromDistToSrc;

  return null;
}

export function sendWrongPdf(
  res: Response,
  opts: { name: string; studentId: string; wrongQuestions: Question[] }
) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ✅ CJK 字型（避免 PDF 亂碼）
  const fontPath = resolveFontPath();
  if (!fontPath) {
    // 直接讓它明確爆錯，否則你只會拿到「看似成功但亂碼」的 PDF
    throw new Error(
      "PDF font not found. Put NotoSansTC-Regular.ttf at api/src/fonts/ or set PDF_FONT_PATH."
    );
  }

  doc.registerFont("cjk", fontPath);
  doc.font("cjk");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="wrong-questions-${opts.studentId}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(18).text("錯題表", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .text(
      `姓名: ${opts.name}    學號: ${opts.studentId}    匯出時間: ${new Date().toLocaleString("zh-TW")}`
    );
  doc.moveDown(1);

  if (opts.wrongQuestions.length === 0) {
    doc.fontSize(12).text("目前沒有錯題 🎉");
    doc.end();
    return;
  }

  const lineGap = 6;
  opts.wrongQuestions.forEach((q, idx) => {
    doc.fontSize(12).text(`${idx + 1}.`, { continued: true });
    doc.text(" ", { continued: true });

    if (q.type === "sentence") {
      doc.text(q.cloze || "");
      if (q.clozeZh) doc.fontSize(10).text(q.clozeZh, { indent: 14 });
    } else {
      doc.text(`（單字題）${q.answerZh}`);
    }

    doc.moveDown(0.25);
    doc.fontSize(10).text(`正解(平假名): ${q.answerKana}`, { indent: 14 });
    doc.fontSize(10).text(`中文: ${q.answerZh}`, { indent: 14 });
    doc.fontSize(10).text(`單字原貌: ${q.wordOriginal}`, { indent: 14 });

    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeOpacity(0.2)
      .stroke()
      .strokeOpacity(1);
    doc.moveDown(0.5);
    doc.y += lineGap;
  });

  doc.end();
}
