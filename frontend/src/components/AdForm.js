import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/FileUpload';

export const MAX_COPY_VARIANTS = 5;

export function emptyAd() {
  return {
    name: '',
    script: '',
    visual_guidelines: '',
    reference_links: [''],
    reference_media: [],
    media_file: null,
    headlines: [''],
    primary_texts: [''],
    common_copy: false,
  };
}

/**
 * Seed a new ad with the set's shared copy, when one has been marked common.
 * The tick carries over too, so the whole set stays visibly on shared copy.
 */
export function adFromCommonCopy(common) {
  const base = emptyAd();
  if (!common) return base;
  return {
    ...base,
    headlines: common.headlines?.length ? [...common.headlines] : [''],
    primary_texts: common.primary_texts?.length ? [...common.primary_texts] : [''],
    common_copy: true,
  };
}

export const filled = (arr) => (arr || []).filter((v) => v && v.trim());

/**
 * Load a stored ad into the form. Lists get a trailing blank row so there is
 * always something to type into, and legacy singular copy fields are promoted.
 */
export function adToForm(ad) {
  const list = (arr, legacy) => {
    if (arr && arr.length) return [...arr];
    return legacy ? [legacy] : [''];
  };
  return {
    name: ad.name || '',
    script: ad.script || '',
    visual_guidelines: ad.visual_guidelines || '',
    reference_links: ad.reference_links && ad.reference_links.length ? [...ad.reference_links] : [''],
    reference_media: ad.reference_media || [],
    media_file: ad.media_file || null,
    headlines: list(ad.headlines, ad.headline),
    primary_texts: list(ad.primary_texts, ad.primary_text),
    common_copy: !!ad.common_copy,
  };
}

/** Returns a human-readable problem with the ad, or null when it is complete. */
export function adError(ad, type, label = 'Ad') {
  if (!ad.name.trim()) return `${label} needs a name`;
  if (type === 'media_ready' && !ad.media_file) return `${label} needs a media file`;
  if (filled(ad.headlines).length === 0) return `${label} needs at least one headline`;
  if (filled(ad.primary_texts).length === 0) return `${label} needs at least one primary text`;
  return null;
}

/** Strip empty entries and cap copy at MAX_COPY_VARIANTS before sending to the API. */
export function serializeAd(ad) {
  return {
    ...ad,
    reference_links: filled(ad.reference_links),
    headlines: filled(ad.headlines).slice(0, MAX_COPY_VARIANTS),
    primary_texts: filled(ad.primary_texts).slice(0, MAX_COPY_VARIANTS),
    common_copy: !!ad.common_copy,
  };
}

async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch (e) {
    toast.error('Copy failed');
  }
}

/** Up to MAX_COPY_VARIANTS text inputs for one copy field (headlines / primary texts). */
export function CopyVariantList({ label, hint, values, onChange, testId, multiline }) {
  const set = (i, v) => onChange(values.map((x, xi) => (xi === i ? v : x)));
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.length === 1 ? [''] : values.filter((_, xi) => xi !== i));
  const atMax = values.length >= MAX_COPY_VARIANTS;
  const singular = label.replace(/s$/, '');

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-[color:var(--text-2)]">{label}</label>
        <span className="text-[11px] text-[color:var(--text-3)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {filled(values).length}/{MAX_COPY_VARIANTS}
        </span>
      </div>
      {hint && <div className="text-[11px] text-[color:var(--text-3)] mt-0.5">{hint}</div>}
      <div className="space-y-2 mt-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="mt-2.5 w-4 shrink-0 text-[11px] text-[color:var(--text-3)] tabular-nums text-right"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {i + 1}
            </div>
            {multiline ? (
              <textarea
                data-testid={`${testId}-${i}`}
                value={v}
                onChange={(e) => set(i, e.target.value)}
                className="flex-1 min-h-[64px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm"
                placeholder={`Primary text variant ${i + 1}`}
              />
            ) : (
              <input
                data-testid={`${testId}-${i}`}
                value={v}
                onChange={(e) => set(i, e.target.value)}
                className="flex-1 h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm"
                placeholder={`Headline variant ${i + 1}`}
              />
            )}
            <button
              type="button"
              data-testid={`${testId}-copy-${i}`}
              onClick={() => copyToClipboard(v, `${singular} ${i + 1}`)}
              disabled={!v || !v.trim()}
              aria-label={`Copy ${singular} ${i + 1}`}
              title="Copy to clipboard"
              className="mt-0.5 h-9 w-9 shrink-0 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              data-testid={`${testId}-remove-${i}`}
              onClick={() => remove(i)}
              aria-label={`Remove ${label} ${i + 1}`}
              className="mt-0.5 h-9 w-9 shrink-0 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!atMax && (
          <button
            type="button"
            data-testid={`${testId}-add`}
            onClick={add}
            className="ml-6 text-xs text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add {label.toLowerCase().replace(/s$/, '')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The full field set for one ad. Ad copy always closes out the form.
 * `idx` only namespaces data-testids so multiple forms can coexist.
 */
export function AdFormFields({ ad, type, idx, onChange }) {
  const set = (field, val) => onChange({ ...ad, [field]: val });
  const links = ad.reference_links || [];
  const setLink = (i, v) => set('reference_links', links.map((l, li) => (li === i ? v : l)));

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className="text-xs text-[color:var(--text-2)]">Ad name</label>
        <input data-testid={`ad-name-${idx}`} value={ad.name} onChange={(e) => set('name', e.target.value)} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="e.g., Beach Ad" />
      </div>
      <div>
        <label className="text-xs text-[color:var(--text-2)]">Script</label>
        <textarea data-testid={`ad-script-${idx}`} value={ad.script} onChange={(e) => set('script', e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Voice-over and scene direction…" />
      </div>
      {type === 'script' && (
        <>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Visual guidelines</label>
            <textarea data-testid={`ad-guidelines-${idx}`} value={ad.visual_guidelines} onChange={(e) => set('visual_guidelines', e.target.value)} className="mt-1 w-full min-h-[80px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Color palette, mood, pacing…" />
          </div>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Reference links</label>
            <div className="space-y-2 mt-1">
              {links.map((l, li) => (
                <div key={li} className="flex items-center gap-2">
                  <input data-testid={`ad-link-${idx}-${li}`} value={l} onChange={(e) => setLink(li, e.target.value)} className="flex-1 h-9 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="https://…" />
                  <button data-testid={`ad-link-remove-${idx}-${li}`} onClick={() => set('reference_links', links.filter((_, i) => i !== li))} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
              <button data-testid={`ad-link-add-${idx}`} onClick={() => set('reference_links', [...links, ''])} className="text-xs text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] inline-flex items-center gap-1"><Plus size={12} /> Add link</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Reference media</label>
            <div className="mt-1">
              <FileUpload multiple testId={`ad-refmedia-${idx}`} value={ad.reference_media} onChange={(v) => set('reference_media', v)} label="Upload reference media" />
            </div>
          </div>
        </>
      )}
      {type === 'media_ready' && (
        <div>
          <label className="text-xs text-[color:var(--text-2)]">Video / media file</label>
          <div className="mt-1">
            <FileUpload testId={`ad-media-${idx}`} value={ad.media_file} onChange={(v) => set('media_file', v)} label="Upload final video" accept="video/*,image/*" />
          </div>
        </div>
      )}

      {/* Ad copy closes out the form — up to 5 variants of each */}
      <div className="pt-2 mt-1 border-t border-[color:var(--stroke)] space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap pt-3">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>Ad copy</div>
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              data-testid={`ad-common-copy-${idx}`}
              checked={!!ad.common_copy}
              onChange={(e) => set('common_copy', e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--brand-teal)] cursor-pointer"
            />
            <span className="text-xs text-[color:var(--text-2)] group-hover:text-[color:var(--text-1)] transition-colors">
              Make this common for all ads in this ad set
              <span className="block text-[11px] text-[color:var(--text-3)]">New ads start with this copy, still editable.</span>
            </span>
          </label>
        </div>
        <CopyVariantList
          label="Headlines"
          hint={`Up to ${MAX_COPY_VARIANTS} headline variants to test against each other.`}
          values={ad.headlines}
          onChange={(v) => set('headlines', v)}
          testId={`ad-headline-${idx}`}
        />
        <CopyVariantList
          label="Primary texts"
          hint={`Up to ${MAX_COPY_VARIANTS} body copy variants.`}
          values={ad.primary_texts}
          onChange={(v) => set('primary_texts', v)}
          testId={`ad-primary-text-${idx}`}
          multiline
        />
      </div>
    </div>
  );
}
