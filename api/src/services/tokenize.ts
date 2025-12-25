import kuromoji from 'kuromoji';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TokenSegment } from '../types/domain.js';

let tokenizerPromise: Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> | null = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      // Render / Node runtime 的 cwd 可能不固定，所以這裡用多個候選路徑去找
      const here = path.dirname(fileURLToPath(import.meta.url));
      const candidates = [
        // 常見：啟動位置就是 api/，node_modules 在同層
        path.resolve(process.cwd(), 'node_modules/kuromoji/dict'),
        // 常見：啟動位置在 api/dist
        path.resolve(process.cwd(), '..', 'node_modules/kuromoji/dict'),
        // 常見：啟動位置在 api/src
        path.resolve(process.cwd(), '..', '..', 'node_modules/kuromoji/dict'),
        // 以目前檔案位置 (src/services) 反推專案根
        path.resolve(here, '..', '..', '..', 'node_modules/kuromoji/dict'),
        // 有些部署會把 node_modules 放在 dist 的附近
        path.resolve(here, '..', '..', 'node_modules/kuromoji/dict'),
      ];

      const dictPath = candidates.find((p) => fs.existsSync(path.join(p, 'base.dat.gz')));
      if (!dictPath) {
        return reject(
          new Error(`kuromoji dict not found. Tried:\n${candidates.join('\n')}`)
        );
      }

      kuromoji.builder({ dictPath }).build((err, t) => {
        if (err || !t) return reject(err);
        resolve(t);
      });
    });
  }
  return tokenizerPromise;
}

export async function tokenizeWithParticles(text: string): Promise<TokenSegment[]> {
  try {
    const tok = await getTokenizer();
    const tokens = tok.tokenize(text);

    return tokens
      .map((x) => ({
        text: x.surface_form,
        isParticle: x.pos === '助詞',
      }))
      .filter((seg) => seg.text.length > 0);
  } catch {
    // ⚠️ 找不到 dict 時不要讓整個 API 爆掉：
    // 就直接回傳一段（助詞不藍也沒關係，至少測驗可用）
    return [{ text, isParticle: false }];
  }
}
