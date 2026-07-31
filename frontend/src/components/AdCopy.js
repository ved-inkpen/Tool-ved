import React from 'react';

/**
 * Ad copy lives in headlines[] / primary_texts[] (up to 5 variants each).
 * Older ads only have the singular headline / primary_text fields, so read
 * through these helpers rather than touching the arrays directly.
 */
export function adHeadlines(ad) {
  if (ad?.headlines?.length) return ad.headlines.filter(Boolean);
  return ad?.headline ? [ad.headline] : [];
}

export function adPrimaryTexts(ad) {
  if (ad?.primary_texts?.length) return ad.primary_texts.filter(Boolean);
  return ad?.primary_text ? [ad.primary_text] : [];
}

/** Numbered, read-only list of copy variants. */
export function CopyVariants({ label, values, testId, preserveWhitespace }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-[color:var(--text-3)]">{label}</div>
        {values.length > 1 && (
          <div className="text-[11px] text-[color:var(--text-3)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{values.length}</div>
        )}
      </div>
      {values.length === 0 ? (
        <div className="text-sm text-[color:var(--text-3)] mt-1">—</div>
      ) : (
        <ol className="mt-1.5 space-y-1.5">
          {values.map((v, i) => (
            <li key={i} className="flex gap-2 text-sm text-[color:var(--text-1)]">
              <span className="w-4 shrink-0 text-[11px] text-[color:var(--text-3)] tabular-nums text-right pt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              <span className={preserveWhitespace ? 'whitespace-pre-wrap min-w-0' : 'min-w-0'}>{v}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
