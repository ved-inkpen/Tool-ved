import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { fileUrl } from '@/lib/api';
import { PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function FinalReviewQueue() {
  const nav = useNavigate();
  const [data, setData] = useState({ ads: [], ad_sets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/final-review')).data); } finally { setLoading(false); }
  })(); }, []);

  return (
    <div>
      <PageHeader title="Final review queue" subtitle="Approve or reject completed ads. Rejected ads return to the editor with your notes." />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : data.ads.length === 0 ? (
          <EmptyState title="Queue is clear" description="No ads waiting for final review right now." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.ads.map(a => {
              const set = data.ad_sets.find(s => s.id === a.ad_set_id);
              const media = a.media_file;
              return (
                <button
                  key={a.id}
                  data-testid={`final-review-ad-${a.id}`}
                  onClick={() => nav(`/final-review/ads/${a.id}`)}
                  className="text-left card-elevated overflow-hidden hover:border-[color:var(--brand-teal)]/40 transition-colors"
                >
                  <div className="relative aspect-video bg-black grid place-items-center">
                    {media?.content_type?.startsWith('video/') ? (
                      <>
                        <video src={fileUrl(media.file_id)} className="w-full h-full object-cover opacity-90" muted />
                        <PlayCircle className="absolute inset-0 m-auto text-white/80" size={38} />
                      </>
                    ) : media?.content_type?.startsWith('image/') ? (
                      <img src={fileUrl(media.file_id)} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-[color:var(--text-3)]">No preview</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{a.name}</div>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code} · {set?.name}</div>
                    <div className="text-[11px] text-[color:var(--text-3)] mt-1">{a.updated_at ? formatDistanceToNow(new Date(a.updated_at), { addSuffix: true }) : ''}</div>
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
