import React, { useEffect, useState } from 'react';
import { api, fileUrl, downloadUrl } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Download, Copy, PlayCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MediaPreview } from '@/components/MediaPreview';
import { adHeadlines, adPrimaryTexts } from '@/components/AdCopy';

/** Numbered copy variants, each individually copyable for publishing. */
function CopyableVariants({ label, values, onCopy, singular, testId, clamp = 'line-clamp-2' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
        {values.length > 1 && (
          <button
            data-testid={`${testId}-all`}
            onClick={() => onCopy(values.join('\n'), `All ${values.length} ${label.toLowerCase()}`)}
            className="text-[10px] text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)]"
          >
            Copy all
          </button>
        )}
      </div>
      {values.length === 0 ? (
        <div className="text-sm text-[color:var(--text-3)] mt-0.5">—</div>
      ) : (
        <ol className="mt-0.5 space-y-1">
          {values.map((v, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="w-3 shrink-0 text-[10px] text-[color:var(--text-3)] tabular-nums text-right pt-1" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              <div className={`text-sm text-[color:var(--text-1)] flex-1 min-w-0 ${clamp} whitespace-pre-wrap`}>{v}</div>
              <button
                data-testid={`${testId}-${i}`}
                onClick={() => onCopy(v, `${singular} ${i + 1}`)}
                aria-label={`Copy ${singular} ${i + 1}`}
                className="h-7 w-7 shrink-0 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] transition-colors"
              >
                <Copy size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function DownloadsPage() {
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [selectedSetId, setSelectedSetId] = useState(null);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/downloads')).data); } finally { setLoading(false); }
  })(); }, []);

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch (e) { toast.error('Copy failed'); }
  };

  // approved ads grouped under the ad set they belong to
  const groups = data.ad_sets
    .map(s => ({ set: s, ads: data.ads.filter(a => a.ad_set_id === s.id) }))
    .filter(g => g.ads.length > 0)
    .sort((a, b) => new Date(b.set.updated_at || 0) - new Date(a.set.updated_at || 0));
  const current = groups.find(g => g.set.id === selectedSetId);
  const visibleAds = current ? current.ads : [];

  return (
    <div>
      <PageHeader
        title={current ? current.set.name : 'Approved downloads'}
        subtitle={current
          ? `${current.ads.length} approved ad${current.ads.length === 1 ? '' : 's'} ready to publish`
          : 'Pick an ad set to grab its approved media and copy.'}
        breadcrumbs={current ? 'Approved Downloads' : undefined}
        actions={current && (
          <button data-testid="downloads-back" onClick={() => setSelectedSetId(null)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> All ad sets
          </button>
        )}
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="No approved ads yet" description="Approved ads will appear here as soon as final review is done." />
        ) : !current ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(({ set, ads }) => (
              <button
                key={set.id}
                data-testid={`downloads-adset-card-${set.id}`}
                onClick={() => setSelectedSetId(set.id)}
                className="text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{set.name}</div>
                    <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{set.ad_set_code}</div>
                  </div>
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[color:#D7FF9A]/10 grid place-items-center text-[color:#D7FF9A]">
                    <Download size={15} />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[color:var(--stroke)] flex items-center justify-between text-[11px] text-[color:var(--text-3)]">
                  <span className="text-[color:#D7FF9A]">{ads.length} approved ad{ads.length === 1 ? '' : 's'}</span>
                  <span>{set.updated_at ? formatDistanceToNow(new Date(set.updated_at), { addSuffix: true }) : ''}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleAds.map(a => {
              const set = data.ad_sets.find(s => s.id === a.ad_set_id);
              const media = a.media_file;
              return (
                <div key={a.id} data-testid={`download-ad-${a.id}`} className="card-elevated overflow-hidden">
                  <button onClick={() => media && setPreview(media)} className="relative aspect-video w-full bg-black grid place-items-center" data-testid={`download-preview-${a.id}`}>
                    {media?.content_type?.startsWith('video/') ? (
                      <>
                        <video src={fileUrl(media.file_id)} className="w-full h-full object-cover opacity-90" muted />
                        <PlayCircle className="absolute inset-0 m-auto text-white/80" size={40} />
                      </>
                    ) : media?.content_type?.startsWith('image/') ? (
                      <img src={fileUrl(media.file_id)} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-[color:var(--text-3)]">No media</div>
                    )}
                  </button>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{a.name}</div>
                      <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code} · {set?.name}</div>
                    </div>
                    <div className="space-y-3">
                      <CopyableVariants
                        label="Headlines"
                        values={adHeadlines(a)}
                        onCopy={copy}
                        singular="Headline"
                        testId={`download-copy-headline-${a.id}`}
                      />
                      <CopyableVariants
                        label="Primary texts"
                        values={adPrimaryTexts(a)}
                        onCopy={copy}
                        singular="Primary text"
                        testId={`download-copy-primary-${a.id}`}
                        clamp="line-clamp-3"
                      />
                    </div>
                    {media && (
                      <a data-testid={`download-media-${a.id}`} href={downloadUrl(media.file_id)} className="h-9 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center justify-center gap-2 w-full transition-colors">
                        <Download size={14} /> Download media
                      </a>
                    )}
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
