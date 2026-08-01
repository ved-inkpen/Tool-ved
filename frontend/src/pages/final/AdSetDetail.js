import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { StatusPill } from '@/components/StatusPill';
import { ArrowLeft, PlayCircle, Clock, CheckCircle2, AlertCircle, MessageSquare, Hammer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

/** One ad tile with its media preview. */
function AdTile({ ad, onOpen, note }) {
  const media = ad.media_file;
  return (
    <button
      data-testid={`final-set-ad-${ad.id}`}
      onClick={() => onOpen(ad.id)}
      className="text-left card-elevated overflow-hidden hover:border-[color:var(--brand-teal)]/40 transition-colors flex flex-col"
    >
      <div className="relative aspect-video bg-black grid place-items-center">
        {media?.content_type?.startsWith('video/') ? (
          <>
            <video src={fileUrl(media.file_id)} className="w-full h-full object-cover opacity-90" muted />
            <PlayCircle className="absolute inset-0 m-auto text-white/80" size={38} />
          </>
        ) : media?.content_type?.startsWith('image/') ? (
          <img src={fileUrl(media.file_id)} alt={ad.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-xs text-[color:var(--text-3)]">No preview</div>
        )}
      </div>
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{ad.name}</div>
          <StatusPill status={ad.status} />
        </div>
        <div className="text-[11px] text-[color:var(--text-3)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          {ad.ad_code}{ad.current_version > 0 ? ` · v${ad.current_version}` : ''}
        </div>
        {note}
        <div className="text-[11px] text-[color:var(--text-3)] mt-2">
          {ad.updated_at ? formatDistanceToNow(new Date(ad.updated_at), { addSuffix: true }) : ''}
        </div>
      </div>
    </button>
  );
}

function Section({ id, title, icon: Icon, accent, ads, empty, onOpen, renderNote }) {
  return (
    <section data-testid={`final-section-${id}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color: accent }} />
        <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
        <span className="text-xs text-[color:var(--text-3)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{ads.length}</span>
      </div>
      {ads.length === 0 ? (
        <div className="text-xs text-[color:var(--text-3)] px-1 pb-2">{empty}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ads.map(a => <AdTile key={a.id} ad={a} onOpen={onOpen} note={renderNote?.(a)} />)}
        </div>
      )}
    </section>
  );
}

export default function FinalReviewAdSet() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try { setData((await api.get(`/ad-sets/${id}`)).data); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load ad set'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div><PageHeader title="Ad set" /><div className="p-6"><PageLoader /></div></div>;
  const { ad_set, ads } = data;

  const pending = ads.filter(a => a.status === 'pending_final_review');
  const approved = ads.filter(a => a.status === 'approved');
  const rejected = ads.filter(a => a.status === 'final_rejected');
  // everything still upstream of final review, shown as context rather than a section
  const upstream = ads.length - pending.length - approved.length - rejected.length;
  const open = (adId) => nav(`/final-review/ads/${adId}`);

  return (
    <div>
      <PageHeader
        title={ad_set.name}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'var(--font-mono)' }}>{ad_set.ad_set_code}</span>
            · {ad_set.type === 'media_ready' ? 'Media ready' : 'Script'} · <StatusPill status={ad_set.status} />
            {ad_set.created_by_name && <span className="text-[color:var(--text-3)]">by {ad_set.created_by_name}</span>}
          </span>
        }
        breadcrumbs="Final Review / Ad Set"
        actions={
          <button data-testid="final-set-back" onClick={() => nav('/final-review')} className="h-9 px-3 rounded-lg hover:bg-white/5 text-sm text-[color:var(--text-2)] inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />
      <div className="p-6 lg:p-8 space-y-8">
        <Section
          id="pending" title="Pending your review" icon={Clock} accent="#FFD08A"
          ads={pending} onOpen={open}
          empty={upstream > 0 ? 'Nothing waiting on you right now.' : 'Nothing waiting on you.'}
        />
        <Section
          id="approved" title="Approved" icon={CheckCircle2} accent="#D7FF9A"
          ads={approved} onOpen={open}
          empty="No ads approved in this set yet."
        />
        <Section
          id="rejected" title="Sent back to the editor" icon={AlertCircle} accent="#FFB4B4"
          ads={rejected} onOpen={open}
          empty="You haven't sent anything back in this set."
          renderNote={(a) => a.latest_review_comment ? (
            <div className="mt-2 rounded-md border border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.08)] p-2">
              <div className="text-[10px] text-[color:#FFB4B4] font-semibold flex items-center gap-1"><MessageSquare size={10} /> Your note</div>
              <div className="text-[11px] text-[color:var(--text-1)] mt-0.5 line-clamp-2">{a.latest_review_comment}</div>
            </div>
          ) : null}
        />

        {upstream > 0 && (
          <div data-testid="final-upstream-note" className="text-xs text-[color:var(--text-3)] inline-flex items-center gap-1.5 border-t border-[color:var(--stroke)] pt-4 w-full">
            <Hammer size={12} />
            {upstream} more ad{upstream === 1 ? '' : 's'} in this set {upstream === 1 ? 'is' : 'are'} still in scripting or production.
          </div>
        )}
      </div>
    </div>
  );
}
