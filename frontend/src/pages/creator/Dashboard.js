import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { Plus, FileText, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CreatorDashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get('/ad-sets')).data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => filter === 'all' ? true : filter === 'script' ? i.type === 'script' : i.type === 'media_ready');

  return (
    <div>
      <PageHeader
        title="My Ad Sets"
        subtitle="Create and manage your marketing ad sets."
        actions={
          <button data-testid="creator-create-adset-button" onClick={() => nav('/creator/new')} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
            <Plus size={14} /> New Ad Set
          </button>
        }
      />
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-4">
          {[
            { v: 'all', label: 'All' },
            { v: 'script', label: 'Script only' },
            { v: 'media', label: 'Media ready' },
          ].map((f) => (
            <button
              key={f.v}
              data-testid={`creator-filter-${f.v}`}
              onClick={() => setFilter(f.v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.v ? 'bg-[color:var(--brand-teal)]/20 border-[color:var(--brand-teal)]/40 text-[color:#6EF3E6]' : 'border-[color:var(--stroke)] text-[color:var(--text-2)] hover:bg-white/5'
              }`}
            >{f.label}</button>
          ))}
        </div>
        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState title="No ad sets yet" description="Kick off your first ad set to route it through the studio." action={<button onClick={() => nav('/creator/new')} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2"><Plus size={14} /> New Ad Set</button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <button
                key={s.id}
                data-testid={`creator-adset-card-${s.id}`}
                onClick={() => nav(`/ad-sets/${s.id}`)}
                className="text-left card-elevated p-5 hover:border-[color:var(--brand-teal)]/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-lg bg-white/5 grid place-items-center text-[color:var(--brand-teal)]">
                    {s.type === 'media_ready' ? <Zap size={16} /> : <FileText size={16} />}
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <div className="mt-3 font-semibold text-[color:var(--text-1)]" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</div>
                <div className="text-xs text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{s.ad_set_code} · {s.type === 'media_ready' ? 'Media ready' : 'Script'}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-3)]">
                  <span>{s.total_ads || 0} ads</span>
                  <span>{s.updated_at ? formatDistanceToNow(new Date(s.updated_at), { addSuffix: true }) : ''}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
