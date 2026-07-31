import React from 'react';

const STATUS_META = {
  draft:               { label: 'Draft',                bg: 'rgba(143,161,179,0.14)', text: '#C7D2E0', border: 'rgba(143,161,179,0.28)' },
  pending_script_review: { label: 'Pending script review', bg: 'rgba(34,211,238,0.14)', text: '#7DEBFF', border: 'rgba(34,211,238,0.30)' },
  script_rejected:     { label: 'Script rejected',       bg: 'rgba(248,113,113,0.14)', text: '#FFB4B4', border: 'rgba(248,113,113,0.30)' },
  assigned_agency:     { label: 'Assigned to agency',    bg: 'rgba(20,184,166,0.14)', text: '#6EF3E6', border: 'rgba(20,184,166,0.30)' },
  assigned_editor:     { label: 'Assigned to editor',    bg: 'rgba(20,184,166,0.10)', text: '#B7FFF7', border: 'rgba(20,184,166,0.22)' },
  pending_final_review:{ label: 'Pending final review',  bg: 'rgba(245,158,11,0.14)', text: '#FFD08A', border: 'rgba(245,158,11,0.30)' },
  final_rejected:      { label: 'Final rejected',        bg: 'rgba(248,113,113,0.14)', text: '#FFB4B4', border: 'rgba(248,113,113,0.30)' },
  approved:            { label: 'Approved',              bg: 'rgba(132,204,22,0.14)', text: '#D7FF9A', border: 'rgba(132,204,22,0.30)' },
  in_progress:         { label: 'In progress',           bg: 'rgba(34,211,238,0.10)', text: '#A9E7F5', border: 'rgba(34,211,238,0.24)' },
  completed:           { label: 'Completed',             bg: 'rgba(132,204,22,0.14)', text: '#D7FF9A', border: 'rgba(132,204,22,0.30)' },
};

export function StatusPill({ status, size = 'sm', withDot = true, className = '' }) {
  const meta = STATUS_META[status] || { label: status, bg: 'rgba(143,161,179,0.14)', text: '#C7D2E0', border: 'rgba(143,161,179,0.28)' };
  const sizeCls = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';
  return (
    <span
      data-testid={`status-pill-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide ${sizeCls} ${className}`}
      style={{ background: meta.bg, color: meta.text, borderColor: meta.border, fontFamily: 'var(--font-display)' }}
    >
      {withDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.text }} />}
      {meta.label}
    </span>
  );
}

export const STATUS_LABELS = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label]));
