import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { FileUpload } from '@/components/FileUpload';
import { ArrowLeft, Upload, Loader2, Send, Film } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EditorAdDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [staging, setStaging] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setDetail((await api.get(`/ads/${id}`)).data); } catch (e) { toast.error('Failed to load'); } };
  useEffect(() => { load(); }, [id]);

  /** Uploading only stages the file — the reviewer is notified on submit. */
  const stageMedia = async (fileRef) => {
    setStaging(true);
    try {
      if (fileRef) {
        await api.post(`/workflow/editor/ads/${id}/upload`, { media_file: fileRef });
        toast.success('Media uploaded. Submit when you are ready.');
      } else {
        await api.delete(`/workflow/editor/ads/${id}/upload`);
      }
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally { setStaging(false); }
  };

  const submitForReview = async () => {
    setBusy(true);
    try {
      await api.post(`/workflow/editor/ads/${id}/submit`);
      toast.success('Submitted for final review');
      setOpen(false);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!detail) return <div><PageHeader title="Ad" /><div className="p-6"><PageLoader /></div></div>;
  const { ad } = detail;
  const canUpload = ['assigned_editor', 'final_rejected'].includes(ad.status);
  const staged = ad.draft_media_file;
  const nextVersion = (ad.current_version || 0) + 1;

  return (
    <div>
      <PageHeader
        title={ad.name}
        subtitle={<span style={{ fontFamily: 'var(--font-mono)' }}>{ad.ad_code}</span>}
        breadcrumbs="Editor / Ad"
        actions={<>
          <button data-testid="editor-ad-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors"><ArrowLeft size={14} /> Back</button>
          {canUpload && (
            <>
              <button data-testid="editor-upload-button" onClick={() => setOpen(true)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm inline-flex items-center gap-2 transition-colors">
                <Upload size={14} /> {staged ? 'Replace media' : `Upload ${ad.current_version > 0 ? 'new version' : 'video'}`}
              </button>
              <button
                data-testid="editor-submit-button"
                onClick={submitForReview}
                disabled={busy || !staged}
                title={staged ? undefined : 'Upload media first'}
                className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Submit for final review
              </button>
            </>
          )}
        </>}
      />
      <div className="p-6 lg:p-8 space-y-6">
        {canUpload && staged && (
          <div className="card-elevated p-4 border-[color:var(--brand-teal)]/40 bg-[color:var(--brand-teal)]/[0.06] flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs text-[color:var(--brand-teal)] font-semibold flex items-center gap-1.5"><Film size={12} /> v{nextVersion} uploaded · not submitted</div>
              <div className="text-sm mt-1 truncate" style={{ fontFamily: 'var(--font-mono)' }}>{staged.filename}</div>
              <div className="text-[11px] text-[color:var(--text-3)] mt-0.5">The final reviewer will not see this until you submit.</div>
            </div>
            <button
              data-testid="editor-submit-banner-button"
              onClick={submitForReview}
              disabled={busy}
              className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Submit for final review
            </button>
          </div>
        )}
        <AdDetailBody ad={ad} reviews={detail.reviews || []} versions={detail.versions || []} agency={detail.assigned_agency} editor={detail.assigned_editor} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Upload {ad.current_version > 0 ? `v${nextVersion}` : 'video'}</DialogTitle></DialogHeader>
          <FileUpload testId="video-upload-dropzone" value={staged || null} onChange={stageMedia} accept="video/*" label="Upload the final video" />
          <div className="text-[11px] text-[color:var(--text-3)]">Uploading saves the file against this ad. It is sent for review only when you submit.</div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Done</button>
            <button data-testid="editor-upload-submit" onClick={submitForReview} disabled={busy || staging || !staged} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Submit for final review
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
