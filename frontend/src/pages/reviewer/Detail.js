import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { ArrowLeft, Check, X, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ScriptReviewDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [ads, setAds] = useState([]);
  const [adDetail, setAdDetail] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('approve');
  const [agencyId, setAgencyId] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [{ data: s }, { data: ags }] = await Promise.all([
        api.get(`/ad-sets/${id}`),
        api.get('/agencies'),
      ]);
      setData(s.ad_set);
      setAds(s.ads);
      setAgencies(ags);
      if (!selectedAdId && s.ads[0]) setSelectedAdId(s.ads[0].id);
    } catch (e) { toast.error('Failed to load'); }
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!selectedAdId) return;
    (async () => { try { setAdDetail((await api.get(`/ads/${selectedAdId}`)).data); } catch (e) {} })();
  }, [selectedAdId, ads]);

  const approve = async () => {
    if (!agencyId) { toast.error('Select an agency'); return; }
    setBusy(true);
    try {
      await api.post(`/workflow/script-review/ads/${selectedAdId}`, { action: 'approve', agency_id: agencyId, comments: comment });
      toast.success('Approved & assigned');
      setApproveOpen(false); setComment(''); setAgencyId('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!comment.trim()) { toast.error('Add feedback for the creator'); return; }
    setBusy(true);
    try {
      await api.post(`/workflow/script-review/ads/${selectedAdId}`, { action: 'reject', comments: comment });
      toast.success('Rejected with feedback');
      setRejectOpen(false); setComment('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const bulkSubmit = async () => {
    const pendingIds = ads.filter(a => a.status === 'pending_script_review').map(a => a.id);
    if (pendingIds.length === 0) { toast.error('No ads pending review'); return; }
    if (bulkAction === 'approve' && !agencyId) { toast.error('Select an agency'); return; }
    if (bulkAction === 'reject' && !comment.trim()) { toast.error('Add feedback'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/workflow/script-review/bulk', {
        ad_ids: pendingIds,
        action: bulkAction,
        comments: comment,
        agency_id: bulkAction === 'approve' ? agencyId : undefined,
      });
      const okCount = data.results.filter(r => r.ok).length;
      toast.success(`${okCount} of ${pendingIds.length} ad(s) ${bulkAction === 'approve' ? 'approved' : 'rejected'}`);
      setBulkOpen(false); setComment(''); setAgencyId('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!data) return <div><PageHeader title="Script Review" /><div className="p-6"><PageLoader /></div></div>;
  const currentAd = ads.find(a => a.id === selectedAdId);
  const canReview = currentAd && currentAd.status === 'pending_script_review';
  const pendingCount = ads.filter(a => a.status === 'pending_script_review').length;

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={<span className="inline-flex items-center gap-2"><span style={{ fontFamily: 'var(--font-mono)' }}>{data.ad_set_code}</span> · Script review · <span className="text-[color:var(--text-3)]">{pendingCount} pending</span></span>}
        breadcrumbs="Script Review"
        actions={<>
          <button data-testid="script-review-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors"><ArrowLeft size={14} /> Back</button>
          {pendingCount > 1 && (
            <button data-testid="script-review-bulk-button" onClick={() => { setBulkAction('approve'); setBulkOpen(true); }} className="h-9 px-4 rounded-lg border border-[color:var(--brand-teal)]/40 text-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal)]/10 text-sm inline-flex items-center gap-2 transition-colors">
              <Layers size={14} /> Review all ({pendingCount})
            </button>
          )}
        </>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[color:var(--stroke)] p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Ads ({ads.length})</div>
          {ads.map((a) => (
            <button key={a.id} data-testid={`script-review-ad-${a.id}`} onClick={() => setSelectedAdId(a.id)} className={`w-full text-left rounded-lg p-3 border transition-colors ${selectedAdId === a.id ? 'border-[color:var(--brand-teal)]/50 bg-[color:var(--bg-2)]' : 'border-[color:var(--stroke)] hover:bg-white/[0.03]'}`}>
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
            <AdDetailBody
              ad={adDetail.ad} reviews={adDetail.reviews || []} versions={adDetail.versions || []}
              agency={adDetail.assigned_agency} editor={adDetail.assigned_editor}
              extra={canReview && (
                <div className="flex items-center gap-2">
                  <button data-testid="script-review-reject-button" onClick={() => setRejectOpen(true)} className="h-9 px-4 rounded-lg text-sm text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)] inline-flex items-center gap-2 transition-colors"><X size={14} /> Reject</button>
                  <button data-testid="script-review-approve-button" onClick={() => setApproveOpen(true)} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors"><Check size={14} /> Approve & assign</button>
                </div>
              )}
            />
          )}
        </section>
      </div>

      {/* Single approve */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Approve & assign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Assign to agency</label>
              <Select value={agencyId} onValueChange={setAgencyId}>
                <SelectTrigger data-testid="script-review-agency-select" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] mt-1"><SelectValue placeholder="Choose agency" /></SelectTrigger>
                <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                  {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Notes for the agency (optional)</label>
              <textarea data-testid="script-review-approve-notes" value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full min-h-[70px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Any handoff notes…" />
            </div>
          </div>
          <DialogFooter>
            <button data-testid="script-review-approve-confirm" onClick={approve} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2">{busy && <Loader2 className="animate-spin" size={14} />} Approve & assign</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single reject */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Reject script</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Feedback for creator</label>
            <textarea data-testid="script-review-reject-textarea" value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Explain what needs to change…" />
            <div className="text-[11px] text-[color:var(--text-3)] mt-1">{comment.length} chars</div>
          </div>
          <DialogFooter>
            <button data-testid="script-review-reject-confirm" onClick={reject} disabled={busy || !comment.trim()} className="h-9 px-4 rounded-lg text-sm text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)] inline-flex items-center gap-2">{busy && <Loader2 className="animate-spin" size={14} />} Reject</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk review */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Review {pendingCount} ad(s) at once</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button data-testid="script-review-bulk-tab-approve" onClick={() => setBulkAction('approve')} className={`h-9 px-4 rounded-lg text-sm inline-flex items-center gap-2 border transition-colors ${bulkAction === 'approve' ? 'border-[color:var(--brand-teal)] bg-[color:var(--brand-teal)]/10 text-[color:#6EF3E6]' : 'border-[color:var(--stroke)] text-[color:var(--text-2)] hover:bg-white/5'}`}><Check size={14} /> Approve & assign</button>
              <button data-testid="script-review-bulk-tab-reject" onClick={() => setBulkAction('reject')} className={`h-9 px-4 rounded-lg text-sm inline-flex items-center gap-2 border transition-colors ${bulkAction === 'reject' ? 'border-[color:#FFB4B4]/40 bg-[color:rgba(248,113,113,0.10)] text-[color:#FFB4B4]' : 'border-[color:var(--stroke)] text-[color:var(--text-2)] hover:bg-white/5'}`}><X size={14} /> Reject</button>
            </div>
            <div className="text-xs text-[color:var(--text-3)]">{bulkAction === 'approve' ? `All ${pendingCount} pending ad(s) will be approved and assigned to the selected agency with the same comment.` : `All ${pendingCount} pending ad(s) will be sent back with the same feedback.`}</div>
            {bulkAction === 'approve' && (
              <div>
                <label className="text-xs text-[color:var(--text-2)]">Assign to agency</label>
                <Select value={agencyId} onValueChange={setAgencyId}>
                  <SelectTrigger data-testid="script-review-bulk-agency-select" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] mt-1"><SelectValue placeholder="Choose agency" /></SelectTrigger>
                  <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-[color:var(--text-2)]">{bulkAction === 'approve' ? 'Notes for the agency (optional)' : 'Feedback for creator (required)'}</label>
              <textarea data-testid="script-review-bulk-comment" value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder={bulkAction === 'approve' ? 'Handoff notes…' : 'Explain what to change…'} />
            </div>
          </div>
          <DialogFooter>
            <button data-testid="script-review-bulk-confirm" onClick={bulkSubmit} disabled={busy || (bulkAction === 'approve' ? !agencyId : !comment.trim())} className={`h-9 px-4 rounded-lg text-sm inline-flex items-center gap-2 transition-colors ${bulkAction === 'approve' ? 'bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white' : 'text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)]'}`}>
              {busy && <Loader2 className="animate-spin" size={14} />} {bulkAction === 'approve' ? 'Approve all' : 'Reject all'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
