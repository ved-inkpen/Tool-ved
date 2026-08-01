import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Building2, Video, CheckCircle2, Clock, UsersRound, MessageSquare, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

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

/** Questions raised on a video, newest first, with read/unread state. */
function QuestionsPanel({ items, unread, onOpen, onRead, onReadAll, busy }) {
  const [showRead, setShowRead] = useState(false);
  const visible = showRead ? items : items.filter(n => !n.read);

  return (
    <div className="card-elevated" data-testid="admin-questions-panel">
      <div className="px-4 py-3 border-b border-[color:var(--stroke)] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-[color:#FFD08A]" />
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Questions on videos</span>
          {unread > 0 && (
            <span data-testid="admin-questions-badge" className="min-w-[20px] h-5 px-1.5 rounded-full bg-[color:#FFD08A] text-[color:var(--bg-0)] text-[11px] font-bold grid place-items-center tabular-nums">
              {unread}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            data-testid="admin-questions-toggle-read"
            onClick={() => setShowRead(v => !v)}
            className="text-[11px] text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors"
          >
            {showRead ? 'Show unread only' : `Show all (${items.length})`}
          </button>
          {unread > 0 && (
            <button
              data-testid="admin-questions-read-all"
              onClick={onReadAll}
              disabled={busy}
              className="text-[11px] text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-6 text-sm text-[color:var(--text-3)]">
          {items.length === 0
            ? 'No questions raised yet. Reviewers and agencies can flag a comment as a question.'
            : 'All caught up — no unread questions.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left border-b border-[color:var(--stroke)]">
                {['Video', 'Agency', 'Commented by', 'Comment', 'When', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-3)] font-normal" style={{ fontFamily: 'var(--font-mono)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--stroke)]">
              {visible.map(n => (
                <tr
                  key={n.id}
                  data-testid={`admin-question-row-${n.id}`}
                  className={`transition-colors ${n.read ? 'opacity-60' : 'bg-[color:#FFD08A]/[0.04]'} hover:bg-white/[0.03]`}
                >
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(n)} className="text-left hover:text-[color:var(--brand-teal)] transition-colors">
                      <div className="font-medium">{n.ad_name || '—'}</div>
                      <div className="text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{n.ad_code || n.ad_id}</div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--text-2)]">{n.agency_name || <span className="text-[color:var(--text-3)]">—</span>}</td>
                  <td className="px-4 py-3">
                    <div>{n.author_name || '—'}</div>
                    {n.author_role && <div className="text-[11px] text-[color:var(--text-3)]">{n.author_role.replace(/_/g, ' ')}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-[320px]">
                    <div className="text-[color:var(--text-1)]">{n.preview || n.message}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                    <div>{n.created_at ? format(new Date(n.created_at), 'd MMM yyyy HH:mm') : '—'}</div>
                    <div className="text-[color:var(--text-3)]">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${n.read
                      ? 'bg-white/5 text-[color:var(--text-3)]'
                      : 'bg-[color:#FFD08A]/15 text-[color:#FFD08A]'}`}>
                      {n.read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      data-testid={`admin-question-open-${n.id}`}
                      onClick={() => onOpen(n)}
                      className="h-7 px-2.5 rounded-md border border-[color:var(--stroke)] hover:bg-white/5 text-[11px] inline-flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> View
                    </button>
                    {!n.read && (
                      <button
                        data-testid={`admin-question-read-${n.id}`}
                        onClick={() => onRead(n.id)}
                        disabled={busy}
                        title="Mark as read"
                        className="ml-1 h-7 w-7 rounded-md border border-[color:var(--stroke)] hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] inline-grid place-items-center disabled:opacity-50"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [qUnread, setQUnread] = useState(0);
  const [qBusy, setQBusy] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?kind=comment_question');
      setQuestions(data.notifications || []);
      setQUnread(data.unread || 0);
    } catch (e) { /* the performance table still stands on its own */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setRows((await api.get('/analytics/agencies')).data); }
      catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load agency performance'); }
      finally { setLoading(false); }
    })();
    loadQuestions();
  }, [loadQuestions]);

  const markRead = async (id) => {
    setQBusy(true);
    try { await api.post(`/notifications/${id}/read`); await loadQuestions(); }
    catch (e) { toast.error('Could not mark as read'); } finally { setQBusy(false); }
  };

  /** Opening a question is "viewing" it, so it stops being unread. */
  const openQuestion = async (n) => {
    if (!n.read) { try { await api.post(`/notifications/${n.id}/read`); } catch (e) { /* still navigate */ } }
    nav(n.ad_id && n.ad_set_id ? `/ad-sets/${n.ad_set_id}?ad=${n.ad_id}` : n.link);
  };

  const markAllRead = async () => {
    setQBusy(true);
    try {
      await Promise.all(questions.filter(n => !n.read).map(n => api.post(`/notifications/${n.id}/read`)));
      await loadQuestions();
    } catch (e) { toast.error('Could not mark all as read'); } finally { setQBusy(false); }
  };

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

            <QuestionsPanel
              items={questions}
              unread={qUnread}
              onOpen={openQuestion}
              onRead={markRead}
              onReadAll={markAllRead}
              busy={qBusy}
            />

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
