import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { FileUpload } from '@/components/FileUpload';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EditorAdDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setDetail((await api.get(`/ads/${id}`)).data); } catch (e) { toast.error('Failed to load'); } };
  useEffect(() => { load(); }, [id]);

  const submit = async () => {
    if (!file) { toast.error('Upload a video first'); return; }
    setBusy(true);
    try {
      await api.post(`/workflow/editor/ads/${id}/upload`, { media_file: file });
      toast.success('Submitted for final review');
      setOpen(false); setFile(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!detail) return <div><PageHeader title="Ad" /><div className="p-6"><PageLoader /></div></div>;
  const canUpload = ['assigned_editor', 'final_rejected'].includes(detail.ad.status);

  return (
    <div>
      <PageHeader
        title={detail.ad.name}
        subtitle={<span style={{ fontFamily: 'var(--font-mono)' }}>{detail.ad.ad_code}</span>}
        breadcrumbs="Editor / Ad"
        actions={<>
          <button data-testid="editor-ad-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors"><ArrowLeft size={14} /> Back</button>
          {canUpload && (
            <button data-testid="editor-upload-button" onClick={() => setOpen(true)} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors"><Upload size={14} /> Upload {detail.ad.current_version > 0 ? 'new version' : 'video'}</button>
          )}
        </>}
      />
      <div className="p-6 lg:p-8">
        <AdDetailBody ad={detail.ad} reviews={detail.reviews || []} versions={detail.versions || []} agency={detail.assigned_agency} editor={detail.assigned_editor} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Upload {detail.ad.current_version > 0 ? `v${detail.ad.current_version + 1}` : 'video'}</DialogTitle></DialogHeader>
          <FileUpload testId="video-upload-dropzone" value={file} onChange={setFile} accept="video/*" label="Upload the final video" />
          <DialogFooter>
            <button data-testid="editor-upload-submit" onClick={submit} disabled={busy || !file} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2">{busy && <Loader2 className="animate-spin" size={14} />} Submit for final review</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
