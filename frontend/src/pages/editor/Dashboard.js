import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { FileUpload } from '@/components/FileUpload';
import { AdBrief } from '@/components/AdBrief';
import { Upload, ClipboardList, Eye, CheckCircle2, Loader2, MessageSquare, ChevronDown, ChevronUp, Send, Film, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const COLUMNS = [
  { key: 'todo', title: 'To do', icon: ClipboardList, accent: '#B7FFF7', statuses: ['assigned_editor', 'final_rejected'] },
  { key: 'in_review', title: 'In review', icon: Eye, accent: '#FFD08A', statuses: ['pending_final_review'] },
  { key: 'approved', title: 'Approved', icon: CheckCircle2, accent: '#D7FF9A', statuses: ['approved'] },
];

const isTodo = (ad) => ['assigned_editor', 'final_rejected'].includes(ad.status);

function EditorAdCard({ ad, adSetName, onOpen, onWork, expanded, onToggleBrief, draggable }) {
  return (
    <div
      data-testid={`editor-kanban-card-${ad.id}`}
      draggable={!!draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/plain', ad.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`group rounded-lg border border-[color:var(--stroke)] bg-[color:var(--bg-1)] p-3 hover:border-[color:var(--brand-teal)]/40 transition-colors ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <button onClick={() => onOpen(ad.id)} className="w-full text-left">
        {adSetName && (
          <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--text-3)] mb-1.5 min-w-0" title={`Ad set: ${adSetName}`}>
            <Layers size={11} className="shrink-0" />
            <span className="truncate">{adSetName}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium truncate">{ad.name}</div>
          <StatusPill status={ad.status} />
        </div>
        <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          {ad.ad_set_code} · {ad.ad_code}
        </div>
      </button>

      {ad.latest_review_comment && ad.status === 'final_rejected' && (
        <div className="mt-2 rounded-md border border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.08)] p-2">
          <div className="text-[10px] text-[color:#FFB4B4] font-semibold flex items-center gap-1"><MessageSquare size={10} /> Reviewer feedback</div>
          <div className="text-[11px] text-[color:var(--text-1)] mt-0.5 line-clamp-2">{ad.latest_review_comment}</div>
        </div>
      )}

      {ad.draft_media_file && isTodo(ad) && (
        <div className="mt-2 rounded-md border border-[color:var(--brand-teal)]/40 bg-[color:var(--brand-teal)]/10 p-2">
          <div className="text-[10px] text-[color:var(--brand-teal)] font-semibold flex items-center gap-1"><Film size={10} /> Uploaded · not submitted</div>
          <div className="text-[11px] text-[color:var(--text-1)] mt-0.5 truncate" style={{ fontFamily: 'var(--font-mono)' }}>{ad.draft_media_file.filename}</div>
        </div>
      )}

      <button
        data-testid={`editor-brief-toggle-${ad.id}`}
        onClick={() => onToggleBrief(ad.id)}
        className="mt-2 w-full h-7 rounded-md border border-[color:var(--stroke)] hover:bg-white/5 text-[11px] text-[color:var(--text-2)] inline-flex items-center justify-center gap-1 transition-colors"
      >
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />} {expanded ? 'Hide brief' : 'Brief'}
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[color:var(--stroke)]">
          <AdBrief ad={ad} compact />
        </div>
      )}

      <div className="text-[11px] text-[color:var(--text-3)] mt-2 flex items-center justify-between">
        <span>{ad.updated_at ? formatDistanceToNow(new Date(ad.updated_at), { addSuffix: true }) : ''}</span>
        {ad.current_version > 0 && <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>v{ad.current_version}</span>}
      </div>

      {isTodo(ad) && (
        <button
          data-testid={`editor-card-work-${ad.id}`}
          onClick={() => onWork(ad.id)}
          className="mt-2 w-full h-8 rounded-md bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          {ad.draft_media_file ? <><Send size={12} /> Review & submit</> : <><Upload size={12} /> Upload media</>}
        </button>
      )}
    </div>
  );
}

export default function EditorDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null);
  const [expandedBrief, setExpandedBrief] = useState(null);
  const [workAdId, setWorkAdId] = useState(null);
  const [staging, setStaging] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/editor')).data); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const workAd = data.ads.find(a => a.id === workAdId) || null;
  // ad_set_id -> name, so each card can show the campaign it belongs to
  const adSetNames = Object.fromEntries((data.ad_sets || []).map(s => [s.id, s.name]));

  const columns = COLUMNS.map(col => ({
    ...col,
    items: data.ads.filter(a => col.statuses.includes(a.status)),
  }));

  const handleDrop = (targetCol, adId) => {
    setDragOver(null);
    const ad = data.ads.find(a => a.id === adId);
    if (!ad) return;
    if (targetCol.key === 'in_review' && isTodo(ad)) {
      setWorkAdId(adId);
    } else if (targetCol.key === 'approved') {
      toast.info('Only the final reviewer can approve ads. Move to "In review" instead.');
    } else if (targetCol.key === 'todo' && ad.status === 'pending_final_review') {
      toast.info("You can't recall a submission. Wait for the reviewer's decision.");
    }
    // dropping into same column is a no-op
  };

  /** Uploading only stages the file on the ad — it does not notify the reviewer. */
  const stageMedia = async (fileRef) => {
    if (!fileRef) return;
    setStaging(true);
    try {
      await api.post(`/workflow/editor/ads/${workAdId}/upload`, { media_file: fileRef });
      toast.success('Media uploaded. Submit when you are ready.');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally { setStaging(false); }
  };

  const discardMedia = async () => {
    setStaging(true);
    try {
      await api.delete(`/workflow/editor/ads/${workAdId}/upload`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to remove');
    } finally { setStaging(false); }
  };

  const submitForReview = async () => {
    setBusy(true);
    try {
      await api.post(`/workflow/editor/ads/${workAdId}/submit`);
      toast.success('Submitted for final review');
      setWorkAdId(null);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="My assigned ads" subtitle="Open an ad to read the brief and upload your cut. Uploading saves your work — it only reaches the final reviewer when you submit." />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="Nothing assigned to you yet" description="Your agency admin will assign ads to you here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns.map(col => {
              const canDropInto = col.key === 'in_review';
              return (
                <div
                  key={col.key}
                  data-testid={`editor-kanban-column-${col.key}`}
                  className={`card-elevated flex flex-col min-h-[420px] transition-colors ${dragOver === col.key ? 'ring-2 ring-[color:var(--brand-teal)]/60 bg-[color:var(--brand-teal)]/5' : ''}`}
                  onDragOver={(e) => { if (canDropInto) { e.preventDefault(); setDragOver(col.key); e.dataTransfer.dropEffect = 'move'; } }}
                  onDragLeave={() => setDragOver(prev => prev === col.key ? null : prev)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const adId = e.dataTransfer.getData('text/plain');
                    if (adId) handleDrop(col, adId);
                  }}
                >
                  <div className="px-4 py-3 border-b border-[color:var(--stroke)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <col.icon size={14} style={{ color: col.accent }} />
                      <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{col.title}</div>
                    </div>
                    <div className="text-xs text-[color:var(--text-3)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{col.items.length}</div>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {col.items.length === 0 && (
                      <div className="text-xs text-[color:var(--text-3)] px-2 py-6 text-center">
                        {col.key === 'in_review' && data.ads.filter(isTodo).length > 0
                          ? 'Drop an ad here to upload the video'
                          : col.key === 'todo' ? 'Nothing left to produce.' : col.key === 'approved' ? 'No approvals yet.' : 'Empty'}
                      </div>
                    )}
                    {col.items.map(ad => (
                      <EditorAdCard
                        key={ad.id}
                        ad={ad}
                        adSetName={adSetNames[ad.ad_set_id]}
                        draggable={isTodo(ad)}
                        expanded={expandedBrief === ad.id}
                        onToggleBrief={(id) => setExpandedBrief(prev => prev === id ? null : id)}
                        onOpen={(id) => nav(`/editor/ads/${id}`)}
                        onWork={(id) => setWorkAdId(id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!workAdId} onOpenChange={(o) => { if (!o) setWorkAdId(null); }}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)] max-w-2xl max-h-[85vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{workAd ? workAd.name : 'Ad'}</DialogTitle>
            {workAd && (
              <div className="text-xs text-[color:var(--text-3)] flex items-center gap-1.5">
                <Layers size={11} />
                <span>{adSetNames[workAd.ad_set_id] || 'Ad set'}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>· {workAd.ad_code}</span>
              </div>
            )}
          </DialogHeader>
          {workAd && (
            <div className="space-y-5 flex-1 min-h-0 overflow-y-auto pr-1">
              <AdBrief ad={workAd} compact />
              <div className="pt-4 border-t border-[color:var(--stroke)]">
                <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  Your {workAd.current_version > 0 ? `cut (v${workAd.current_version + 1})` : 'cut'}
                </div>
                <FileUpload
                  testId="editor-kanban-upload"
                  value={workAd.draft_media_file || null}
                  onChange={(v) => (v ? stageMedia(v) : discardMedia())}
                  accept="video/*"
                  label="Upload the final video"
                />
                <div className="text-[11px] text-[color:var(--text-3)] mt-2">
                  {workAd.draft_media_file
                    ? 'Saved to this ad. The final reviewer sees it only after you submit.'
                    : 'Uploading saves the file against this ad — it is not sent for review yet.'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 pt-4 mt-4 border-t border-[color:var(--stroke)]">
            <button
              onClick={() => setWorkAdId(null)}
              className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors"
            >
              Close
            </button>
            <button
              data-testid="editor-kanban-upload-submit"
              onClick={submitForReview}
              disabled={busy || staging || !workAd?.draft_media_file}
              className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Submit for final review
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
