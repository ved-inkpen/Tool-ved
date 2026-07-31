import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Send, Loader2, Trash2, MessageSquare, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

const ROLE_COLORS = {
  admin: '#C7D2E0',
  creator: '#7DEBFF',
  script_reviewer: '#FFD08A',
  agency_admin: '#D7FF9A',
  video_editor: '#B7FFF7',
  final_reviewer: '#FF9EE1',
};

function initials(name) {
  return (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

// Flatten tree into ordered list with depth
function flatten(items) {
  const byId = Object.fromEntries(items.map(c => [c.id, { ...c, _children: [] }]));
  const roots = [];
  Object.values(byId).forEach(c => {
    if (c.parent_id && byId[c.parent_id]) byId[c.parent_id]._children.push(c);
    else roots.push(c);
  });
  const out = [];
  const walk = (node, depth) => {
    out.push({ ...node, _depth: depth });
    (node._children || [])
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      .forEach(child => walk(child, depth + 1));
  };
  roots
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    .forEach(r => walk(r, 0));
  return out;
}

export function CommentThread({ adId }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ads/${adId}/comments`);
      setItems(data);
    } catch (e) {} finally { setLoading(false); }
  }, [adId]);

  useEffect(() => { load(); }, [load]);

  const submitTop = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/ads/${adId}/comments`, { text: text.trim() });
      setText('');
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !replyTo) return;
    setBusy(true);
    try {
      await api.post(`/ads/${adId}/comments`, { text: replyText.trim(), parent_id: replyTo });
      setReplyText('');
      setReplyTo(null);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/ads/${adId}/comments/${id}`);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const flat = flatten(items);

  return (
    <div data-testid="comment-thread">
      <div className="text-xs text-[color:var(--text-3)] mb-2 inline-flex items-center gap-1">
        <MessageSquare size={12} /> Discussion ({items.length})
      </div>
      <div className="card-elevated p-4 space-y-4">
        <div className="flex gap-2">
          <textarea
            data-testid="comment-thread-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="flex-1 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-2 text-sm"
          />
          <button
            data-testid="comment-thread-submit"
            onClick={submitTop}
            disabled={busy || !text.trim()}
            className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-xs inline-flex items-center gap-1 self-start disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />} Post
          </button>
        </div>
        {loading && <div className="text-xs text-[color:var(--text-3)] py-4 text-center">Loading…</div>}
        {!loading && flat.length === 0 && (
          <div className="text-xs text-[color:var(--text-3)] py-4 text-center">No comments yet. Start the conversation.</div>
        )}
        {!loading && flat.length > 0 && (
          <ul className="space-y-3">
            {flat.map(c => {
              const canDelete = c.author_id === user?.id || user?.role === 'admin';
              const isReplying = replyTo === c.id;
              const indent = Math.min(c._depth || 0, 4) * 20;
              return (
                <li key={c.id} data-testid={`comment-${c.id}`} style={{ paddingLeft: indent }}>
                  <div className={`flex items-start gap-2 ${c._depth > 0 ? 'border-l border-[color:var(--stroke)] pl-3' : ''}`}>
                    <div
                      className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[10px] font-bold"
                      style={{ background: `${ROLE_COLORS[c.author_role] || '#8FA1B3'}20`, color: ROLE_COLORS[c.author_role] || '#C7D2E0' }}
                    >
                      {initials(c.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[color:var(--text-1)]">{c.author_name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>{(c.author_role || '').replace('_', ' ')}</span>
                        <span className="text-[11px] text-[color:var(--text-3)]">· {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}</span>
                      </div>
                      <div className="text-sm text-[color:var(--text-1)] mt-0.5 whitespace-pre-wrap">{c.text}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          data-testid={`comment-reply-toggle-${c.id}`}
                          onClick={() => { setReplyTo(isReplying ? null : c.id); setReplyText(''); }}
                          className="text-[11px] text-[color:var(--text-3)] hover:text-[color:var(--brand-teal)] inline-flex items-center gap-1 transition-colors"
                        >
                          <CornerDownRight size={11} /> Reply
                        </button>
                        {canDelete && (
                          <button
                            data-testid={`comment-delete-${c.id}`}
                            onClick={() => del(c.id)}
                            className="text-[11px] text-[color:var(--text-3)] hover:text-[color:#FFB4B4] inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                      {isReplying && (
                        <div className="mt-2 flex gap-2">
                          <textarea
                            data-testid={`comment-reply-input-${c.id}`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            placeholder="Write a reply…"
                            className="flex-1 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] p-2 text-sm"
                          />
                          <button
                            data-testid={`comment-reply-submit-${c.id}`}
                            onClick={submitReply}
                            disabled={busy || !replyText.trim()}
                            className="h-9 px-3 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-xs inline-flex items-center gap-1 self-start disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />} Reply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
