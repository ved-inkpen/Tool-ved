import React, { useEffect, useState } from 'react';
import { api, fileUrl, downloadUrl } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Download, Copy, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MediaPreview } from '@/components/MediaPreview';

export default function DownloadsPage() {
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/downloads')).data); } finally { setLoading(false); }
  })(); }, []);

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch (e) { toast.error('Copy failed'); }
  };

  return (
    <div>
      <PageHeader title="Approved downloads" subtitle="Download final approved media with headline and primary text ready for publishing." />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="No approved ads yet" description="Approved ads will appear here as soon as final review is done." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.ads.map(a => {
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
                    <div className="space-y-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>Headline</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-sm text-[color:var(--text-1)] flex-1 line-clamp-2">{a.headline || <span className="text-[color:var(--text-3)]">—</span>}</div>
                          {a.headline && <button data-testid={`download-copy-headline-${a.id}`} onClick={() => copy(a.headline, 'Headline')} className="h-7 w-7 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] transition-colors"><Copy size={12} /></button>}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>Primary text</div>
                        <div className="flex items-start gap-2 mt-0.5">
                          <div className="text-sm text-[color:var(--text-1)] flex-1 line-clamp-3 whitespace-pre-wrap">{a.primary_text || <span className="text-[color:var(--text-3)]">—</span>}</div>
                          {a.primary_text && <button data-testid={`download-copy-primary-${a.id}`} onClick={() => copy(a.primary_text, 'Primary text')} className="h-7 w-7 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] transition-colors"><Copy size={12} /></button>}
                        </div>
                      </div>
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
