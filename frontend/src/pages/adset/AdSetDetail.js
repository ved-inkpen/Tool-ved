import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { MediaPreview } from '@/components/MediaPreview';
import { ArrowLeft, Send, ExternalLink, MessageSquare, Loader2, PlayCircle, BarChart3, FileText, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AdFormFields, emptyAd, adError, serializeAd, adToForm } from '@/components/AdForm';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { CommentThread } from '@/components/CommentThread';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { CopyVariants, adHeadlines, adPrimaryTexts } from '@/components/AdCopy';

export default function AdSetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [adDetail, setAdDetail] = useState(null);
  const [adLoadError, setAdLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('ads');
  const [addOpen, setAddOpen] = useState(false);
  const [newAd, setNewAd] = useState(emptyAd());
  const [adding, setAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAd, setEditAd] = useState(null);
  const [saving, setSaving] = useState(false);

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
    let cancelled = false;
    setAdDetail(null);
    setAdLoadError(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/ads/${selectedAdId}`);
        if (!cancelled) setAdDetail(d);
      } catch (e) {
        // never leave the pane spinning — say why it could not load
        if (!cancelled) setAdLoadError(e?.response?.data?.detail || 'This ad could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAdId, data]);

  const submit = async () => {
    try {
      await api.post(`/ad-sets/${id}/submit`);
      toast.success('Submitted for review');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  /** Add an ad to this existing set. `submit` sends it straight to review. */
  const addAd = async (submit) => {
    const err = adError(newAd, data.ad_set.type, 'This ad');
    if (err) { toast.error(err); return; }
    setAdding(true);
    try {
      const { data } = await api.post(`/ad-sets/${id}/ads?submit=${submit}`, serializeAd(newAd));
      toast.success(submit ? 'Ad added and sent for review' : 'Ad added as draft');
      setAddOpen(false);
      setNewAd(emptyAd());
      await load();
      setSelectedAdId(data.ad.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to add ad');
    } finally { setAdding(false); }
  };

  const resubmitAd = async (adId) => {
    try {
      await api.post(`/ads/${adId}/resubmit`);
      toast.success('Ad sent for review');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const openEdit = () => { setEditAd(adToForm(adDetail.ad)); setEditOpen(true); };

  /**
   * Save corrections to a rejected/draft ad. Editing drops it back to draft
   * server-side, so `resubmit` sends the corrected version straight back.
   */
  const saveEdit = async (resubmit) => {
    const ad = adDetail.ad;
    const err = adError(editAd, ad.type, 'This ad');
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      await api.patch(`/ads/${ad.id}`, serializeAd(editAd));
      if (resubmit) {
        await api.post(`/ads/${ad.id}/resubmit`);
        toast.success('Changes saved and sent for review');
      } else {
        toast.success('Changes saved');
      }
      setEditOpen(false);
      setEditAd(null);
      await load();
      setAdDetail((await api.get(`/ads/${ad.id}`)).data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save changes');
    } finally { setSaving(false); }
  };

  if (loading || !data) return <div><PageHeader title="Ad Set" /><div className="p-6"><PageLoader /></div></div>;

  const { ad_set, ads } = data;
  const isOwner = user?.id === ad_set.created_by;
  const canSubmit = ad_set.status === 'draft' && isOwner;
  const isAdmin = user?.role === 'admin';
  // Once every ad is approved the set is closed; until then the owner can keep adding.
  const canAddAd = (isOwner || isAdmin) && ad_set.status !== 'completed';
  const setAlreadySubmitted = ad_set.status !== 'draft';

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
      <div className="px-6 lg:px-8 pt-4 flex items-center gap-2 border-b border-[color:var(--stroke)]">
        <button data-testid="adset-tab-ads" onClick={() => setActiveTab('ads')} className={`h-9 px-4 rounded-t-lg text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${activeTab === 'ads' ? 'border-[color:var(--brand-teal)] text-[color:var(--text-1)]' : 'border-transparent text-[color:var(--text-3)] hover:text-[color:var(--text-1)]'}`}><FileText size={14} /> Ads</button>
        <button data-testid="adset-tab-analytics" onClick={() => setActiveTab('analytics')} className={`h-9 px-4 rounded-t-lg text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${activeTab === 'analytics' ? 'border-[color:var(--brand-teal)] text-[color:var(--text-1)]' : 'border-transparent text-[color:var(--text-3)] hover:text-[color:var(--text-1)]'}`}><BarChart3 size={14} /> Analytics</button>
      </div>
      {activeTab === 'analytics' && (
        <div className="p-6 lg:p-8"><AnalyticsPanel adSetId={ad_set.id} /></div>
      )}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[calc(100vh-180px)]">
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
            {canAddAd && (
              <button
                data-testid="adset-add-ad-button"
                onClick={() => { setNewAd(emptyAd()); setAddOpen(true); }}
                title="Add another ad to this ad set"
                className="w-full h-[72px] rounded-lg border border-dashed border-[color:var(--stroke)] hover:border-[color:var(--brand-teal)]/60 hover:bg-[color:var(--brand-teal)]/5 text-[color:var(--text-3)] hover:text-[color:var(--brand-teal)] inline-flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Plus size={20} />
                <span className="text-xs">Add ad</span>
              </button>
            )}
          </aside>
          <section className="p-6 lg:p-8">
            {adLoadError ? (
              <div data-testid="adset-ad-error" className="card-elevated p-6 max-w-lg">
                <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Can’t show this ad</div>
                <div className="text-sm text-[color:var(--text-3)] mt-1">{adLoadError}</div>
              </div>
            ) : !adDetail ? <PageLoader /> : (
              <AdDetailBody ad={adDetail.ad} reviews={adDetail.reviews || []} versions={adDetail.versions || []} agency={adDetail.assigned_agency} editor={adDetail.assigned_editor} onResubmit={() => resubmitAd(adDetail.ad.id)} onEdit={openEdit} setStatus={ad_set.status} isOwner={isOwner} />
            )}
          </section>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)] max-w-2xl max-h-[85vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Edit {adDetail?.ad?.name}</DialogTitle>
            <div className="text-xs text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{adDetail?.ad?.ad_code}</div>
          </DialogHeader>
          {editAd && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
              {adDetail?.ad?.latest_review_comment && adDetail.ad.status === 'script_rejected' && (
                <div className="rounded-lg p-3 border border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.06)]">
                  <div className="text-[10px] uppercase tracking-widest text-[color:#FFB4B4] font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>Fix this</div>
                  <div className="text-sm mt-1">{adDetail.ad.latest_review_comment}</div>
                </div>
              )}
              <AdFormFields ad={editAd} type={adDetail.ad.type} idx="edit" onChange={setEditAd} />
            </div>
          )}
          <DialogFooter className="shrink-0 pt-4 mt-4 border-t border-[color:var(--stroke)]">
            <button onClick={() => setEditOpen(false)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button
              data-testid="ad-edit-save"
              onClick={() => saveEdit(false)}
              disabled={saving}
              className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              data-testid="ad-edit-save-resubmit"
              onClick={() => saveEdit(true)}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Save & send for review
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)] max-w-2xl max-h-[85vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Add ad to {ad_set.name}</DialogTitle>
            <div className="text-xs text-[color:var(--text-3)]">
              {ad_set.type === 'media_ready' ? 'Media ready' : 'Script only'} · {setAlreadySubmitted
                ? 'This set is already in review — you can save the ad as a draft or send it for review now.'
                : 'It will be submitted along with the rest of the set.'}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <AdFormFields ad={newAd} type={ad_set.type} idx="new" onChange={setNewAd} />
          </div>
          <DialogFooter className="shrink-0 pt-4 mt-4 border-t border-[color:var(--stroke)]">
            <button
              onClick={() => setAddOpen(false)}
              className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors"
            >
              Cancel
            </button>
            {setAlreadySubmitted ? (
              <>
                <button
                  data-testid="adset-add-ad-draft"
                  onClick={() => addAd(false)}
                  disabled={adding}
                  className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
                >
                  Save as draft
                </button>
                <button
                  data-testid="adset-add-ad-submit"
                  onClick={() => addAd(true)}
                  disabled={adding}
                  className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Add & send for review
                </button>
              </>
            ) : (
              <button
                data-testid="adset-add-ad-confirm"
                onClick={() => addAd(false)}
                disabled={adding}
                className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {adding ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Add ad
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdDetailBody({ ad, reviews, versions, agency, editor, onResubmit, onEdit, setStatus, isOwner, extra }) {
  // The creator owns an ad while it is draft or bounced back to them.
  const isEditable = isOwner && ['draft', 'script_rejected'].includes(ad.status);
  // A draft ad only needs its own submit when the set has already moved on —
  // otherwise the set-level "Submit for review" covers it.
  const needsOwnSubmit = ad.status === 'script_rejected' || (ad.status === 'draft' && setStatus && setStatus !== 'draft');
  const canResubmit = isOwner && needsOwnSubmit && onResubmit;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{ad.ad_code}</div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{ad.name}</h2>
          <div className="mt-1"><StatusPill status={ad.status} /></div>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && onEdit && (
            <button data-testid="ad-edit-button" onClick={onEdit} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm inline-flex items-center gap-2 transition-colors">
              <Pencil size={14} /> Edit ad
            </button>
          )}
          {canResubmit && (
            <button data-testid="ad-resubmit-button" onClick={onResubmit} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
              <Send size={14} /> {ad.status === 'script_rejected' ? 'Resubmit' : 'Submit for review'}
            </button>
          )}
          {extra}
        </div>
      </div>

      {ad.latest_review_comment && (ad.status === 'script_rejected' || ad.status === 'final_rejected') && (
        <div className="card-elevated p-4 border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.06)] flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-[color:#FFB4B4] font-semibold flex items-center gap-1"><MessageSquare size={12} /> Reviewer feedback</div>
            <div className="text-sm mt-1 text-[color:var(--text-1)]">{ad.latest_review_comment}</div>
            {isEditable && <div className="text-[11px] text-[color:var(--text-3)] mt-1.5">Edit the ad to address this, then send it back for review.</div>}
          </div>
          {isEditable && onEdit && (
            <button data-testid="ad-edit-from-feedback" onClick={onEdit} className="h-9 px-4 shrink-0 rounded-lg border border-[color:rgba(248,113,113,0.40)] hover:bg-[color:rgba(248,113,113,0.12)] text-sm inline-flex items-center gap-2 transition-colors">
              <Pencil size={14} /> Edit ad
            </button>
          )}
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
            <CopyVariants label="Headlines" values={adHeadlines(ad)} testId="ad-detail-headlines" />
            <div className="mt-4">
              <CopyVariants label="Primary texts" values={adPrimaryTexts(ad)} testId="ad-detail-primary-texts" preserveWhitespace />
            </div>
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
      <CommentThread adId={ad.id} />
    </div>
  );
}
