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
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setDetail((await api.get(`/ads/${id}`)).data); } catch (e) { toast.error('Failed to load'); } };
  useEffect(() => { load(); }, [id]);

  const approve = async () => {
    setBusy(true);
    try {
      await api.post(`/workflow/final-review/ads/${id}`, { action: 'approve' });
      toast.success('Approved');
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
              <button data-testid="final-review-approve-button" onClick={approve} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">{busy && <Loader2 className="animate-spin" size={14} />}<Check size={14} /> Approve</button>
            </>
          )}
        </>}
      />
      <div className="p-6 lg:p-8">
        <AdDetailBody ad={detail.ad} reviews={detail.reviews || []} versions={detail.versions || []} agency={detail.assigned_agency} editor={detail.assigned_editor} />
      </div>

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
