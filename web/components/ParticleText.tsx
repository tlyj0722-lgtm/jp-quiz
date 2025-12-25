import React from 'react';

export function ParticleText({ tokens }: { tokens: { text: string; isParticle: boolean }[] }) {
  return (
    <span className="text-lg leading-relaxed">
      {tokens.map((t, i) => (
        <span key={i} className={t.isParticle ? 'text-blue-600' : ''}>
          {t.text}
        </span>
      ))}
    </span>
  );
}
