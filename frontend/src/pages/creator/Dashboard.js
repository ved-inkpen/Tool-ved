import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { Plus, FileText, Zap, Search, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_TABS = [
  { v: 'all', label: 'All' },
  { v: 'draft', label: 'Drafts', match: (s) => s.status === 'draft' },
  { v: 'in_review', label: 'In review', match: (s) => s.status === 'pending_script_review' },
  { v: 'in_progress', label: 'In production', match: (s) => s.status === 'in_progress' },
  { v: 'completed', label: 'Completed', match: (s) => s.status === 'completed' },
];

const TYPE_TABS = [
  { v: 'all', label: 'All types' },
  { v: 'script', label: 'Script only' },
  { v: 'media', label: 'Media ready' },
];

const SORTS = [
  { v: 'recent', label: 'Recently updated' },
  { v: 'oldest', label: 'Oldest first' },
  { v: 'name', label: 'Name A–Z' },
];

/** Ads sent back to the creator — the only ones they must act on. */
const rejectedCount = (s) => (s.ad_counts?.script_rejected || 0);
const approvedCount = (s) => (s.ad_counts?.approved || 0);

export default function CreatorDashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setItems((await api.get('/ad-sets')).data); } finally { setLoading(false); }
    })();
  }, []);

  const needsAttention = useMemo(() => items.filter(s => rejectedCount(s) > 0), [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const statusTab = STATUS_TABS.find(t => t.v === status);
    const out = items.filter(s => {
      if (type === 'script' && s.type !== 'script') return false;
      if (type === 'media' && s.type !== 'media_ready') return false;
      if (statusTab?.match && !statusTab.match(s)) return false;
      if (needle && !(`${s.name} ${s.ad_set_code}`.toLowerCase().includes(needle))) return false;
      return true;
    });
    const by = {
      recent: (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
      oldest: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
    }[sort];
    return [...out].sort(by);
  }, [items, type, status, sort, q]);

  const countFor = (tab) => items.filter(s => !tab.match || tab.match(s)).length;

  return (
    <div>
      <PageHeader
        title="My Ad Sets"
        subtitle={loading ? 'Create and manage your marketing ad sets.'
          : `${items.length} ad set${items.length === 1 ? '' : 's'} · ${items.reduce((n, s) => n + (s.total_ads || 0), 0)} ads`}
        actions={
          <button data-testid="creator-create-adset-button" onClick={() => nav('/creator/new')} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
            <Plus size={14} /> New Ad Set
          </button>
        }
      />
      <div className="p-6 lg:p-8 space-y-5">
        {!loading && needsAttention.length > 0 && (
          <div data-testid="creator-needs-attention" className="card-elevated p-4 border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.06)]">
            <div className="text-xs text-[color:#FFB4B4] font-semibold flex items-center gap-1.5">
              <AlertCircle size={13} /> Needs your attention
            </div>
            <div className="text-sm text-[color:var(--text-2)] mt-1">
              {needsAttention.reduce((n, s) => n + rejectedCount(s), 0)} ad(s) were sent back for changes.
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {needsAttention.map(s => (
                <button
                  key={s.id}
                  data-testid={`creator-attention-${s.id}`}
                  onClick={() => nav(`/ad-sets/${s.id}`)}
                  className="h-8 px-3 rounded-lg border border-[color:rgba(248,113,113,0.35)] hover:bg-[color:rgba(248,113,113,0.12)] text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  {s.name} <span className="text-[color:#FFB4B4] tabular-nums">{rejectedCount(s)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)]" />
            <input
              data-testid="creator-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or code…"
              className="h-9 w-64 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] pl-9 pr-8 text-sm"
            />
            {q && (
              <button data-testid="creator-search-clear" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] hover:text-[color:var(--text-1)]">
                <X size={13} />
              </button>
            )}
          </div>
          <select
            data-testid="creator-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm text-[color:var(--text-1)]"
          >
            {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-2 ml-auto">
            {TYPE_TABS.map(f => (
              <button
                key={f.v}
                data-testid={`creator-filter-${f.v}`}
                onClick={() => setType(f.v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${type === f.v ? 'bg-[color:var(--brand-teal)]/20 border-[color:var(--brand-teal)]/40 text-[color:#6EF3E6]' : 'border-[color:var(--stroke)] text-[color:var(--text-2)] hover:bg-white/5'}`}
              >{f.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap border-b border-[color:var(--stroke)] pb-3">
          {STATUS_TABS.map(t => (
            <button
              key={t.v}
              data-testid={`creator-status-${t.v}`}
              onClick={() => setStatus(t.v)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 ${status === t.v ? 'bg-white/[0.07] text-[color:var(--text-1)]' : 'text-[color:var(--text-3)] hover:bg-white/[0.04]'}`}
            >
              {t.label}
              <span className="tabular-nums text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{countFor(t)}</span>
            </button>
          ))}
        </div>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState title="No ad sets yet" description="Kick off your first ad set to route it through the studio." action={<button onClick={() => nav('/creator/new')} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2"><Plus size={14} /> New Ad Set</button>} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description={q ? `No ad set matches “${q}” with these filters.` : 'No ad set matches these filters.'}
            action={
              <button data-testid="creator-reset-filters" onClick={() => { setQ(''); setType('all'); setStatus('all'); }} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm">
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const rejected = rejectedCount(s);
              const approved = approvedCount(s);
              const total = s.total_ads || 0;
              return (
                <button
                  key={s.id}
                  data-testid={`creator-adset-card-${s.id}`}
                  onClick={() => nav(`/ad-sets/${s.id}`)}
                  className="text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-white/5 grid place-items-center text-[color:var(--brand-teal)]">
                      {s.type === 'media_ready' ? <Zap size={16} /> : <FileText size={16} />}
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="mt-3 font-semibold text-[color:var(--text-1)]" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</div>
                  <div className="text-xs text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{s.ad_set_code} · {s.type === 'media_ready' ? 'Media ready' : 'Script'}</div>

                  <div className="mt-3 flex items-center gap-3 text-[11px] flex-wrap">
                    <span className="text-[color:var(--text-3)]">{total} ad{total === 1 ? '' : 's'}</span>
                    {approved > 0 && (
                      <span className="inline-flex items-center gap-1 text-[color:#D7FF9A]"><CheckCircle2 size={11} /> {approved} approved</span>
                    )}
                    {rejected > 0 && (
                      <span className="inline-flex items-center gap-1 text-[color:#FFB4B4]"><AlertCircle size={11} /> {rejected} to fix</span>
                    )}
                    {total > approved + rejected && (
                      <span className="inline-flex items-center gap-1 text-[color:var(--text-3)]"><Clock size={11} /> {total - approved - rejected} in flight</span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[color:var(--stroke)] flex items-center justify-between text-[11px] text-[color:var(--text-3)]">
                    <span title={s.created_at ? format(new Date(s.created_at), 'PPpp') : ''}>
                      Created {s.created_at ? format(new Date(s.created_at), 'd MMM yyyy') : '—'}
                    </span>
                    <span>{s.updated_at ? formatDistanceToNow(new Date(s.updated_at), { addSuffix: true }) : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
