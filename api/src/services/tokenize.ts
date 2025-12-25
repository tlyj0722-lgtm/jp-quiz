import type { TokenSegment } from "../types/domain.js";

// 常見助詞清單（可再擴充）
const PARTICLES = [
  "は","が","を","に","へ","で","と","や","の","も","か","ね","よ","な","ぞ","さ",
  "から","まで","より","ほど","だけ","しか","ばかり","くらい","ぐらい",
  "でも","では","には","へは","とは","では","でも","なら","ので","のに",
  "て","で","たり","たり","ながら","つつ",
  "から","けれど","けど","が","ので","のに",
];

// 依長度排序，避免「では」先被拆成「で」「は」
const PARTICLES_SORTED = [...new Set(PARTICLES)].sort((a, b) => b.length - a.length);

// 建立一個 regex，把助詞當成「分隔符」保留在結果中
const particleRe = new RegExp(`(${PARTICLES_SORTED.map(escapeRegExp).join("|")})`, "g");

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 將文字切成片段，並標註哪些片段是助詞
 * - 不依賴 kuromoji 字典
 * - 雲端部署不會再出現 dict/base.dat.gz
 */
export async function tokenizeWithParticles(text: string): Promise<TokenSegment[]> {
  if (!text) return [];

  // 先用 regex 切分：助詞會被保留成獨立 token
  const raw = text.split(particleRe);

  // raw 會包含一般文字與助詞交錯
  const out: TokenSegment[] = [];
  for (const part of raw) {
    if (!part) continue;
    const isParticle = PARTICLES_SORTED.includes(part);
    out.push({ text: part, isParticle });
  }
  return out;
}
