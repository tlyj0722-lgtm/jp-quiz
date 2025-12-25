import kuromoji from "kuromoji";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import type { TokenSegment } from "../types/domain.js";

const require = createRequire(import.meta.url);

let tokenizerPromise: Promise<any> | null = null;

function pickDictPath(): string {
  // 1) 最穩：直接用 cwd 找 node_modules（Render/本機都通）
  const cwdCandidate = path.join(process.cwd(), "node_modules", "kuromoji", "dict");

  // 2) 解析 kuromoji entry，再推回 package root 的 dict
  const entry = require.resolve("kuromoji"); // 常見：.../node_modules/kuromoji/src/kuromoji.js
  const entryDir = path.dirname(entry);

  // dict 可能在：
  // - .../kuromoji/dict  （entry 在 src）
  // - .../kuromoji/src/dict（少數情況）
  const resolvedCandidate1 = path.resolve(entryDir, "..", "dict");
  const resolvedCandidate2 = path.resolve(entryDir, "dict");

  const candidates = [cwdCandidate, resolvedCandidate1, resolvedCandidate2];

  for (const p of candidates) {
    const base = path.join(p, "base.dat.gz");
    if (fs.existsSync(base)) return p;
  }

  // 找不到就把候選路徑吐出來，方便你直接看 Render 在哪個路徑下跑
  throw new Error(
    `kuromoji dict not found. Tried:\n` +
      candidates.map((p) => `- ${p}`).join("\n") +
      `\n(cwd=${process.cwd()}, entry=${entry})`
  );
}

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      try {
        const dictPath = pickDictPath();
        kuromoji.builder({ dictPath }).build((err: any, tokenizer: any) => {
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
