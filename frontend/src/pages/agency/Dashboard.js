import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageLoader, EmptyState } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { toast } from 'sonner';
import { Loader2, UsersRound, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AgencyDashboard() {
  const [data, setData] = useState({ ads: [], ad_sets: [], editors: [] });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editorId, setEditorId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData((await api.get('/workflow/queues/agency')).data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const groups = data.ad_sets.map(s => ({ set: s, ads: data.ads.filter(a => a.ad_set_id === s.id) }));

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const assignableSelected = data.ads.filter(a => selectedIds.includes(a.id) && ['assigned_agency', 'assigned_editor'].includes(a.status));

  const assignBulk = async () => {
    if (!editorId) { toast.error('Select an editor'); return; }
    setBusy(true);
    try {
      const res = await api.post('/workflow/agency/assign', { ad_ids: selectedIds, editor_id: editorId });
      toast.success(`Assigned ${res.data.assigned_count} ad(s)`);
      setSelectedIds([]);
      setEditorId('');
      setAssignOpen(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const assignSingle = async (adId, edId) => {
    if (!edId) return;
    try {
      await api.post('/workflow/agency/assign', { ad_ids: [adId], editor_id: edId });
      toast.success('Assigned to editor');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <PageHeader
        title="Agency dashboard"
        subtitle="Distribute ads across your editors and track production."
        actions={
          selectedIds.length > 0 && (
            <button data-testid="agency-bulk-assign-button" onClick={() => setAssignOpen(true)} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
              <Zap size={14} /> Assign selected ({selectedIds.length})
            </button>
          )
        }
      />
      <div className="p-6 lg:p-8">
        {loading ? <PageLoader /> : groups.length === 0 ? (
          <EmptyState title="No ads assigned to your agency" description="Once a reviewer assigns ads, they will appear here." />
        ) : (
          <div className="space-y-6">
            {groups.map(({ set, ads }) => (
              <div key={set.id} className="card-elevated">
                <div className="p-4 border-b border-[color:var(--stroke)] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{set.name}</div>
                      <StatusPill status={set.status} />
                    </div>
                    <div className="text-xs text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{set.ad_set_code}</div>
                  </div>
                  <div className="text-xs text-[color:var(--text-3)] inline-flex items-center gap-1"><UsersRound size={14} /> {data.editors.length} editors</div>
                </div>
                <div className="divide-y divide-[color:var(--stroke)]">
                  {ads.map(a => (
                    <div key={a.id} className="p-4 flex items-center gap-3 flex-wrap queue-row" data-testid={`agency-ad-row-${a.id}`}>
                      <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggleSelect(a.id)} data-testid={`agency-ad-checkbox-${a.id}`} className="h-4 w-4 accent-[color:var(--brand-teal)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <StatusPill status={a.status} />
                        </div>
                        <div className="text-[11px] text-[color:var(--text-3)] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
                      </div>
                      <div className="w-56">
                        <Select value={a.assigned_editor_id || ''} onValueChange={(v) => assignSingle(a.id, v)} disabled={!['assigned_agency', 'assigned_editor'].includes(a.status)}>
                          <SelectTrigger data-testid={`agency-assign-editor-select-${a.id}`} className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] h-9"><SelectValue placeholder="Assign editor" /></SelectTrigger>
                          <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                            {data.editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
          <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Assign {selectedIds.length} ad(s)</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-[color:var(--text-2)]">Editor</label>
            <Select value={editorId} onValueChange={setEditorId}>
              <SelectTrigger data-testid="agency-bulk-editor-select" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] mt-1"><SelectValue placeholder="Choose editor" /></SelectTrigger>
              <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                {data.editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-xs text-[color:var(--text-3)] mt-2">Only ads not yet in production ({assignableSelected.length} of {selectedIds.length}) will be assigned.</div>
          </div>
          <DialogFooter>
            <button data-testid="agency-bulk-assign-confirm" onClick={assignBulk} disabled={busy || !editorId} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2">{busy && <Loader2 className="animate-spin" size={14} />} Assign</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
