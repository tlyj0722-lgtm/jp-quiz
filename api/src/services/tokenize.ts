import kuromoji from "kuromoji";
import path from "path";
import type { TokenSegment } from "../types/domain.js";

let tokenizerPromise: Promise<any> | null = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      try {
        // ✅ 正確取得 kuromoji 安裝位置（Render / 雲端必備）
        const kuromojiPath = path.dirname(require.resolve("kuromoji"));
        const dictPath = path.join(kuromojiPath, "dict");

        kuromoji
          .builder({ dictPath })
          .build((err: any, tokenizer: any) => {
            if (err) return reject(err);
            resolve(tokenizer);
          });
      } catch (e) {
        reject(e);
      }
    });
  }
  return tokenizerPromise;
}

export async function tokenizeWithParticles(text: string): Promise<TokenSegment[]> {
  const tok = await getTokenizer();
  const tokens = tok.tokenize(text);

  return tokens
    .map((x: any) => ({
      text: x.surface_form,
      isParticle: x.pos === "助詞",
    }))
    .filter((seg: any) => seg.text && seg.text.length > 0);
}
