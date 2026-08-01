import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function FinalReviewDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [detail, setDetail] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [listingLink, setListingLink] = useState('');
  const [deeplink, setDeeplink] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/ads/${id}`);
      setDetail(data);
      setListingLink(data.ad.custom_listing_link || '');
      setDeeplink(data.ad.deeplink || '');
    } catch (e) { toast.error('Failed to load'); }
  };
  useEffect(() => { load(); }, [id]);

  const approve = async () => {
    setBusy(true);
    try {
      await api.post(`/workflow/final-review/ads/${id}`, {
        action: 'approve',
        custom_listing_link: listingLink.trim(),
        deeplink: deeplink.trim(),
      });
      toast.success('Approved');
      setApproveOpen(false);
      nav('/final-review');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!comment.trim()) { toast.error('Feedback is required'); return; }
    setBusy(true);
    try {
      await api.post(`/workflow/final-review/ads/${id}`, { action: 'reject', comments: comment });
      toast.success('Rejected with feedback');
      setRejectOpen(false);
      nav('/final-review');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!detail) return <div><PageHeader title="Ad" /><div className="p-6"><PageLoader /></div></div>;
  const canReview = detail.ad.status === 'pending_final_review';

  return (
    <div>
      <PageHeader
        title={detail.ad.name}
        subtitle={<span style={{ fontFamily: 'var(--font-mono)' }}>{detail.ad.ad_code}</span>}
        breadcrumbs="Final Review"
        actions={<>
          <button data-testid="final-review-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors"><ArrowLeft size={14} /> Back</button>
          {canReview && (
            <>
              <button data-testid="final-review-reject-button" onClick={() => setRejectOpen(true)} className="h-9 px-4 rounded-lg text-sm text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)] inline-flex items-center gap-2 transition-colors"><X size={14} /> Reject</button>
              <button data-testid="final-review-approve-button" onClick={() => setApproveOpen(true)} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">{busy && <Loader2 className="animate-spin" size={14} />}<Check size={14} /> Approve</button>
            </>
          )}
        </>}
      />
      <div className="p-6 lg:p-8">
        <AdDetailBody ad={detail.ad} reviews={detail.reviews || []} versions={detail.versions || []} agency={detail.assigned_agency} editor={detail.assigned_editor} />
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Approve {detail.ad.name}</DialogTitle>
            <div className="text-xs text-[color:var(--text-3)]">These are handed to the ad poster with the final asset.</div>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Custom listing link</label>
              <input
                data-testid="final-approve-listing-link"
                value={listingLink}
                onChange={(e) => setListingLink(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=…"
                className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Deeplink</label>
              <input
                data-testid="final-approve-deeplink"
                value={deeplink}
                onChange={(e) => setDeeplink(e.target.value)}
                placeholder="myapp://campaign/summer"
                className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm"
              />
            </div>
            <div className="text-[11px] text-[color:var(--text-3)]">Both are optional — you can approve without them and add them later.</div>
          </div>
          <DialogFooter>
            <button onClick={() => setApproveOpen(false)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button data-testid="final-approve-confirm" onClick={approve} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Approve
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Reject with feedback</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Notes for the editor</label>
            <textarea data-testid="final-review-reject-textarea" value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Explain what needs to change…" />
          </div>
          <DialogFooter>
            <button data-testid="final-review-reject-confirm" onClick={reject} disabled={busy || !comment.trim()} className="h-9 px-4 rounded-lg text-sm text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)] inline-flex items-center gap-2">{busy && <Loader2 className="animate-spin" size={14} />} Send back to editor</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
