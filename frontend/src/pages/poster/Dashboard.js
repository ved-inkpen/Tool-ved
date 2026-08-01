import React, { useEffect, useState } from 'react';
import { api, fileUrl, downloadUrl } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Download, Copy, PlayCircle, ArrowLeft, Link2, Smartphone, Hash, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MediaPreview } from '@/components/MediaPreview';
import { adHeadlines, adPrimaryTexts } from '@/components/AdCopy';

/** A labelled value with a copy button — the poster's whole job is copying these out. */
function CopyRow({ label, value, onCopy, testId, mono, missing = 'Not provided' }) {
  const has = !!(value && String(value).trim());
  return (
    <div className="flex items-start gap-2">
      <div className="w-full min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
        <div className={`text-sm mt-0.5 break-all ${has ? 'text-[color:var(--text-1)]' : 'text-[color:var(--text-3)] italic'}`} style={mono ? { fontFamily: 'var(--font-mono)' } : undefined}>
          {has ? value : missing}
        </div>
      </div>
      <button
        data-testid={testId}
        onClick={() => onCopy(value, label)}
        disabled={!has}
        aria-label={`Copy ${label}`}
        className="mt-3 h-7 w-7 shrink-0 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}

function VariantList({ label, values, onCopy, testId }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
        {values.length > 1 && (
          <button data-testid={`${testId}-all`} onClick={() => onCopy(values.join('\n'), `All ${values.length} ${label.toLowerCase()}`)} className="text-[10px] text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)]">Copy all</button>
        )}
      </div>
      {values.length === 0 ? (
        <div className="text-sm text-[color:var(--text-3)] italic mt-0.5">None</div>
      ) : (
        <ol className="mt-1 space-y-1">
          {values.map((v, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="w-3 shrink-0 text-[10px] text-[color:var(--text-3)] tabular-nums text-right pt-1" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              <div className="text-sm flex-1 min-w-0 whitespace-pre-wrap">{v}</div>
              <button data-testid={`${testId}-${i}`} onClick={() => onCopy(v, `${label} ${i + 1}`)} aria-label={`Copy ${label} ${i + 1}`} className="h-7 w-7 shrink-0 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] transition-colors">
                <Copy size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AdPosterDashboard() {
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/downloads')).data); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load approved ads'); }
    finally { setLoading(false); }
  })(); }, []);

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch (e) { toast.error('Copy failed'); }
  };

  const groups = data.ad_sets
    .map(s => ({ set: s, ads: data.ads.filter(a => a.ad_set_id === s.id) }))
    .filter(g => g.ads.length > 0)
    .sort((a, b) => new Date(b.set.updated_at || 0) - new Date(a.set.updated_at || 0));
  const current = groups.find(g => g.set.id === selectedSetId);

  return (
    <div>
      <PageHeader
        title={current ? current.set.name : 'Ready to post'}
        subtitle={current
          ? `${current.set.ad_set_code} · ${current.ads.length} approved video${current.ads.length === 1 ? '' : 's'}`
          : 'Approved videos with their copy, links and IDs.'}
        breadcrumbs={current ? 'Ad Posting' : undefined}
        actions={current && (
          <button data-testid="poster-back" onClick={() => setSelectedSetId(null)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> All ad sets
          </button>
        )}
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="Nothing approved yet" description="Videos appear here once the final reviewer approves them." />
        ) : !current ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(({ set, ads }) => (
              <button
                key={set.id}
                data-testid={`poster-adset-card-${set.id}`}
                onClick={() => setSelectedSetId(set.id)}
                className="text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{set.name}</div>
                    <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{set.ad_set_code}</div>
                  </div>
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[color:var(--brand-teal)]/10 grid place-items-center text-[color:var(--brand-teal)]">
                    <Megaphone size={15} />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[color:var(--stroke)] flex items-center justify-between text-[11px] text-[color:var(--text-3)]">
                  <span className="text-[color:#D7FF9A]">{ads.length} ready to post</span>
                  <span>{set.updated_at ? formatDistanceToNow(new Date(set.updated_at), { addSuffix: true }) : ''}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {current.ads.map(a => {
              const media = a.media_file;
              return (
                <div key={a.id} data-testid={`poster-ad-${a.id}`} className="card-elevated overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr]">
                  <div className="border-b lg:border-b-0 lg:border-r border-[color:var(--stroke)]">
                    <button onClick={() => media && setPreview(media)} data-testid={`poster-preview-${a.id}`} className="relative aspect-video w-full bg-black grid place-items-center">
                      {media?.content_type?.startsWith('video/') ? (
                        <>
                          <video src={fileUrl(media.file_id)} className="w-full h-full object-cover opacity-90" muted />
                          <PlayCircle className="absolute inset-0 m-auto text-white/80" size={40} />
                        </>
                      ) : media?.content_type?.startsWith('image/') ? (
                        <img src={fileUrl(media.file_id)} alt={a.name} className="w-full h-full object-cover" />
                      ) : <div className="text-xs text-[color:var(--text-3)]">No media</div>}
                    </button>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{a.name}</div>
                        <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>v{a.current_version || 1}</div>
                      </div>
                      {media && (
                        <a data-testid={`poster-download-${a.id}`} href={downloadUrl(media.file_id)} className="h-9 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center justify-center gap-2 w-full transition-colors">
                          <Download size={14} /> Download final asset
                        </a>
                      )}
                      <div className="pt-2 border-t border-[color:var(--stroke)] space-y-2">
                        <CopyRow label="Ad ID" value={a.ad_code} onCopy={copy} testId={`poster-adid-${a.id}`} mono />
                        <CopyRow label="Ad Set ID" value={a.ad_set_code} onCopy={copy} testId={`poster-adsetid-${a.id}`} mono />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <VariantList label="Headlines" values={adHeadlines(a)} onCopy={copy} testId={`poster-headline-${a.id}`} />
                    <VariantList label="Primary texts" values={adPrimaryTexts(a)} onCopy={copy} testId={`poster-primary-${a.id}`} />
                    <div className="pt-3 border-t border-[color:var(--stroke)] space-y-3">
                      <div className="flex items-start gap-2">
                        <Link2 size={13} className="mt-4 shrink-0 text-[color:var(--brand-teal)]" />
                        <div className="flex-1 min-w-0">
                          <CopyRow label="Custom listing link" value={a.custom_listing_link} onCopy={copy} testId={`poster-listing-${a.id}`} missing="Not set by the reviewer" />
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Smartphone size={13} className="mt-4 shrink-0 text-[color:var(--brand-teal)]" />
                        <div className="flex-1 min-w-0">
                          <CopyRow label="Deeplink" value={a.deeplink} onCopy={copy} testId={`poster-deeplink-${a.id}`} missing="Not set by the reviewer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl bg-[color:var(--bg-1)] border-[color:var(--stroke)] p-0">
          {preview && <MediaPreview file={preview} showDownload />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
