import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EditorDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/editor')).data); } finally { setLoading(false); }
  })(); }, []);

  const groupedByStatus = {
    to_do: data.ads.filter(a => ['assigned_editor', 'final_rejected'].includes(a.status)),
    in_review: data.ads.filter(a => a.status === 'pending_final_review'),
    approved: data.ads.filter(a => a.status === 'approved'),
  };

  const Column = ({ title, items, testId, empty }) => (
    <div className="card-elevated flex flex-col min-h-[300px]">
      <div className="px-4 py-3 border-b border-[color:var(--stroke)] flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</div>
        <div className="text-xs text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{items.length}</div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {items.length === 0 && <div className="text-xs text-[color:var(--text-3)] px-2 py-4 text-center">{empty}</div>}
        {items.map(a => (
          <button
            key={a.id}
            data-testid={`${testId}-ad-${a.id}`}
            onClick={() => nav(`/editor/ads/${a.id}`)}
            className="w-full text-left rounded-lg border border-[color:var(--stroke)] p-3 hover:bg-white/[0.03] hover:border-[color:var(--brand-teal)]/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate">{a.name}</div>
              <StatusPill status={a.status} />
            </div>
            <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
            {a.latest_review_comment && (a.status === 'final_rejected') && (
              <div className="text-[11px] text-[color:#FFB4B4] mt-1 line-clamp-2">{a.latest_review_comment}</div>
            )}
            <div className="text-[11px] text-[color:var(--text-3)] mt-1">{a.updated_at ? formatDistanceToNow(new Date(a.updated_at), { addSuffix: true }) : ''}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="My assigned ads" subtitle="Produce, upload, and iterate on your assigned ads." />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="Nothing assigned to you yet" description="Your agency admin will assign ads to you here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Column title="To do" items={groupedByStatus.to_do} testId="editor-todo" empty="No ads to produce right now." />
            <Column title="In review" items={groupedByStatus.in_review} testId="editor-inreview" empty="No submissions in review." />
            <Column title="Approved" items={groupedByStatus.approved} testId="editor-approved" empty="No approvals yet." />
          </div>
        )}
      </div>
    </div>
  );
}
