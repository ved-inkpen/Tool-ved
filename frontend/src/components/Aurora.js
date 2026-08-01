import React from 'react';

/**
 * Ambient backdrop for the sign-in panel: gradient sheets sweeping across each
 * other like slow waves, drifting colour blobs for depth, and a field of
 * twinkling stars on top.
 *
 * Pure CSS animation — no listeners, no rAF, no state. Everything animates
 * transform, opacity or background-position, and it all stops under
 * prefers-reduced-motion.
 */

/**
 * Star positions are pseudo-random but deterministic, so the field is identical
 * on every render and between server and client — a Math.random() field would
 * reshuffle on each re-render.
 */
const STARS = Array.from({ length: 54 }, (_, i) => {
  const rnd = (salt) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    left: rnd(1) * 100,
    top: rnd(2) * 100,
    size: 1 + rnd(3) * 1.9,
    delay: rnd(4) * 7,
    duration: 2.8 + rnd(5) * 3.6,
    peak: 0.4 + rnd(6) * 0.55,
  };
});

export function Aurora({ dim = false }) {
  return (
    <div className={`aurora${dim ? ' aurora-dim' : ''}`} aria-hidden="true" data-testid={dim ? 'aurora-dim' : 'aurora'}>
      <div className="aurora-wave aurora-wave-a" />
      <div className="aurora-wave aurora-wave-b" />
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
      <div className="aurora-stars" data-testid="aurora-stars">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="aurora-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              '--star-peak': s.peak,
            }}
          />
        ))}
      </div>
    </div>
  );
}
