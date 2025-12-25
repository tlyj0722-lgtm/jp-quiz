import kuromoji from "kuromoji";
import path from "path";
import { createRequire } from "module";
import type { TokenSegment } from "../types/domain.js";

const require = createRequire(import.meta.url);

let tokenizerPromise: Promise<any> | null = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      try {
        // ✅ ESM 環境不能直接用 require，但可以用 createRequire
        const kuromojiEntry = require.resolve("kuromoji");
        const kuromojiDir = path.dirname(kuromojiEntry);
        const dictPath = path.join(kuromojiDir, "dict");

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
