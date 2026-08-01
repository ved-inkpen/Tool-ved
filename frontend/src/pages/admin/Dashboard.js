import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Building2, Video, CheckCircle2, Clock, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>
        <Icon size={13} style={{ color: accent }} /> {label}
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setRows((await api.get('/analytics/agencies')).data); }
      catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load agency performance'); }
      finally { setLoading(false); }
    })();
  }, []);

  const total = rows.reduce((acc, r) => ({
    assigned: acc.assigned + r.videos_assigned,
    approved: acc.approved + r.videos_approved,
    pending: acc.pending + r.pending_review,
  }), { assigned: 0, approved: 0, pending: 0 });

  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        subtitle="Workload and delivery across every agency."
        breadcrumbs="Administration"
      />
      <div className="p-6 lg:p-8 space-y-6">
        {loading ? <PageLoader /> : rows.length === 0 ? (
          <EmptyState title="No agencies yet" description="Create an agency to start tracking its output." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat icon={Building2} label="Agencies" value={rows.length} accent="var(--brand-teal)" />
              <Stat icon={Video} label="Videos assigned" value={total.assigned} accent="#B7FFF7" />
              <Stat icon={CheckCircle2} label="Videos approved" value={total.approved} accent="#D7FF9A" />
              <Stat icon={Clock} label="Pending review" value={total.pending} accent="#FFD08A" />
            </div>

            <div className="card-elevated overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]" data-testid="agency-performance-table">
                <thead>
                  <tr className="text-left border-b border-[color:var(--stroke)]">
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal" style={{ fontFamily: 'var(--font-mono)' }}>Agency</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal text-right" style={{ fontFamily: 'var(--font-mono)' }}>Videos assigned</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal text-right" style={{ fontFamily: 'var(--font-mono)' }}>Videos approved</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal text-right" style={{ fontFamily: 'var(--font-mono)' }}>Pending review</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal text-right" style={{ fontFamily: 'var(--font-mono)' }}>Approval rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--stroke)]">
                  {rows.map((r) => (
                    <tr key={r.agency_id} data-testid={`agency-perf-row-${r.agency_id}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.agency_name}</div>
                        <div className="text-[11px] text-[color:var(--text-3)] inline-flex items-center gap-1 mt-0.5">
                          <UsersRound size={10} /> {r.editors} editor{r.editors === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" data-testid={`agency-perf-assigned-${r.agency_id}`}>{r.videos_assigned}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:#D7FF9A]" data-testid={`agency-perf-approved-${r.agency_id}`}>{r.videos_approved}</td>
                      <td className="px-4 py-3 text-right" data-testid={`agency-perf-pending-${r.agency_id}`}>
                        <div className="tabular-nums text-[color:#FFD08A]">{r.pending_review}</div>
                        {r.pending_review > 0 && (
                          <div className="text-[10px] text-[color:var(--text-3)]">
                            {r.in_production} in production · {r.awaiting_final_review} awaiting final
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.approval_rate === null ? (
                          <span className="text-[color:var(--text-3)]">—</span>
                        ) : (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-[color:#D7FF9A]" style={{ width: `${r.approval_rate}%` }} />
                            </div>
                            <span className="tabular-nums w-9 text-right">{r.approval_rate}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-[color:var(--text-3)]">
              A video counts as assigned once its ad set has been routed to the agency and the script approved.
              Pending review is everything assigned that is not yet approved.
              <button onClick={() => nav('/admin/agencies')} className="ml-2 text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)]">Manage agencies</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
