import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { ArrowLeft, UserRound, Loader2, Zap, Hammer, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaPreview } from '@/components/MediaPreview';

/** Ads can be handed to an editor until the editor has submitted their cut. */
const ASSIGNABLE = ['assigned_agency', 'assigned_editor'];

const reviewDate = (a) => a.latest_review?.created_at || a.updated_at;

/**
 * Approved or rejected videos for this ad set, with who decided, when, and —
 * for rejections — the reviewer's remarks so the agency can act on them.
 */
function ReviewedTable({ kind, ads, empty, onPlay }) {
  const isRejected = kind === 'rejected';
  if (ads.length === 0) {
    return <div data-testid={`agency-${kind}-empty`} className="text-sm text-[color:var(--text-3)]">{empty}</div>;
  }
  return (
    <div className="card-elevated overflow-x-auto" data-testid={`agency-${kind}-table`}>
      <table className="w-full text-sm min-w-[780px]">
        <thead>
          <tr className="text-left border-b border-[color:var(--stroke)]">
            {['Video', 'Version', isRejected ? 'Rejected on' : 'Approved on', isRejected ? 'Reviewer remarks' : 'Approved by']
              .map(h => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal" style={{ fontFamily: 'var(--font-mono)' }}>{h}</th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--stroke)]">
          {ads.map(a => (
            <tr key={a.id} data-testid={`agency-${kind}-row-${a.id}`} className="hover:bg-white/[0.02] transition-colors align-top">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {a.media_file ? (
                    <button
                      data-testid={`agency-${kind}-play-${a.id}`}
                      onClick={() => onPlay(a)}
                      title={`Play ${a.name}`}
                      className="relative h-12 w-20 shrink-0 rounded-md overflow-hidden bg-black grid place-items-center group"
                    >
                      {(a.media_file.content_type || '').startsWith('video/') ? (
                        <video src={fileUrl(a.media_file.file_id)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                      ) : (
                        <img src={fileUrl(a.media_file.file_id)} alt={a.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      )}
                      <PlayCircle className="absolute inset-0 m-auto text-white/85 group-hover:text-white transition-colors" size={22} />
                    </button>
                  ) : (
                    <div className="h-12 w-20 shrink-0 rounded-md bg-white/5 grid place-items-center text-[10px] text-[color:var(--text-3)]">No media</div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                {a.current_version > 0 ? `v${a.current_version}` : '—'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div>{reviewDate(a) ? format(new Date(reviewDate(a)), 'd MMM yyyy') : '—'}</div>
                <div className="text-[11px] text-[color:var(--text-3)]">
                  {reviewDate(a) ? formatDistanceToNow(new Date(reviewDate(a)), { addSuffix: true }) : ''}
                </div>
              </td>
              <td className="px-4 py-3">
                {isRejected ? (
                  <div>
                    <div className="text-[color:var(--text-1)]">
                      {a.latest_review?.comments || a.latest_review_comment || <span className="text-[color:var(--text-3)]">No remarks given</span>}
                    </div>
                    {a.latest_review?.reviewer_name && (
                      <div className="text-[11px] text-[color:var(--text-3)] mt-0.5">— {a.latest_review.reviewer_name}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div>{a.latest_review?.reviewer_name || <span className="text-[color:var(--text-3)]">—</span>}</div>
                    {a.latest_review?.comments && (
                      <div className="text-[11px] text-[color:var(--text-3)] mt-0.5">{a.latest_review.comments}</div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AgencyAdSetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [editors, setEditors] = useState([]);
  const [adDetail, setAdDetail] = useState(null);
  const [adError, setAdError] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [busyAdId, setBusyAdId] = useState(null);
  const [bulkEditor, setBulkEditor] = useState('');
  const [tab, setTab] = useState('production');
  const [playing, setPlaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: s }, { data: eds }] = await Promise.all([
        api.get(`/ad-sets/${id}`),
        api.get('/agency/editors'),
      ]);
      setData(s);
      setEditors(eds);
      setSelectedAdId(prev => prev || (s.ads[0] && s.ads[0].id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load ad set');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedAdId) return;
    let cancelled = false;
    setAdDetail(null);
    setAdError(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/ads/${selectedAdId}`);
        if (!cancelled) setAdDetail(d);
      } catch (e) {
        // never leave the pane spinning — say why it could not load
        if (!cancelled) setAdError(e?.response?.data?.detail || 'This ad could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAdId, data]);

  const assign = async (adId, editorId) => {
    if (!editorId) return;
    setBusyAdId(adId);
    try {
      const { data: res } = await api.post('/workflow/agency/assign', { ad_ids: [adId], editor_id: editorId });
      if (res.assigned_count === 0) { toast.error('That ad can no longer be reassigned'); return; }
      toast.success(`Assigned to ${editors.find(e => e.id === editorId)?.name || 'editor'}`);
      await load();
      if (adId === selectedAdId) setAdDetail((await api.get(`/ads/${adId}`)).data);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to assign'); } finally { setBusyAdId(null); }
  };

  const assignRemaining = async () => {
    const ids = data.ads.filter(a => a.status === 'assigned_agency').map(a => a.id);
    if (!bulkEditor || ids.length === 0) return;
    setBusy(true);
    try {
      const { data: res } = await api.post('/workflow/agency/assign', { ad_ids: ids, editor_id: bulkEditor });
      toast.success(`Assigned ${res.assigned_count} ad(s)`);
      setBulkEditor('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!data) return <div><PageHeader title="Ad set" /><div className="p-6"><PageLoader /></div></div>;
  const { ad_set, ads } = data;
  const editorName = (eid) => editors.find(e => e.id === eid)?.name;
  const unassigned = ads.filter(a => a.status === 'assigned_agency').length;
  // grouped on each ad's latest review outcome
  const approvedAds = ads.filter(a => a.status === 'approved');
  const rejectedAds = ads.filter(a => a.status === 'final_rejected');

  return (
    <div>
      <PageHeader
        title={ad_set.name}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'var(--font-mono)' }}>{ad_set.ad_set_code}</span>
            · {ad_set.type === 'media_ready' ? 'Media ready' : 'Script'} · <StatusPill status={ad_set.status} />
            <span className="text-[color:var(--text-3)]">{ads.length} ad{ads.length === 1 ? '' : 's'}</span>
          </span>
        }
        breadcrumbs="Agency / Ad Set"
        actions={
          <button data-testid="agency-adset-back" onClick={() => nav('/agency')} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <div className="px-6 lg:px-8 pt-4 flex items-center gap-2 border-b border-[color:var(--stroke)] flex-wrap">
        {[
          { v: 'production', label: 'Production', icon: Hammer, count: ads.length },
          { v: 'approved', label: 'Approved videos', icon: CheckCircle2, count: approvedAds.length },
          { v: 'rejected', label: 'Rejected videos', icon: XCircle, count: rejectedAds.length },
        ].map(t => (
          <button
            key={t.v}
            data-testid={`agency-adset-tab-${t.v}`}
            onClick={() => setTab(t.v)}
            className={`h-9 px-4 rounded-t-lg text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab === t.v ? 'border-[color:var(--brand-teal)] text-[color:var(--text-1)]' : 'border-transparent text-[color:var(--text-3)] hover:text-[color:var(--text-1)]'}`}
          >
            <t.icon size={14} /> {t.label}
            <span className="tabular-nums text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'approved' && (
        <div className="p-6 lg:p-8">
          <ReviewedTable
            kind="approved"
            ads={approvedAds}
            empty="No videos from this ad set have been approved yet."
            onPlay={setPlaying}
          />
        </div>
      )}

      {tab === 'rejected' && (
        <div className="p-6 lg:p-8">
          <ReviewedTable
            kind="rejected"
            ads={rejectedAds}
            empty="Nothing from this ad set has been sent back."
            onPlay={setPlaying}
          />
        </div>
      )}

      {tab === 'production' && unassigned > 0 && editors.length > 0 && (
        <div className="px-6 lg:px-8 py-3 border-b border-[color:var(--stroke)] flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[color:var(--text-2)]">
            {unassigned} ad{unassigned === 1 ? '' : 's'} not yet with an editor
          </span>
          <div className="min-w-[200px]">
            <Select value={bulkEditor} onValueChange={setBulkEditor}>
              <SelectTrigger data-testid="agency-adset-bulk-editor" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] h-9"><SelectValue placeholder="Give them all to…" /></SelectTrigger>
              <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                {editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            data-testid="agency-adset-bulk-assign"
            onClick={assignRemaining}
            disabled={busy || !bulkEditor}
            className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Assign all
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[calc(100vh-200px)] ${tab === 'production' ? '' : 'hidden'}`}>
        <aside className="border-r border-[color:var(--stroke)] p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Ads ({ads.length})</div>
          {ads.map((a) => {
            const canAssign = ASSIGNABLE.includes(a.status);
            return (
              <div
                key={a.id}
                data-testid={`agency-adset-ad-${a.id}`}
                className={`rounded-lg border p-3 transition-colors ${selectedAdId === a.id ? 'border-[color:var(--brand-teal)]/50 bg-[color:var(--bg-2)]' : 'border-[color:var(--stroke)] hover:bg-white/[0.03]'}`}
              >
                <button onClick={() => setSelectedAdId(a.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
                </button>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[color:var(--text-3)]">
                  <UserRound size={11} className="shrink-0" />
                  {a.assigned_editor_id
                    ? <span className="truncate">{editorName(a.assigned_editor_id) || 'Editor'}</span>
                    : <span>No editor yet</span>}
                </div>

                {canAssign ? (
                  <div className="mt-2">
                    <Select value={a.assigned_editor_id || ''} onValueChange={(v) => assign(a.id, v)} disabled={busyAdId === a.id}>
                      <SelectTrigger data-testid={`agency-adset-assign-${a.id}`} className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] h-8 text-xs">
                        <SelectValue placeholder="Assign to editor" />
                      </SelectTrigger>
                      <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                        {editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-[color:var(--text-3)]">
                    {a.status === 'pending_final_review' ? 'Submitted for final review — locked'
                      : a.status === 'approved' ? 'Approved — locked'
                      : 'Not ready to assign'}
                  </div>
                )}
              </div>
            );
          })}
          {editors.length === 0 && (
            <div className="text-[11px] text-[color:var(--text-3)] px-1 pt-2">
              No editors in your agency yet — add one under <span className="text-[color:var(--brand-teal)]">My Editors</span>.
            </div>
          )}
        </aside>

        <section className="p-6 lg:p-8">
          {adError ? (
            <div data-testid="agency-adset-ad-error" className="card-elevated p-6 max-w-lg">
              <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Can’t show this ad</div>
              <div className="text-sm text-[color:var(--text-3)] mt-1">{adError}</div>
            </div>
          ) : !adDetail ? <PageLoader /> : (
            <AdDetailBody
              ad={adDetail.ad}
              reviews={adDetail.reviews || []}
              versions={adDetail.versions || []}
              agency={adDetail.assigned_agency}
              editor={adDetail.assigned_editor}
            />
          )}
        </section>
      </div>

      {/* Playback only — agency admins no longer get asset downloads */}
      <Dialog open={!!playing} onOpenChange={(o) => { if (!o) setPlaying(null); }}>
        <DialogContent className="max-w-4xl bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{playing?.name}</DialogTitle>
            <div className="text-xs text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {playing?.ad_code}{playing?.current_version > 0 ? ` · v${playing.current_version}` : ''}
            </div>
          </DialogHeader>
          {playing?.media_file && <MediaPreview file={playing.media_file} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
