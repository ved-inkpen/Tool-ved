import React from 'react';
import { fileUrl, downloadUrl } from '@/lib/api';
import { File as FileIcon, Download } from 'lucide-react';

export function MediaPreview({ file, className = '', showDownload = false }) {
  if (!file) return null;
  const ct = file.content_type || '';
  const src = fileUrl(file.file_id);
  const dl = downloadUrl(file.file_id);
  return (
    <div className={`rounded-xl overflow-hidden border border-[color:var(--stroke)] bg-black ${className}`} data-testid="media-preview">
      {ct.startsWith('image/') && (
        <img src={src} alt={file.filename} className="w-full h-full object-contain max-h-[520px] bg-black" />
      )}
      {ct.startsWith('video/') && (
        <video src={src} controls className="w-full h-full max-h-[520px] bg-black" data-testid="media-preview-video" />
      )}
      {(!ct.startsWith('image/') && !ct.startsWith('video/')) && (
        <div className="p-8 flex flex-col items-center gap-2 text-[color:var(--text-2)]">
          <FileIcon size={28} />
          <div className="text-sm">{file.filename}</div>
        </div>
      )}
      {showDownload && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[color:var(--stroke)] bg-[color:var(--bg-1)]">
          <div className="text-xs text-[color:var(--text-3)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>{file.filename}</div>
          <a data-testid="media-preview-download-button" href={dl} className="text-xs inline-flex items-center gap-1 text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)]">
            <Download size={12} /> Download
          </a>
        </div>
      )}
    </div>
  );
}
