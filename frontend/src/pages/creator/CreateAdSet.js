import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/Shared';
import { AdFormFields, emptyAd, filled, adError, serializeAd } from '@/components/AdForm';
import { Plus, Trash2, Loader2, FileText, Zap, ArrowLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAdSet() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('script');
  const [name, setName] = useState('');
  const [ads, setAds] = useState([emptyAd()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const setAd = (idx, next) => setAds((prev) => prev.map((a, i) => (i === idx ? next : a)));
  const removeAd = (idx) => {
    setAds((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((prev) => (prev >= idx && prev > 0 ? prev - 1 : prev));
  };

  const errorFor = (a, i) => adError(a, type, `Ad #${i + 1}`);

  /** An ad must be complete before the creator moves on to the next one. */
  const addAd = () => {
    const err = errorFor(ads[activeIdx], activeIdx);
    if (err) { toast.error(`${err} before adding another`); return; }
    setAds((prev) => [...prev, emptyAd()]);
    setActiveIdx(ads.length);
  };

  const submit = async (asDraft) => {
    if (!name.trim()) { toast.error('Ad set name required'); return; }
    for (const [i, a] of ads.entries()) {
      const err = errorFor(a, i);
      if (err) { setActiveIdx(i); toast.error(err); return; }
    }
    setBusy(true);
    try {
      const { data } = await api.post('/ad-sets', { name, type, ads: ads.map(serializeAd) });
      const adSetId = data.ad_set.id;
      if (!asDraft) {
        await api.post(`/ad-sets/${adSetId}/submit`);
        toast.success('Ad set submitted for review');
      } else {
        toast.success('Ad set saved as draft');
      }
      nav(`/ad-sets/${adSetId}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create ad set');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Create ad set"
        subtitle={`Step ${step} of 2 • ${type === 'script' ? 'Script only' : 'Media ready'}${step === 2 ? ` • ${ads.length} ad${ads.length === 1 ? '' : 's'}` : ''}`}
        breadcrumbs="Creator / New Ad Set"
        actions={
          <>
            <button data-testid="create-adset-back-button" onClick={() => (step === 2 ? setStep(1) : nav(-1))} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            {step === 2 && (
              <>
                <button data-testid="create-adset-save-draft" onClick={() => submit(true)} disabled={busy} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors disabled:opacity-50">Save as draft</button>
                <button data-testid="create-adset-submit" onClick={() => submit(false)} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50">
                  {busy && <Loader2 className="animate-spin" size={14} />} Submit
                </button>
              </>
            )}
          </>
        }
      />
      <div className="p-6 lg:p-8 max-w-4xl">
        {step === 1 && (
          <div className="card-elevated p-6 space-y-6">
            <div>
              <div className="text-xs text-[color:var(--text-3)] mb-2">Type</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { v: 'script', label: 'Script only', desc: 'Writers draft scripts and briefs; agencies produce the video.', icon: FileText },
                  { v: 'media_ready', label: 'Media ready', desc: 'You already have the final video, skip production straight to final review.', icon: Zap },
                ].map((o) => (
                  <button
                    key={o.v}
                    data-testid={`create-type-${o.v}`}
                    onClick={() => setType(o.v)}
                    className={`text-left p-4 rounded-xl border transition-colors ${type === o.v ? 'border-[color:var(--brand-teal)] bg-[color:var(--brand-teal)]/10' : 'border-[color:var(--stroke)] hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-center gap-2 text-[color:var(--brand-teal)]"><o.icon size={16} /><span className="text-sm font-semibold text-[color:var(--text-1)]">{o.label}</span></div>
                    <div className="text-xs text-[color:var(--text-3)] mt-2">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Ad set name</label>
              <input data-testid="create-adset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Summer Campaign 2026" className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" />
            </div>
            <div className="flex justify-end">
              <button data-testid="create-adset-next" onClick={() => setStep(2)} disabled={!name.trim()} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors">Next: Add ads</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {ads.map((ad, idx) => {
              const open = idx === activeIdx;
              const complete = !errorFor(ad, idx);

              if (!open) {
                return (
                  <div key={idx} data-testid={`ad-summary-${idx}`} className="card-elevated flex items-center gap-3 px-4 py-3">
                    <button onClick={() => setActiveIdx(idx)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      {complete
                        ? <CheckCircle2 size={14} className="shrink-0 text-[color:#D7FF9A]" />
                        : <span className="shrink-0 h-3.5 w-3.5 rounded-full border border-[color:var(--text-3)]" />}
                      <span className="text-xs text-[color:var(--text-3)] shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>Ad #{idx + 1}</span>
                      <span className="text-sm truncate">{ad.name || <span className="text-[color:var(--text-3)]">Untitled ad</span>}</span>
                      <span className="text-[11px] text-[color:var(--text-3)] shrink-0 ml-auto tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                        {filled(ad.headlines).length}H · {filled(ad.primary_texts).length}P
                      </span>
                      <ChevronDown size={14} className="shrink-0 text-[color:var(--text-3)]" />
                    </button>
                    {ads.length > 1 && (
                      <button data-testid={`remove-ad-${idx}`} onClick={() => removeAd(idx)} aria-label={`Remove ad ${idx + 1}`} className="h-8 w-8 shrink-0 grid place-items-center rounded hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] transition-colors"><Trash2 size={12} /></button>
                    )}
                  </div>
                );
              }

              return (
                <div key={idx} className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Ad #{idx + 1}</div>
                    {ads.length > 1 && (
                      <button data-testid={`remove-ad-${idx}`} onClick={() => removeAd(idx)} className="h-8 px-2 rounded hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] inline-flex items-center gap-1 text-xs transition-colors"><Trash2 size={12} /> Remove</button>
                    )}
                  </div>
                  <AdFormFields ad={ad} type={type} idx={idx} onChange={(next) => setAd(idx, next)} />
                </div>
              );
            })}

            <button
              data-testid="create-adset-add-ad"
              onClick={addAd}
              className="w-full h-11 rounded-lg border border-dashed border-[color:var(--stroke)] hover:border-[color:var(--brand-teal)]/50 hover:bg-white/5 text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add another ad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
