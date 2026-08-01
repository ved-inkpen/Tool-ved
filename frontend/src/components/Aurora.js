import React, { useEffect, useRef } from 'react';

/**
 * Ambient backdrop for the sign-in panel: three slowly drifting colour blobs
 * plus a highlight that eases toward the cursor.
 *
 * The cursor layer is driven by CSS custom properties updated inside a single
 * rAF loop, so pointer events never trigger React renders. Everything animates
 * transform/opacity only, and the whole thing goes still for anyone who asks
 * for reduced motion.
 */
export function Aurora() {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;

    // target vs current, so the glow trails the pointer instead of snapping
    let tx = 50, ty = 50, cx = 50, cy = 50, raf = 0;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    };
    const recentre = () => { tx = 50; ty = 50; };

    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty('--mx', `${cx.toFixed(2)}%`);
      el.style.setProperty('--my', `${cy.toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', recentre);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', recentre);
    };
  }, []);

  return (
    <div ref={rootRef} className="aurora" aria-hidden="true" data-testid="aurora">
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
      <div className="aurora-cursor" />
    </div>
  );
}
