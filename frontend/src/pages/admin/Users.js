import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Plus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

const ROLES = [
  { value: 'creator', label: 'Creator' },
  { value: 'script_reviewer', label: 'Script Reviewer' },
  { value: 'ad_poster', label: 'Ad Poster' },
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'video_editor', label: 'Video Editor' },
  { value: 'final_reviewer', label: 'Final Reviewer' },
  { value: 'admin', label: 'Admin' },
];

function UserFormDialog({ open, onOpenChange, agencies, onSaved }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'creator', agency_id: '', password: '' });
  const [busy, setBusy] = useState(false);
  const needsAgency = ['agency_admin', 'video_editor'].includes(form.role);

  const submit = async () => {
    if (!form.email || !form.name || !form.password) { toast.error('Email, name, and password are required'); return; }
    if (needsAgency && !form.agency_id) { toast.error('Agency is required for this role'); return; }
    setBusy(true);
    try {
      const body = { ...form };
      if (!needsAgency) delete body.agency_id;
      await api.post('/admin/users', body);
      toast.success('User invited');
      onSaved && onSaved();
      onOpenChange(false);
      setForm({ email: '', name: '', role: 'creator', agency_id: '', password: '' });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create user');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
        <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Invite user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <input data-testid="user-form-name" placeholder="Full name" className="w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input data-testid="user-form-email" placeholder="email@company.com" type="email" className="w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input data-testid="user-form-password" placeholder="Initial password (min 6)" type="text" className="w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger data-testid="user-form-role" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {needsAgency && (
            <Select value={form.agency_id} onValueChange={(v) => setForm({ ...form, agency_id: v })}>
              <SelectTrigger data-testid="user-form-agency" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)]"><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <button data-testid="user-form-submit" onClick={submit} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm flex items-center gap-2">
            {busy && <Loader2 className="animate-spin" size={14} />} Invite
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([api.get('/admin/users'), api.get('/admin/agencies')]);
      setUsers(u.data);
      setAgencies(a.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}`, { active: !u.active });
      toast.success(u.active ? 'User deactivated' : 'User activated');
      load();
    } catch (e) { toast.error('Failed'); }
  };

  const roleLabel = (r) => ROLES.find(x => x.value === r)?.label || r;
  const agencyName = (id) => agencies.find(a => a.id === id)?.name || '—';

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Invite team members, assign roles, and manage agency access."
        actions={
          <button data-testid="admin-users-create-button" onClick={() => setDialogOpen(true)} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
            <Plus size={14} /> Invite user
          </button>
        }
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : (
          users.length === 0 ? (
            <EmptyState title="No users yet" description="Invite your first teammate to get started." />
          ) : (
            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[color:var(--text-3)] border-b border-[color:var(--stroke)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Agency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="queue-row border-b border-[color:var(--stroke)]/70 last:border-0">
                      <td className="px-4 py-3 text-[color:var(--text-1)]">{u.name}</td>
                      <td className="px-4 py-3 text-[color:var(--text-2)]" style={{ fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                      <td className="px-4 py-3">{roleLabel(u.role)}</td>
                      <td className="px-4 py-3 text-[color:var(--text-2)]">{u.agency_id ? agencyName(u.agency_id) : '—'}</td>
                      <td className="px-4 py-3">
                        {u.active ? <span className="text-[color:#D7FF9A]">Active</span> : <span className="text-[color:var(--text-3)]">Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button data-testid={`user-toggle-${u.id}`} onClick={() => toggleActive(u)} className="text-xs px-3 py-1.5 rounded-md hover:bg-white/5 text-[color:var(--text-2)] hover:text-white transition-colors">
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} agencies={agencies} onSaved={load} />
    </div>
  );
}
