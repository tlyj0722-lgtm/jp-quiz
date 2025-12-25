// api/src/services/tokenize.ts
// 完全不依賴 kuromoji / dict，避免雲端找不到 base.dat.gz 的問題
// 只做最保守的 token：逐字拆（能給 ParticleText 用；不需要字典）

export type ClozeToken = {
  text: string;
  blank?: boolean;
};

export function tokenizeClozeToTokens(cloze: string): ClozeToken[] {
  // 你原本的 cloze 可能含有 "（　）" 或 "()" 當作挖空
  // 我們把括號內容視為 blank（顯示空格）
  const s = cloze ?? "";

  const out: ClozeToken[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // 支援全形（　）
    if (ch === "（") {
      const j = s.indexOf("）", i + 1);
      if (j !== -1) {
        out.push({ text: "（　）", blank: true });
        i = j + 1;
        continue;
      }
    }

    // 支援半形 ()
    if (ch === "(") {
      const j = s.indexOf(")", i + 1);
      if (j !== -1) {
        out.push({ text: "( )", blank: true });
        i = j + 1;
        continue;
      }
    }

    // 其他字元就逐字 token
    out.push({ text: ch });
    i += 1;
  }

  return out;
}
