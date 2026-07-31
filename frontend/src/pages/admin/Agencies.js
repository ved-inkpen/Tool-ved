import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { Plus, Building2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AdminAgenciesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get('/admin/agencies')).data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setBusy(true);
    try {
      await api.post('/admin/agencies', form);
      toast.success('Agency created');
      setOpen(false);
      setForm({ name: '', description: '' });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this agency?')) return;
    try {
      await api.delete(`/admin/agencies/${id}`);
      toast.success('Agency deleted');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <PageHeader
        title="Agencies"
        subtitle="Create and manage external production agencies."
        actions={
          <button data-testid="admin-agency-create-button" onClick={() => setOpen(true)} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
            <Plus size={14} /> New agency
          </button>
        }
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : (
          items.length === 0 ? <EmptyState title="No agencies yet" description="Create your first production agency." /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((a) => (
                <div key={a.id} className="card-elevated p-5">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-white/5 grid place-items-center text-[color:var(--brand-teal)]"><Building2 size={18} /></div>
                    <button data-testid={`agency-delete-${a.id}`} onClick={() => remove(a.id)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] transition-colors" aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-3 text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{a.name}</div>
                  <div className="text-sm text-[color:var(--text-3)] mt-1">{a.description || '—'}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>New agency</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input data-testid="agency-form-name" placeholder="Agency name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" />
            <textarea data-testid="agency-form-description" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[80px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" />
          </div>
          <DialogFooter>
            <button data-testid="agency-form-submit" onClick={create} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm flex items-center gap-2">
              {busy && <Loader2 className="animate-spin" size={14} />} Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
