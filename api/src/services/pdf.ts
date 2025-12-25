import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { Question } from "../types/domain.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ESM 下取得目前檔案目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 你可以把字型放在：api/assets/fonts/NotoSansCJKtc-Regular.otf
// 這裡用「預設路徑」+「可用 env 覆蓋」
function resolveFontPath() {
  // 1) env 覆蓋（如果你想用 Render 的 Secret File 或自訂路徑）
  const envPath = process.env.PDF_FONT_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) 預設：專案內字型（建議 commit 到 repo）
  //    依你檔案位置調整：此檔在 api/src/services/xxx.ts 的話，往上兩層到 api/
  const bundled = path.resolve(__dirname, "../../assets/fonts/NotoSansCJKtc-Regular.otf");
  if (fs.existsSync(bundled)) return bundled;

  // 3) 也容錯一下：某些 build/部署路徑會不同
  const bundledAlt = path.resolve(process.cwd(), "api/assets/fonts/NotoSansCJKtc-Regular.otf");
  if (fs.existsSync(bundledAlt)) return bundledAlt;

  return null;
}

export function sendWrongPdf(
  res: Response,
  opts: { name: string; studentId: string; wrongQuestions: Question[] }
) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ✅ CJK 字型（避免 PDF 亂碼）
  const fontPath = resolveFontPath();
  if (fontPath) {
    try {
      doc.registerFont("cjk", fontPath);
      doc.font("cjk");
    } catch {
      // 若字型載入失敗，仍繼續產生（但可能會亂碼）
    }
  }

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
      `姓名: ${opts.name}    學號: ${opts.studentId}    匯出時間: ${new Date().toLocaleString(
        "zh-TW"
      )}`
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
