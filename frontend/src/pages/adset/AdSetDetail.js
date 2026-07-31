import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { MediaPreview } from '@/components/MediaPreview';
import { ArrowLeft, Send, ExternalLink, MessageSquare, Loader2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function AdSetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [adDetail, setAdDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ad-sets/${id}`);
      setData(data);
      if (data.ads && data.ads.length > 0) setSelectedAdId(prev => prev || data.ads[0].id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load ad set');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!selectedAdId) return;
    (async () => {
      try { setAdDetail((await api.get(`/ads/${selectedAdId}`)).data); } catch (e) { setAdDetail(null); }
    })();
  }, [selectedAdId, data]);

  const submit = async () => {
    try {
      await api.post(`/ad-sets/${id}/submit`);
      toast.success('Submitted for review');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const resubmitAd = async (adId) => {
    try {
      await api.post(`/ads/${adId}/resubmit`);
      toast.success('Ad resubmitted');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  if (loading || !data) return <div><PageHeader title="Ad Set" /><div className="p-6"><PageLoader /></div></div>;

  const { ad_set, ads } = data;
  const isOwner = user?.id === ad_set.created_by;
  const canSubmit = ad_set.status === 'draft' && isOwner;

  return (
    <div>
      <PageHeader
        title={ad_set.name}
        subtitle={<span className="inline-flex items-center gap-2"><span style={{ fontFamily: 'var(--font-mono)' }}>{ad_set.ad_set_code}</span> · {ad_set.type === 'media_ready' ? 'Media ready' : 'Script'} · <StatusPill status={ad_set.status} /></span>}
        breadcrumbs="Ad Sets"
        actions={
          <>
            <button data-testid="adset-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            {canSubmit && (
              <button data-testid="adset-submit-button" onClick={submit} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
                <Send size={14} /> Submit for review
              </button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[calc(100vh-140px)]">
        <aside className="border-r border-[color:var(--stroke)] p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Ads ({ads.length})</div>
          {ads.map((a) => (
            <button
              key={a.id}
              data-testid={`adset-ad-item-${a.id}`}
              onClick={() => setSelectedAdId(a.id)}
              className={`w-full text-left rounded-lg p-3 border transition-colors ${selectedAdId === a.id ? 'border-[color:var(--brand-teal)]/50 bg-[color:var(--bg-2)]' : 'border-[color:var(--stroke)] hover:bg-white/[0.03]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <StatusPill status={a.status} />
              </div>
              <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
            </button>
          ))}
        </aside>
        <section className="p-6 lg:p-8">
          {!adDetail ? <PageLoader /> : (
            <AdDetailBody ad={adDetail.ad} reviews={adDetail.reviews || []} versions={adDetail.versions || []} agency={adDetail.assigned_agency} editor={adDetail.assigned_editor} onResubmit={() => resubmitAd(adDetail.ad.id)} isOwner={isOwner} />
          )}
        </section>
      </div>
    </div>
  );
}

export function AdDetailBody({ ad, reviews, versions, agency, editor, onResubmit, isOwner, extra }) {
  const canResubmit = isOwner && (ad.status === 'script_rejected');
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{ad.ad_code}</div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{ad.name}</h2>
          <div className="mt-1"><StatusPill status={ad.status} /></div>
        </div>
        <div className="flex items-center gap-2">
          {canResubmit && (
            <button data-testid="ad-resubmit-button" onClick={onResubmit} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
              <Send size={14} /> Resubmit
            </button>
          )}
          {extra}
        </div>
      </div>

      {ad.latest_review_comment && (ad.status === 'script_rejected' || ad.status === 'final_rejected') && (
        <div className="card-elevated p-4 border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.06)]">
          <div className="text-xs text-[color:#FFB4B4] font-semibold flex items-center gap-1"><MessageSquare size={12} /> Reviewer feedback</div>
          <div className="text-sm mt-1 text-[color:var(--text-1)]">{ad.latest_review_comment}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {ad.media_file && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-2">Media</div>
              <MediaPreview file={ad.media_file} showDownload />
            </div>
          )}
          <div>
            <div className="text-xs text-[color:var(--text-3)] mb-1">Script</div>
            <div className="card-elevated p-4 text-sm whitespace-pre-wrap">{ad.script || <span className="text-[color:var(--text-3)]">—</span>}</div>
          </div>
          {ad.visual_guidelines && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-1">Visual guidelines</div>
              <div className="card-elevated p-4 text-sm whitespace-pre-wrap">{ad.visual_guidelines}</div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="card-elevated p-4">
            <div className="text-xs text-[color:var(--text-3)]">Headline</div>
            <div className="text-sm text-[color:var(--text-1)] mt-1">{ad.headline || <span className="text-[color:var(--text-3)]">—</span>}</div>
            <div className="text-xs text-[color:var(--text-3)] mt-3">Primary text</div>
            <div className="text-sm text-[color:var(--text-1)] mt-1 whitespace-pre-wrap">{ad.primary_text || <span className="text-[color:var(--text-3)]">—</span>}</div>
          </div>

          {ad.reference_links && ad.reference_links.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-1">Reference links</div>
              <div className="card-elevated p-4 space-y-1.5">
                {ad.reference_links.map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] break-all">
                    <ExternalLink size={12} /> {l}
                  </a>
                ))}
              </div>
            </div>
          )}

          {ad.reference_media && ad.reference_media.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-1">Reference media</div>
              <div className="grid grid-cols-2 gap-2">
                {ad.reference_media.map((f) => (
                  <a key={f.file_id} href={fileUrl(f.file_id)} target="_blank" rel="noopener noreferrer" className="block card-elevated overflow-hidden group">
                    {(f.content_type || '').startsWith('image/') ? (
                      <img src={fileUrl(f.file_id)} alt={f.filename} className="w-full h-28 object-cover" />
                    ) : (f.content_type || '').startsWith('video/') ? (
                      <div className="relative bg-black h-28"><video src={fileUrl(f.file_id)} className="w-full h-28 object-cover" muted /><PlayCircle className="absolute inset-0 m-auto text-white/70" size={28} /></div>
                    ) : (
                      <div className="h-28 grid place-items-center text-xs text-[color:var(--text-3)]">{f.filename}</div>
                    )}
                    <div className="text-[11px] text-[color:var(--text-3)] px-2 py-1 truncate" style={{ fontFamily: 'var(--font-mono)' }}>{f.filename}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(agency || editor) && (
            <div className="card-elevated p-4 text-xs text-[color:var(--text-2)] space-y-1">
              {agency && <div>Agency: <span className="text-[color:var(--text-1)]">{agency.name}</span></div>}
              {editor && <div>Editor: <span className="text-[color:var(--text-1)]">{editor.name}</span> <span className="text-[color:var(--text-3)]">({editor.email})</span></div>}
            </div>
          )}

          {versions && versions.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-1">Version history</div>
              <div className="card-elevated divide-y divide-[color:var(--stroke)]">
                {versions.map((v) => (
                  <div key={v.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm">v{v.version_number} · {v.uploaded_by_name}</div>
                      <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{v.created_at ? formatDistanceToNow(new Date(v.created_at), { addSuffix: true }) : ''}</div>
                    </div>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/uploads/${v.media_file.file_id}/download`} className="text-xs text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)]">Download</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews && reviews.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-1">Review history</div>
              <div className="card-elevated divide-y divide-[color:var(--stroke)]">
                {reviews.map((r) => (
                  <div key={r.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{r.reviewer_name || 'Reviewer'} · <span className={r.action === 'approve' ? 'text-[color:#D7FF9A]' : 'text-[color:#FFB4B4]'}>{r.action}</span> ({r.stage})</div>
                      <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ''}</div>
                    </div>
                    {r.comments && <div className="text-xs mt-1 text-[color:var(--text-2)]">{r.comments}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
