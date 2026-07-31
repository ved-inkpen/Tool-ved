import React from 'react';
import { Loader2 } from 'lucide-react';

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-[300px] w-full grid place-items-center text-[color:var(--text-3)]">
      <div className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} /> {label}</div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card-elevated grain-overlay p-10 text-center">
      <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</div>
      {description && <div className="text-sm text-[color:var(--text-3)] mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="px-6 lg:px-8 py-5 border-b border-[color:var(--stroke)] flex items-start gap-4 justify-between flex-wrap">
      <div className="min-w-0">
        {breadcrumbs && <div className="text-[11px] text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{breadcrumbs}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text-1)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        {subtitle && <div className="text-sm text-[color:var(--text-3)] mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
