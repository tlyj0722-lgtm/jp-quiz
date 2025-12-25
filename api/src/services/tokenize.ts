import type { TokenSegment } from '../types/domain.js';

// 簡單助詞表：越長越先比對（避免「から」被拆成「か」）
const PARTICLES = [
  'から', 'まで', 'より',
  'しか', 'だけ', 'でも', 'こそ', 'さえ', 'ほど', 'ばかり',
  'ので', 'のに',
  'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'や', 'も', 'か', 'の', 
];

function isHiragana(ch: string) {
  const code = ch.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

// 很保守的邊界判斷：
// - 前一字如果是日文(平假名/漢字/片假名)，也可能會誤判，但至少不需要字典檔。
// 你如果想更精準，我之後可以再加更強規則。
function canMarkAsParticle(text: string, start: number, len: number) {
  const prev = start > 0 ? text[start - 1] : '';
  const next = start + len < text.length ? text[start + len] : '';
  // 避免把「なん」這種詞的一部分亂標：如果前後都是平假名，通常是詞內部，就不標
  if (prev && next && isHiragana(prev) && isHiragana(next)) return false;
  return true;
}

export async function tokenizeWithParticles(text: string): Promise<TokenSegment[]> {
  const segments: TokenSegment[] = [];
  let i = 0;

  while (i < text.length) {
    let matched: string | null = null;

    for (const p of PARTICLES) {
      if (text.startsWith(p, i) && canMarkAsParticle(text, i, p.length)) {
        matched = p;
        break;
      }
    }

    if (matched) {
      segments.push({ text: matched, isParticle: true });
      i += matched.length;
    } else {
      // 收集一段非助詞文字，減少 segments 數量
      let j = i + 1;
      while (j < text.length) {
        let hit = false;
        for (const p of PARTICLES) {
          if (text.startsWith(p, j) && canMarkAsParticle(text, j, p.length)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
        j++;
      }
      segments.push({ text: text.slice(i, j), isParticle: false });
      i = j;
    }
  }

  // 去掉空段
  return segments.filter(s => s.text.length > 0);
}
