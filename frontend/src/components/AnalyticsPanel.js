import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Clock, RefreshCw, CheckCircle2, XCircle, Timer } from 'lucide-react';

function Metric({ label, value, sub, icon: Icon, accent = '#C7D2E0' }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
        <Icon size={14} className="opacity-70" style={{ color: accent }} />
      </div>
      <div className="mt-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-[color:var(--text-3)] mt-1">{sub}</div>}
    </div>
  );
}

const STAGE_COLORS = {
  draft: '#8FA1B3',
  pending_script_review: '#7DEBFF',
  script_rejected: '#FFB4B4',
  assigned_agency: '#6EF3E6',
  assigned_editor: '#B7FFF7',
  pending_final_review: '#FFD08A',
  final_rejected: '#FFB4B4',
  approved: '#D7FF9A',
};

const STAGE_LABEL = {
  draft: 'Draft',
  pending_script_review: 'In script review',
  script_rejected: 'Script rejected',
  assigned_agency: 'With agency',
  assigned_editor: 'With editor',
  pending_final_review: 'In final review',
  final_rejected: 'Final rejected',
  approved: 'Approved',
};

function StageBar({ totals }) {
  const stages = Object.entries(totals || {}).filter(([, v]) => (v?.seconds || 0) > 0);
  const total = stages.reduce((s, [, v]) => s + (v.seconds || 0), 0) || 1;
  return (
    <div className="card-elevated p-4">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Time distribution across stages</div>
      {stages.length === 0 ? (
        <div className="text-xs text-[color:var(--text-3)]">Not enough data yet.</div>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[color:var(--bg-2)] border border-[color:var(--stroke)]">
            {stages.map(([k, v]) => (
              <div key={k} title={`${STAGE_LABEL[k] || k}: ${v.human}`} style={{ width: `${(v.seconds / total) * 100}%`, background: STAGE_COLORS[k] || '#8FA1B3' }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stages.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[11px] text-[color:var(--text-2)]">
                <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[k] || '#8FA1B3' }} />
                <span className="flex-1 truncate">{STAGE_LABEL[k] || k}</span>
                <span className="text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{v.human}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsPanel({ adSetId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setLoading(true);
    try { setData((await api.get(`/analytics/ad-sets/${adSetId}`)).data); } catch (e) { setData(null); } finally { setLoading(false); }
  })(); }, [adSetId]);

  if (loading) return <div className="text-xs text-[color:var(--text-3)] py-4 text-center">Loading analytics…</div>;
  if (!data) return null;
  const s = data.summary || {};
  return (
    <div data-testid="analytics-panel" className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-[color:var(--brand-teal)]" />
        <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Ad set analytics</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total elapsed" value={s.total_human || '—'} icon={Clock} accent="#C7D2E0" />
        <Metric label="Approved" value={`${s.approved_count || 0} / ${s.total_ads || 0}`} icon={CheckCircle2} accent="#D7FF9A" />
        <Metric label="Script review response" value={s.avg_script_review_response_human || '—'} sub="Avg from submit to decision" icon={Timer} accent="#7DEBFF" />
        <Metric label="Final review response" value={s.avg_final_review_response_human || '—'} sub="Avg from upload to decision" icon={Timer} accent="#FFD08A" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Metric label="Script rejections" value={s.rejected_scripts || 0} icon={XCircle} accent={s.rejected_scripts ? '#FFB4B4' : '#8FA1B3'} />
        <Metric label="Final rejections" value={s.rejected_final || 0} icon={XCircle} accent={s.rejected_final ? '#FFB4B4' : '#8FA1B3'} />
        <Metric label="Total revisions" value={(data.per_ad || []).reduce((s, a) => s + (a.rejections || 0), 0)} icon={RefreshCw} accent="#B7FFF7" />
      </div>
      <StageBar totals={s.stage_totals || {}} />
      {data.per_ad && data.per_ad.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="px-4 py-3 border-b border-[color:var(--stroke)] text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>Per-ad timing</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-[color:var(--text-3)] border-b border-[color:var(--stroke)]" style={{ fontFamily: 'var(--font-mono)' }}>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Script resp.</th>
                <th className="px-3 py-2">Final resp.</th>
                <th className="px-3 py-2 text-right">Revisions</th>
              </tr>
            </thead>
            <tbody>
              {data.per_ad.map(a => (
                <tr key={a.ad_id} className="border-b border-[color:var(--stroke)]/60 last:border-0">
                  <td className="px-3 py-2"><div className="text-[color:var(--text-1)] font-medium">{a.name}</div><div className="text-[10px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div></td>
                  <td className="px-3 py-2 tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{a.total_human}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{a.script_response_human || '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{a.final_response_human || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{a.rejections}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
