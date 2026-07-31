import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { FileUpload } from '@/components/FileUpload';
import { Upload, ClipboardList, Eye, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const COLUMNS = [
  { key: 'todo', title: 'To do', icon: ClipboardList, accent: '#B7FFF7', statuses: ['assigned_editor', 'final_rejected'] },
  { key: 'in_review', title: 'In review', icon: Eye, accent: '#FFD08A', statuses: ['pending_final_review'] },
  { key: 'approved', title: 'Approved', icon: CheckCircle2, accent: '#D7FF9A', statuses: ['approved'] },
];

function EditorAdCard({ ad, onOpen, onDrop, draggable }) {
  return (
    <div
      data-testid={`editor-kanban-card-${ad.id}`}
      draggable={!!draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/plain', ad.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(ad.id)}
      className={`group text-left rounded-lg border border-[color:var(--stroke)] bg-[color:var(--bg-1)] p-3 hover:bg-white/[0.03] hover:border-[color:var(--brand-teal)]/40 transition-colors ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium truncate">{ad.name}</div>
        <StatusPill status={ad.status} />
      </div>
      <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{ad.ad_code}</div>
      {ad.latest_review_comment && (ad.status === 'final_rejected') && (
        <div className="mt-2 rounded-md border border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.08)] p-2">
          <div className="text-[10px] text-[color:#FFB4B4] font-semibold flex items-center gap-1"><MessageSquare size={10} /> Reviewer feedback</div>
          <div className="text-[11px] text-[color:var(--text-1)] mt-0.5 line-clamp-2">{ad.latest_review_comment}</div>
        </div>
      )}
      <div className="text-[11px] text-[color:var(--text-3)] mt-2 flex items-center justify-between">
        <span>{ad.updated_at ? formatDistanceToNow(new Date(ad.updated_at), { addSuffix: true }) : ''}</span>
        {ad.current_version > 0 && <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>v{ad.current_version}</span>}
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadAdId, setUploadAdId] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/editor')).data); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = COLUMNS.map(col => ({
    ...col,
    items: data.ads.filter(a => col.statuses.includes(a.status)),
  }));

  const handleDrop = (targetCol, adId) => {
    setDragOver(null);
    const ad = data.ads.find(a => a.id === adId);
    if (!ad) return;
    const isInTodo = ['assigned_editor', 'final_rejected'].includes(ad.status);
    if (targetCol.key === 'in_review' && isInTodo) {
      // Trigger upload
      setUploadAdId(adId);
      setFile(null);
      setUploadOpen(true);
    } else if (targetCol.key === 'approved') {
      toast.info('Only the final reviewer can approve ads. Move to "In review" instead.');
    } else if (targetCol.key === 'todo' && ad.status === 'pending_final_review') {
      toast.info("You can't recall a submission. Wait for the reviewer's decision.");
    }
    // dropping into same column is a no-op
  };

  const submitUpload = async () => {
    if (!file) { toast.error('Upload a video first'); return; }
    setBusy(true);
    try {
      await api.post(`/workflow/editor/ads/${uploadAdId}/upload`, { media_file: file });
      toast.success('Submitted for final review');
      setUploadOpen(false); setFile(null); setUploadAdId(null);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="My assigned ads" subtitle="Drag an ad from ‘To do’ onto ‘In review’ to upload the final video. Approvals come from the final reviewer." />
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
                        {col.key === 'in_review' && data.ads.filter(a => ['assigned_editor', 'final_rejected'].includes(a.status)).length > 0
                          ? 'Drop an ad here to upload the video'
                          : col.key === 'todo' ? 'Nothing left to produce.' : col.key === 'approved' ? 'No approvals yet.' : 'Empty'}
                      </div>
                    )}
                    {col.items.map(ad => (
                      <EditorAdCard
                        key={ad.id}
                        ad={ad}
                        draggable={['assigned_editor', 'final_rejected'].includes(ad.status)}
                        onOpen={(id) => nav(`/editor/ads/${id}`)}
                        onDrop={handleDrop}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Upload video</DialogTitle></DialogHeader>
          <div>
            <div className="text-xs text-[color:var(--text-3)] mb-2">Attach the final video for this ad. It will be submitted to the final reviewer.</div>
            <FileUpload testId="editor-kanban-upload" value={file} onChange={setFile} accept="video/*" label="Upload the final video" />
          </div>
          <DialogFooter>
            <button data-testid="editor-kanban-upload-submit" onClick={submitUpload} disabled={busy || !file} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50"><Upload size={14} />{busy && <Loader2 className="animate-spin" size={14} />} Submit for final review</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
