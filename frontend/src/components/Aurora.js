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
const STARS = Array.from({ length: 190 }, (_, i) => {
  const rnd = (salt) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // Cubed so most stars come out small and only a few are large. A flat
  // distribution at this count reads as evenly-spaced dots; weighting it
  // towards faint specks with occasional bright ones is what looks like depth.
  const size = 0.6 + Math.pow(rnd(3), 3) * 2.6;
  return {
    left: rnd(1) * 100,
    top: rnd(2) * 100,
    size,
    delay: rnd(4) * 7,
    duration: 2.8 + rnd(5) * 3.6,
    // the small distant ones stay dimmer, the near ones burn brighter
    peak: 0.28 + (size / 3.2) * 0.5 + rnd(6) * 0.25,
    // bigger stars read as nearer, so they cross faster — that parallax is what
    // gives the field depth instead of looking like one flat sheet sliding
    travel: 11 - size * 2 + rnd(7) * 6,
    // negative delay starts each star mid-run, so the field is already in
    // motion on first paint rather than all sweeping in together
    travelDelay: rnd(8) * 60,
  };
});

/**
 * The colour only. Two of these are stacked across the full page: the base one
 * and a `dim` copy whose hue is rotated away from it. Complementary masks
 * cross-dissolve them left to right, so the colour changes across the page
 * while the overall brightness stays flat — no band where they meet.
 */
export function Aurora({ dim = false }) {
  return (
    <div className={`aurora${dim ? ' aurora-dim' : ''}`} aria-hidden="true" data-testid={dim ? 'aurora-dim' : 'aurora'}>
      <div className="aurora-wave aurora-wave-a" />
      <div className="aurora-wave aurora-wave-b" />
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
    </div>
  );
}

/**
 * The star field, kept out of Aurora and rendered once over the whole page.
 * Inside Aurora it would be drawn twice — and since the positions are
 * deterministic the two copies would land on each other and read as a bright
 * seam wherever the masks overlap.
 */
export function AuroraStars() {
  return (
    <div className="aurora-stars" aria-hidden="true" data-testid="aurora-stars">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="aurora-star-drift"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDuration: `${s.travel}s`,
            animationDelay: `-${s.travelDelay}s`,
          }}
        >
          <span
            className="aurora-star"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              '--star-peak': s.peak,
            }}
          />
        </span>
      ))}
    </div>
  );
}
