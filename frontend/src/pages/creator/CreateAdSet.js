import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/Shared';
import { FileUpload } from '@/components/FileUpload';
import { Plus, Trash2, Loader2, FileText, Zap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

function emptyAd() {
  return {
    name: '',
    script: '',
    visual_guidelines: '',
    reference_links: [''],
    reference_media: [],
    media_file: null,
    headline: '',
    primary_text: '',
  };
}

export default function CreateAdSet() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('script');
  const [name, setName] = useState('');
  const [ads, setAds] = useState([emptyAd()]);
  const [busy, setBusy] = useState(false);

  const setAdField = (idx, field, val) => {
    setAds(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };
  const addAd = () => setAds(prev => [...prev, emptyAd()]);
  const removeAd = (idx) => setAds(prev => prev.filter((_, i) => i !== idx));
  const setLink = (adIdx, linkIdx, val) => setAdField(adIdx, 'reference_links', ads[adIdx].reference_links.map((l, i) => i === linkIdx ? val : l));
  const addLink = (adIdx) => setAdField(adIdx, 'reference_links', [...ads[adIdx].reference_links, '']);
  const removeLink = (adIdx, linkIdx) => setAdField(adIdx, 'reference_links', ads[adIdx].reference_links.filter((_, i) => i !== linkIdx));

  const submit = async (asDraft) => {
    if (!name.trim()) { toast.error('Ad set name required'); return; }
    for (const [i, a] of ads.entries()) {
      if (!a.name.trim()) { toast.error(`Ad #${i+1} needs a name`); return; }
      if (type === 'media_ready' && !a.media_file) { toast.error(`Ad #${i+1} needs media file`); return; }
    }
    setBusy(true);
    try {
      const payload = {
        name,
        type,
        ads: ads.map(a => ({
          ...a,
          reference_links: (a.reference_links || []).filter(l => l && l.trim()),
        })),
      };
      const { data } = await api.post('/ad-sets', payload);
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
        subtitle={`Step ${step} of 2 • ${type === 'script' ? 'Script only' : 'Media ready'}`}
        breadcrumbs="Creator / New Ad Set"
        actions={
          <button data-testid="create-adset-back-button" onClick={() => nav(-1)} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
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
          <div className="space-y-4">
            {ads.map((ad, idx) => (
              <div key={idx} className="card-elevated p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Ad #{idx + 1}</div>
                  {ads.length > 1 && (
                    <button data-testid={`remove-ad-${idx}`} onClick={() => removeAd(idx)} className="h-8 px-2 rounded hover:bg-white/5 text-[color:var(--text-3)] hover:text-[color:#FFB4B4] inline-flex items-center gap-1 text-xs transition-colors"><Trash2 size={12} /> Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[color:var(--text-2)]">Ad name</label>
                    <input data-testid={`ad-name-${idx}`} value={ad.name} onChange={(e) => setAdField(idx, 'name', e.target.value)} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="e.g., Beach Ad" />
                  </div>
                  <div>
                    <label className="text-xs text-[color:var(--text-2)]">Headline</label>
                    <input data-testid={`ad-headline-${idx}`} value={ad.headline} onChange={(e) => setAdField(idx, 'headline', e.target.value)} className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="Attention-grabbing headline" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-xs text-[color:var(--text-2)]">Primary text</label>
                    <textarea data-testid={`ad-primary-text-${idx}`} value={ad.primary_text} onChange={(e) => setAdField(idx, 'primary_text', e.target.value)} className="mt-1 w-full min-h-[64px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Main body text for the ad" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-xs text-[color:var(--text-2)]">Script</label>
                    <textarea data-testid={`ad-script-${idx}`} value={ad.script} onChange={(e) => setAdField(idx, 'script', e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Voice-over and scene direction…" />
                  </div>
                  {type === 'script' && (
                    <>
                      <div className="lg:col-span-2">
                        <label className="text-xs text-[color:var(--text-2)]">Visual guidelines</label>
                        <textarea data-testid={`ad-guidelines-${idx}`} value={ad.visual_guidelines} onChange={(e) => setAdField(idx, 'visual_guidelines', e.target.value)} className="mt-1 w-full min-h-[80px] rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-3 text-sm" placeholder="Color palette, mood, pacing…" />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-xs text-[color:var(--text-2)]">Reference links</label>
                        <div className="space-y-2 mt-1">
                          {(ad.reference_links || []).map((l, li) => (
                            <div key={li} className="flex items-center gap-2">
                              <input data-testid={`ad-link-${idx}-${li}`} value={l} onChange={(e) => setLink(idx, li, e.target.value)} className="flex-1 h-9 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm" placeholder="https://…" />
                              <button data-testid={`ad-link-remove-${idx}-${li}`} onClick={() => removeLink(idx, li)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5 text-[color:var(--text-3)] transition-colors"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          <button data-testid={`ad-link-add-${idx}`} onClick={() => addLink(idx)} className="text-xs text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] inline-flex items-center gap-1"><Plus size={12} /> Add link</button>
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-xs text-[color:var(--text-2)]">Reference media</label>
                        <div className="mt-1">
                          <FileUpload multiple testId={`ad-refmedia-${idx}`} value={ad.reference_media} onChange={(v) => setAdField(idx, 'reference_media', v)} label="Upload reference media" />
                        </div>
                      </div>
                    </>
                  )}
                  {type === 'media_ready' && (
                    <div className="lg:col-span-2">
                      <label className="text-xs text-[color:var(--text-2)]">Video / media file</label>
                      <div className="mt-1">
                        <FileUpload testId={`ad-media-${idx}`} value={ad.media_file} onChange={(v) => setAdField(idx, 'media_file', v)} label="Upload final video" accept="video/*,image/*" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button data-testid="create-adset-add-ad" onClick={addAd} className="h-9 px-3 rounded-lg border border-dashed border-[color:var(--stroke)] hover:bg-white/5 text-sm inline-flex items-center gap-2 transition-colors"><Plus size={14} /> Add another ad</button>
              <div className="flex items-center gap-2">
                <button data-testid="create-adset-save-draft" onClick={() => submit(true)} disabled={busy} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm transition-colors">Save as draft</button>
                <button data-testid="create-adset-submit" onClick={() => submit(false)} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 transition-colors">
                  {busy && <Loader2 className="animate-spin" size={14} />} Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
