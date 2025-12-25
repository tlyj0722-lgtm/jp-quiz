import React from 'react';

type Token = { t: string; particle?: boolean };

export function ParticleText({ tokens }: { tokens: Token[] }) {
  return (
    <span className="text-lg leading-relaxed">
      {tokens.map((x, i) => (
        <span
          key={i}
          className={x.particle ? "text-blue-600 font-semibold" : ""}
        >
          {x.t}
        </span>
      ))}
    </span>
  );
}
