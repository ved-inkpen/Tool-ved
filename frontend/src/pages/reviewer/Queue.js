import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, X, Clock, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

const pending = (s) => s.ad_counts?.pending_script_review || 0;
const sentBack = (s) => s.ad_counts?.script_rejected || 0;
// A script the reviewer passed leaves script review entirely — 'approved' is the
// FINAL reviewer's status, so count everything downstream of this stage instead.
const PAST_SCRIPT_REVIEW = ['assigned_agency', 'assigned_editor', 'pending_final_review', 'final_rejected', 'approved'];
const approved = (s) => PAST_SCRIPT_REVIEW.reduce((n, k) => n + (s.ad_counts?.[k] || 0), 0);

const TABS = [
  { v: 'to_review', label: 'To review', match: (s) => pending(s) > 0 },
  { v: 'sent_back', label: 'Sent back', match: (s) => sentBack(s) > 0 },
  { v: 'in_progress', label: 'In production', match: (s) => s.status === 'in_progress' },
  { v: 'completed', label: 'Completed', match: (s) => s.status === 'completed' },
  { v: 'all', label: 'All' },
];

const SORTS = [
  { v: 'recent', label: 'Recently updated' },
  { v: 'oldest', label: 'Oldest first' },
  { v: 'name', label: 'Name A–Z' },
];

export default function ScriptReviewQueue() {
  const nav = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('to_review');
  const [sort, setSort] = useState('recent');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // every script ad set, not just the pending ones, so past reviews stay reachable
        const { data } = await api.get('/ad-sets');
        setSets((data || []).filter(s => s.type === 'script'));
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const active = TABS.find(t => t.v === tab);
    const out = sets.filter(s => {
      if (active?.match && !active.match(s)) return false;
      if (needle && !(`${s.name} ${s.ad_set_code} ${s.created_by_name || ''}`.toLowerCase().includes(needle))) return false;
      return true;
    });
    const by = {
      recent: (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
      oldest: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
    }[sort];
    return [...out].sort(by);
  }, [sets, tab, sort, q]);

  const countFor = (t) => sets.filter(s => !t.match || t.match(s)).length;
  const totalPending = sets.reduce((n, s) => n + pending(s), 0);

  return (
    <div>
      <PageHeader
        title="Script review"
        subtitle={loading ? 'Approve scripts or send them back with clear feedback.'
          : totalPending > 0
            ? `${totalPending} script${totalPending === 1 ? '' : 's'} waiting across ${countFor(TABS[0])} ad set${countFor(TABS[0]) === 1 ? '' : 's'}`
            : 'Nothing waiting — browse past reviews below.'}
      />
      <div className="p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)]" />
            <input
              data-testid="reviewer-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or creator…"
              className="h-9 w-72 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] pl-9 pr-8 text-sm"
            />
            {q && (
              <button data-testid="reviewer-search-clear" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] hover:text-[color:var(--text-1)]">
                <X size={13} />
              </button>
            )}
          </div>
          <select
            data-testid="reviewer-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm text-[color:var(--text-1)]"
          >
            {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap border-b border-[color:var(--stroke)] pb-3">
          {TABS.map(t => (
            <button
              key={t.v}
              data-testid={`reviewer-tab-${t.v}`}
              onClick={() => setTab(t.v)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 ${tab === t.v ? 'bg-white/[0.07] text-[color:var(--text-1)]' : 'text-[color:var(--text-3)] hover:bg-white/[0.04]'}`}
            >
              {t.label}
              <span className="tabular-nums text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{countFor(t)}</span>
            </button>
          ))}
        </div>

        {loading ? <PageLoader /> : sets.length === 0 ? (
          <EmptyState title="No script ad sets yet" description="Submissions will appear here as creators send them in." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === 'to_review' && !q ? "You're all caught up" : 'Nothing matches'}
            description={tab === 'to_review' && !q
              ? 'No scripts are waiting. Switch to All to revisit past reviews.'
              : 'No ad set matches these filters.'}
            action={
              <button data-testid="reviewer-reset-filters" onClick={() => { setQ(''); setTab('all'); }} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm">
                {tab === 'to_review' && !q ? 'Browse all' : 'Clear filters'}
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const p = pending(s);
              return (
                <button
                  key={s.id}
                  data-testid={`script-review-adset-${s.id}`}
                  onClick={() => nav(`/script-review/${s.id}`)}
                  className="w-full text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</div>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="text-xs text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      {s.ad_set_code} · {s.total_ads || 0} ads{s.created_by_name ? ` · by ${s.created_by_name}` : ''}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] flex-wrap">
                      {p > 0 && <span className="inline-flex items-center gap-1 text-[color:#7DEBFF]"><Clock size={11} /> {p} awaiting review</span>}
                      {sentBack(s) > 0 && <span className="inline-flex items-center gap-1 text-[color:#FFB4B4]"><AlertCircle size={11} /> {sentBack(s)} sent back</span>}
                      {approved(s) > 0 && <span className="inline-flex items-center gap-1 text-[color:#D7FF9A]"><CheckCircle2 size={11} /> {approved(s)} approved</span>}
                      {p === 0 && sentBack(s) === 0 && approved(s) === 0 && (
                        <span className="text-[color:var(--text-3)]">No decisions yet</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px] text-[color:var(--text-3)]">
                      <div>Created {s.created_at ? format(new Date(s.created_at), 'd MMM yyyy') : '—'}</div>
                      <div>{s.updated_at ? formatDistanceToNow(new Date(s.updated_at), { addSuffix: true }) : ''}</div>
                    </div>
                    <div className={`h-9 px-4 rounded-lg text-sm inline-flex items-center gap-2 transition-colors ${p > 0 ? 'bg-[color:var(--brand-teal)] text-white' : 'border border-[color:var(--stroke)]'}`}>
                      {p > 0 ? <><Search size={14} /> Review</> : <><FileText size={14} /> View</>}
                    </div>
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
