import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { UserPlus, Trash2, Loader2, Video, Power, KeyRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const blankEditor = () => ({ name: '', email: '', password: '' });

export default function AgencyEditors() {
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankEditor());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pwFor, setPwFor] = useState(null);
  const [newPw, setNewPw] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEditors((await api.get('/agency/editors?include_inactive=true')).data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load editors');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addEditor = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      await api.post('/agency/editors', form);
      toast.success(`${form.name} added to your agency`);
      setAddOpen(false); setForm(blankEditor());
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to add editor'); } finally { setBusy(false); }
  };

  const removeEditor = async () => {
    setBusy(true);
    try {
      const { data } = await api.delete(`/agency/editors/${confirmDelete.id}`);
      toast.success(data.removed === 'deleted'
        ? `${confirmDelete.name} removed`
        : `${confirmDelete.name} deactivated (past work kept)`);
      setConfirmDelete(null);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to remove editor'); } finally { setBusy(false); }
  };

  const toggleActive = async (e2) => {
    setBusy(true);
    try {
      await api.patch(`/agency/editors/${e2.id}`, { active: !e2.active });
      toast.success(e2.active ? `${e2.name} deactivated` : `${e2.name} reactivated`);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      await api.patch(`/agency/editors/${pwFor.id}`, { password: newPw });
      toast.success(`Password updated for ${pwFor.name}`);
      setPwFor(null); setNewPw('');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="My editors"
        subtitle="Video editors in your agency. Only your agency can see and manage them."
        breadcrumbs="Agency"
        actions={
          <button
            data-testid="agency-add-editor-button"
            onClick={() => { setForm(blankEditor()); setAddOpen(true); }}
            className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors"
          >
            <UserPlus size={14} /> Add editor
          </button>
        }
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : editors.length === 0 ? (
          <EmptyState
            title="No editors yet"
            description="Add a video editor so you can assign ads to them."
            action={
              <button data-testid="agency-add-editor-empty" onClick={() => { setForm(blankEditor()); setAddOpen(true); }} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2">
                <UserPlus size={14} /> Add editor
              </button>
            }
          />
        ) : (
          <div className="card-elevated divide-y divide-[color:var(--stroke)] max-w-3xl">
            {editors.map((e) => (
              <div key={e.id} data-testid={`agency-editor-row-${e.id}`} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[color:var(--brand-teal)]/15 grid place-items-center text-[color:var(--brand-teal)]">
                  <Video size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {e.name}
                    {!e.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[color:var(--text-3)] uppercase tracking-wide">Inactive</span>}
                  </div>
                  <div className="text-[11px] text-[color:var(--text-3)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>{e.email}</div>
                </div>
                <div className="text-[11px] text-[color:var(--text-3)] text-right shrink-0">
                  <div className="tabular-nums">{e.in_flight_ads} in production</div>
                  <div className="tabular-nums">{e.total_ads} total · joined {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : '—'}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button data-testid={`agency-editor-password-${e.id}`} onClick={() => { setPwFor(e); setNewPw(''); }} title="Set a new password" className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors"><KeyRound size={14} /></button>
                  <button data-testid={`agency-editor-toggle-${e.id}`} onClick={() => toggleActive(e)} disabled={busy} title={e.active ? 'Deactivate' : 'Reactivate'} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors"><Power size={14} /></button>
                  <button data-testid={`agency-editor-delete-${e.id}`} onClick={() => setConfirmDelete(e)} title="Remove from agency" className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Add a video editor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Full name</label>
              <input data-testid="agency-editor-name" value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="e.g., Priya Sharma" />
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Email</label>
              <input data-testid="agency-editor-email" type="email" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="editor@agency.com" />
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Temporary password</label>
              <input data-testid="agency-editor-password" value={form.password} onChange={(ev) => setForm({ ...form, password: ev.target.value })} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="At least 6 characters" />
              <div className="text-[11px] text-[color:var(--text-3)] mt-1">They can change it after signing in.</div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setAddOpen(false)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button data-testid="agency-editor-add-confirm" onClick={addEditor} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />} Add editor
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Remove {confirmDelete?.name}?</DialogTitle></DialogHeader>
          <div className="text-sm text-[color:var(--text-2)]">
            {confirmDelete?.in_flight_ads > 0 ? (
              <span className="text-[color:#FFB4B4]">
                They still have {confirmDelete.in_flight_ads} ad(s) in production. Reassign those to another editor first.
              </span>
            ) : confirmDelete?.total_ads > 0 ? (
              <>They have finished work on record, so the account is deactivated rather than deleted — past ads keep their name.</>
            ) : (
              <>They have no work on record, so the account is deleted outright.</>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setConfirmDelete(null)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button
              data-testid="agency-editor-delete-confirm"
              onClick={removeEditor}
              disabled={busy || confirmDelete?.in_flight_ads > 0}
              className="h-9 px-4 rounded-lg text-sm text-[color:#FFB4B4] bg-[color:rgba(248,113,113,0.14)] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)] inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog open={!!pwFor} onOpenChange={(o) => { if (!o) setPwFor(null); }}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>New password for {pwFor?.name}</DialogTitle></DialogHeader>
          <input data-testid="agency-editor-newpw" value={newPw} onChange={(ev) => setNewPw(ev.target.value)} className="w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="At least 6 characters" />
          <DialogFooter>
            <button onClick={() => setPwFor(null)} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button data-testid="agency-editor-newpw-confirm" onClick={resetPassword} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />} Update
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
