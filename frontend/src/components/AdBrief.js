import React from 'react';
import { ExternalLink, PlayCircle, FileText } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { CopyVariants, adHeadlines, adPrimaryTexts } from '@/components/AdCopy';

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
      {children}
    </div>
  );
}

/**
 * Everything an editor needs to produce an ad: script, visual guidelines,
 * reference links and reference media. Rendered on the editor dashboard card
 * and inside the upload dialog.
 */
export function AdBrief({ ad, compact = false, showCopy = true }) {
  const links = (ad.reference_links || []).filter(Boolean);
  const media = ad.reference_media || [];
  const thumb = compact ? 'h-16' : 'h-24';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'} data-testid={`ad-brief-${ad.id}`}>
      <Section label="Script">
        <div className={`rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm whitespace-pre-wrap ${compact ? 'max-h-40 overflow-y-auto' : ''}`}>
          {ad.script || <span className="text-[color:var(--text-3)]">No script provided.</span>}
        </div>
      </Section>

      <Section label="Visual guidelines">
        <div className={`rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm whitespace-pre-wrap ${compact ? 'max-h-40 overflow-y-auto' : ''}`}>
          {ad.visual_guidelines || <span className="text-[color:var(--text-3)]">No visual guidelines provided.</span>}
        </div>
      </Section>

      <Section label="Reference links">
        {links.length === 0 ? (
          <div className="text-sm text-[color:var(--text-3)]">No reference links.</div>
        ) : (
          <div className="space-y-1">
            {links.map((l, i) => (
              <a
                key={i}
                href={l}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-sm text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] break-all"
              >
                <ExternalLink size={12} className="shrink-0" /> {l}
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section label="Reference media">
        {media.length === 0 ? (
          <div className="text-sm text-[color:var(--text-3)]">No reference media.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {media.map((f) => (
              <a
                key={f.file_id}
                href={fileUrl(f.file_id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block rounded-lg border border-[color:var(--stroke)] overflow-hidden hover:border-[color:var(--brand-teal)]/50 transition-colors"
              >
                {(f.content_type || '').startsWith('image/') ? (
                  <img src={fileUrl(f.file_id)} alt={f.filename} className={`w-full ${thumb} object-cover`} />
                ) : (f.content_type || '').startsWith('video/') ? (
                  <div className={`relative bg-black ${thumb}`}>
                    <video src={fileUrl(f.file_id)} className={`w-full ${thumb} object-cover`} muted />
                    <PlayCircle className="absolute inset-0 m-auto text-white/70" size={20} />
                  </div>
                ) : (
                  <div className={`${thumb} grid place-items-center text-[color:var(--text-3)]`}><FileText size={16} /></div>
                )}
                <div className="text-[10px] text-[color:var(--text-3)] px-1.5 py-1 truncate" style={{ fontFamily: 'var(--font-mono)' }}>{f.filename}</div>
              </a>
            ))}
          </div>
        )}
      </Section>

      {showCopy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CopyVariants label="Headlines" values={adHeadlines(ad)} testId={`brief-headlines-${ad.id}`} />
          <CopyVariants label="Primary texts" values={adPrimaryTexts(ad)} testId={`brief-primary-texts-${ad.id}`} preserveWhitespace />
        </div>
      )}
    </div>
  );
}
