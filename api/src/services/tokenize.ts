import kuromoji from 'kuromoji';
import type { TokenSegment } from '../types/domain.js';

let tokenizerPromise: Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> | null = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dictPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
        if (err || !t) return reject(err);
        resolve(t);
      });
    });
  }
  return tokenizerPromise;
}

export async function tokenizeWithParticles(text: string): Promise<TokenSegment[]> {
  const tok = await getTokenizer();
  const tokens = tok.tokenize(text);
  return tokens.map((x) => ({
    text: x.surface_form,
    isParticle: x.pos === '助詞'
  })).filter((seg) => seg.text.length > 0);
}
