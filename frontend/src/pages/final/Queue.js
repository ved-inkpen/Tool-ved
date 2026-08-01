import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { Search, X, Clock, CheckCircle2, AlertCircle, Eye, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const pending = (s) => s.ad_counts?.pending_final_review || 0;
const approved = (s) => s.ad_counts?.approved || 0;
const rejected = (s) => s.ad_counts?.final_rejected || 0;
/** Ads the final reviewer has any business with — anything that reached this stage. */
const relevant = (s) => pending(s) + approved(s) + rejected(s) > 0;

export default function FinalReviewQueue() {
  const nav = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/ad-sets');
        setSets((data || []).filter(relevant));
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = sets.filter(s => !needle
      || `${s.name} ${s.ad_set_code} ${s.created_by_name || ''}`.toLowerCase().includes(needle));
    // sets with work waiting come first, then the busiest, then most recent
    return [...out].sort((a, b) =>
      (pending(b) > 0) - (pending(a) > 0)
      || pending(b) - pending(a)
      || new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  }, [sets, q]);

  const totalPending = sets.reduce((n, s) => n + pending(s), 0);

  return (
    <div>
      <PageHeader
        title="Final review"
        subtitle={loading ? 'Approve or reject finished ads, ad set by ad set.'
          : totalPending > 0
            ? `${totalPending} ad${totalPending === 1 ? '' : 's'} waiting across ${sets.filter(s => pending(s) > 0).length} ad set${sets.filter(s => pending(s) > 0).length === 1 ? '' : 's'}`
            : 'Nothing waiting — browse finished ad sets below.'}
      />
      <div className="p-6 lg:p-8 space-y-5">
        {sets.length > 0 && (
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)]" />
            <input
              data-testid="final-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or creator…"
              className="h-9 w-full rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] pl-9 pr-8 text-sm"
            />
            {q && (
              <button data-testid="final-search-clear" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] hover:text-[color:var(--text-1)]">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {loading ? <PageLoader /> : sets.length === 0 ? (
          <EmptyState title="Nothing has reached final review" description="Ads appear here once an editor submits their cut, or a media-ready set is sent in." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description={`No ad set matches “${q}”.`}
            action={<button data-testid="final-reset" onClick={() => setQ('')} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm">Clear search</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const p = pending(s);
              return (
                <button
                  key={s.id}
                  data-testid={`final-adset-card-${s.id}`}
                  onClick={() => nav(`/final-review/sets/${s.id}`)}
                  className={`text-left card-elevated p-5 transition-colors flex flex-col ${p > 0 ? 'hover:border-[color:var(--brand-teal)]/50' : 'hover:border-[color:var(--stroke)] opacity-90'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</div>
                      <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                        {s.ad_set_code}{s.created_by_name ? ` · by ${s.created_by_name}` : ''}
                      </div>
                    </div>
                    <StatusPill status={s.status} />
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-[11px] flex-wrap">
                    {p > 0 && <span className="inline-flex items-center gap-1 text-[color:#FFD08A]"><Clock size={11} /> {p} pending</span>}
                    {approved(s) > 0 && <span className="inline-flex items-center gap-1 text-[color:#D7FF9A]"><CheckCircle2 size={11} /> {approved(s)} approved</span>}
                    {rejected(s) > 0 && <span className="inline-flex items-center gap-1 text-[color:#FFB4B4]"><AlertCircle size={11} /> {rejected(s)} rejected</span>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[color:var(--stroke)] flex items-center justify-between gap-2">
                    <div className="text-[11px] text-[color:var(--text-3)]">
                      <div>Created {s.created_at ? format(new Date(s.created_at), 'd MMM yyyy') : '—'}</div>
                      <div>{s.updated_at ? formatDistanceToNow(new Date(s.updated_at), { addSuffix: true }) : ''}</div>
                    </div>
                    <div className={`h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5 shrink-0 ${p > 0 ? 'bg-[color:var(--brand-teal)] text-white' : 'border border-[color:var(--stroke)] text-[color:var(--text-2)]'}`}>
                      {p > 0 ? <><Eye size={12} /> Review</> : <><FileText size={12} /> View</>}
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
