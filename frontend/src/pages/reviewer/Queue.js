import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';

export default function ScriptReviewQueue() {
  const nav = useNavigate();
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/script-review')).data); } finally { setLoading(false); }
  })(); }, []);

  // Group ads by ad_set_id
  const groups = data.ad_sets.map(s => ({ set: s, ads: data.ads.filter(a => a.ad_set_id === s.id) }));

  return (
    <div>
      <PageHeader title="Script review queue" subtitle="Approve and assign scripts to agencies, or reject with clear feedback." />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : groups.length === 0 ? (
          <EmptyState title="No pending scripts" description="You're all caught up. New submissions will appear here." />
        ) : (
          <div className="space-y-3">
            {groups.map(({ set, ads }) => (
              <button
                key={set.id}
                data-testid={`script-review-adset-${set.id}`}
                onClick={() => nav(`/script-review/${set.id}`)}
                className="w-full text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{set.name}</div>
                    <StatusPill status={set.status} />
                  </div>
                  <div className="text-xs text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{set.ad_set_code} · {ads.length} ads pending</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-[color:var(--text-3)]">{set.updated_at ? formatDistanceToNow(new Date(set.updated_at), { addSuffix: true }) : ''}</div>
                  <div className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm inline-flex items-center gap-2 transition-colors"><Search size={14} /> Review</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
