// api/src/services/tokenize.ts
// Lightweight tokenizer to split Japanese particles for UI highlighting.
// No kuromoji / no dict files needed.

export type ParticleToken = {
  t: string;
  particle: boolean;
};

// Common particles / auxiliary chunks (longer first to avoid partial matches)
const PARTICLES = [
  "では", "には", "とは", "へと",
  "から", "まで", "より", "だけ", "ほど", "くらい",
  "など", "なんて",
  "で", "に", "へ", "と", "が", "を", "は", "も", "や", "の", "か",
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build regex: split by particles while keeping them
const particleRe = new RegExp(`(${PARTICLES.map(escapeRegExp).join("|")})`, "g");

export function tokenizeWithParticles(input: string): ParticleToken[] {
  const text = (input ?? "").toString();
  if (!text.trim()) return [];

  const parts = text.split(particleRe).filter((x) => x !== "");
  const tokens: ParticleToken[] = [];

  for (const p of parts) {
    const isParticle = PARTICLES.includes(p);
    // keep spaces/newlines as normal tokens too (ParticleText can decide how to render)
    tokens.push({ t: p, particle: isParticle });
  }
  return tokens;
}

// Optional: if other places import tokenize() you can keep a compatible export:
export function tokenize(input: string): string[] {
  return tokenizeWithParticles(input).map((x) => x.t);
}
