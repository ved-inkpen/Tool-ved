import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, X, File as FileIcon, Loader2 } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import { toast } from 'sonner';

/**
 * FileUpload component
 * props:
 *  - value: FileRef[] or FileRef (based on multiple)
 *  - onChange: (value) => void
 *  - multiple: boolean
 *  - accept: MIME string
 *  - maxSizeMB: number
 *  - testId: string for data-testid
 *  - label: string
 */
export function FileUpload({ value, onChange, multiple = false, accept, maxSizeMB = 500, testId = 'file-upload', label = 'Upload files' }) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const files = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);

  const upload = useCallback(async (file) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB}MB.`);
      return null;
    }
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const { data } = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, [maxSizeMB]);

  const handleFiles = useCallback(async (fileList) => {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return;
    if (!multiple) {
      const res = await upload(arr[0]);
      if (res) onChange(res);
    } else {
      const results = [];
      for (const f of arr) {
        const res = await upload(f);
        if (res) results.push(res);
      }
      onChange([...(files || []), ...results]);
    }
  }, [multiple, upload, onChange, files]);

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (fileIdx) => {
    if (multiple) {
      const next = files.filter((_, i) => i !== fileIdx);
      onChange(next);
    } else {
      onChange(null);
    }
  };

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors ${
          drag ? 'border-[var(--brand-teal)] bg-white/[0.03]' : 'border-[color:var(--stroke)] hover:bg-white/[0.02]'
        }`}
        data-testid={testId}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          data-testid={`${testId}-input`}
        />
        <div className="flex flex-col items-center gap-2 text-[color:var(--text-2)]">
          {uploading ? <Loader2 className="animate-spin" size={22} /> : <UploadCloud size={22} />}
          <div className="text-sm font-medium text-[color:var(--text-1)]">{uploading ? 'Uploading…' : label}</div>
          <div className="text-[11px] text-[color:var(--text-3)]">Drag & drop or click to browse (max {maxSizeMB}MB{multiple ? ', multiple allowed' : ''})</div>
        </div>
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={f.file_id || i} className="flex items-center gap-3 rounded-lg border border-[color:var(--stroke)] bg-[color:var(--bg-2)] px-3 py-2">
              {f.content_type?.startsWith('image/') ? (
                <img src={fileUrl(f.file_id)} alt={f.filename} className="h-10 w-10 rounded object-cover" />
              ) : f.content_type?.startsWith('video/') ? (
                <video src={fileUrl(f.file_id)} className="h-10 w-16 rounded object-cover" muted />
              ) : (
                <div className="h-10 w-10 rounded bg-white/5 grid place-items-center"><FileIcon size={16} /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{f.filename}</div>
                <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{(f.size / 1024).toFixed(1)} KB</div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Remove"
                data-testid={`${testId}-remove-${i}`}
                className="h-8 w-8 rounded grid place-items-center text-[color:var(--text-3)] hover:bg-white/5 hover:text-white"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
