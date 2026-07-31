import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { AdDetailBody } from '@/pages/adset/AdSetDetail';
import { ArrowLeft, UserRound, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Ads can be handed to an editor until the editor has submitted their cut. */
const ASSIGNABLE = ['assigned_agency', 'assigned_editor'];

export default function AgencyAdSetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [editors, setEditors] = useState([]);
  const [adDetail, setAdDetail] = useState(null);
  const [adError, setAdError] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [busyAdId, setBusyAdId] = useState(null);
  const [bulkEditor, setBulkEditor] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: s }, { data: eds }] = await Promise.all([
        api.get(`/ad-sets/${id}`),
        api.get('/agency/editors'),
      ]);
      setData(s);
      setEditors(eds);
      setSelectedAdId(prev => prev || (s.ads[0] && s.ads[0].id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load ad set');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedAdId) return;
    let cancelled = false;
    setAdDetail(null);
    setAdError(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/ads/${selectedAdId}`);
        if (!cancelled) setAdDetail(d);
      } catch (e) {
        // never leave the pane spinning — say why it could not load
        if (!cancelled) setAdError(e?.response?.data?.detail || 'This ad could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAdId, data]);

  const assign = async (adId, editorId) => {
    if (!editorId) return;
    setBusyAdId(adId);
    try {
      const { data: res } = await api.post('/workflow/agency/assign', { ad_ids: [adId], editor_id: editorId });
      if (res.assigned_count === 0) { toast.error('That ad can no longer be reassigned'); return; }
      toast.success(`Assigned to ${editors.find(e => e.id === editorId)?.name || 'editor'}`);
      await load();
      if (adId === selectedAdId) setAdDetail((await api.get(`/ads/${adId}`)).data);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to assign'); } finally { setBusyAdId(null); }
  };

  const assignRemaining = async () => {
    const ids = data.ads.filter(a => a.status === 'assigned_agency').map(a => a.id);
    if (!bulkEditor || ids.length === 0) return;
    setBusy(true);
    try {
      const { data: res } = await api.post('/workflow/agency/assign', { ad_ids: ids, editor_id: bulkEditor });
      toast.success(`Assigned ${res.assigned_count} ad(s)`);
      setBulkEditor('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  if (!data) return <div><PageHeader title="Ad set" /><div className="p-6"><PageLoader /></div></div>;
  const { ad_set, ads } = data;
  const editorName = (eid) => editors.find(e => e.id === eid)?.name;
  const unassigned = ads.filter(a => a.status === 'assigned_agency').length;

  return (
    <div>
      <PageHeader
        title={ad_set.name}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'var(--font-mono)' }}>{ad_set.ad_set_code}</span>
            · {ad_set.type === 'media_ready' ? 'Media ready' : 'Script'} · <StatusPill status={ad_set.status} />
            <span className="text-[color:var(--text-3)]">{ads.length} ad{ads.length === 1 ? '' : 's'}</span>
          </span>
        }
        breadcrumbs="Agency / Ad Set"
        actions={
          <button data-testid="agency-adset-back" onClick={() => nav('/agency')} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      {unassigned > 0 && editors.length > 0 && (
        <div className="px-6 lg:px-8 py-3 border-b border-[color:var(--stroke)] flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[color:var(--text-2)]">
            {unassigned} ad{unassigned === 1 ? '' : 's'} not yet with an editor
          </span>
          <div className="min-w-[200px]">
            <Select value={bulkEditor} onValueChange={setBulkEditor}>
              <SelectTrigger data-testid="agency-adset-bulk-editor" className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] h-9"><SelectValue placeholder="Give them all to…" /></SelectTrigger>
              <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                {editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            data-testid="agency-adset-bulk-assign"
            onClick={assignRemaining}
            disabled={busy || !bulkEditor}
            className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Assign all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[calc(100vh-200px)]">
        <aside className="border-r border-[color:var(--stroke)] p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Ads ({ads.length})</div>
          {ads.map((a) => {
            const canAssign = ASSIGNABLE.includes(a.status);
            return (
              <div
                key={a.id}
                data-testid={`agency-adset-ad-${a.id}`}
                className={`rounded-lg border p-3 transition-colors ${selectedAdId === a.id ? 'border-[color:var(--brand-teal)]/50 bg-[color:var(--bg-2)]' : 'border-[color:var(--stroke)] hover:bg-white/[0.03]'}`}
              >
                <button onClick={() => setSelectedAdId(a.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{a.ad_code}</div>
                </button>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[color:var(--text-3)]">
                  <UserRound size={11} className="shrink-0" />
                  {a.assigned_editor_id
                    ? <span className="truncate">{editorName(a.assigned_editor_id) || 'Editor'}</span>
                    : <span>No editor yet</span>}
                </div>

                {canAssign ? (
                  <div className="mt-2">
                    <Select value={a.assigned_editor_id || ''} onValueChange={(v) => assign(a.id, v)} disabled={busyAdId === a.id}>
                      <SelectTrigger data-testid={`agency-adset-assign-${a.id}`} className="bg-[color:var(--bg-2)] border-[color:var(--stroke)] h-8 text-xs">
                        <SelectValue placeholder="Assign to editor" />
                      </SelectTrigger>
                      <SelectContent className="bg-[color:var(--bg-1)] border-[color:var(--stroke)]">
                        {editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-[color:var(--text-3)]">
                    {a.status === 'pending_final_review' ? 'Submitted for final review — locked'
                      : a.status === 'approved' ? 'Approved — locked'
                      : 'Not ready to assign'}
                  </div>
                )}
              </div>
            );
          })}
          {editors.length === 0 && (
            <div className="text-[11px] text-[color:var(--text-3)] px-1 pt-2">
              No editors in your agency yet — add one under <span className="text-[color:var(--brand-teal)]">My Editors</span>.
            </div>
          )}
        </aside>

        <section className="p-6 lg:p-8">
          {adError ? (
            <div data-testid="agency-adset-ad-error" className="card-elevated p-6 max-w-lg">
              <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Can’t show this ad</div>
              <div className="text-sm text-[color:var(--text-3)] mt-1">{adError}</div>
            </div>
          ) : !adDetail ? <PageLoader /> : (
            <AdDetailBody
              ad={adDetail.ad}
              reviews={adDetail.reviews || []}
              versions={adDetail.versions || []}
              agency={adDetail.assigned_agency}
              editor={adDetail.assigned_editor}
            />
          )}
        </section>
      </div>
    </div>
  );
}
