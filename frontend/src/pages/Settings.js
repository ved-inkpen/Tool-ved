import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/Shared';
import { useAuth } from '@/context/AuthContext';
import { Slack, Check, Loader2, Send, Unplug, AlertCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setState((await api.get('/me/slack')).data); }
    catch (e) { toast.error('Could not load your Slack settings'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    setBusy(true);
    try {
      const { data } = await api.put('/me/slack', { webhook_url: url.trim() });
      setState(data);
      setUrl('');
      toast.success('Slack connected');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save that webhook'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true);
    try { await api.delete('/me/slack'); await load(); toast.success('Slack disconnected'); }
    catch (e) { toast.error('Failed to disconnect'); } finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true);
    try { await api.post('/me/slack/test'); await load(); toast.success('Test message sent — check Slack'); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Slack rejected the message'); await load(); }
    finally { setBusy(false); }
  };

  if (!state) return <div><PageHeader title="Settings" /><div className="p-6"><PageLoader /></div></div>;

  return (
    <div>
      <PageHeader title="Settings" subtitle={`Signed in as ${user?.name} · ${user?.email}`} />
      <div className="p-6 lg:p-8 max-w-2xl space-y-5">
        <div className="card-elevated p-5" data-testid="slack-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Slack size={16} className="text-[color:var(--brand-teal)]" />
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Slack notifications</div>
                <div className="text-xs text-[color:var(--text-3)]">Everything you get in the app is mirrored to Slack.</div>
              </div>
            </div>
            {state.connected && (
              <span data-testid="slack-connected-badge" className="text-[10px] px-2 py-1 rounded-full bg-[color:#D7FF9A]/15 text-[color:#D7FF9A] inline-flex items-center gap-1">
                <Check size={11} /> Connected
              </span>
            )}
          </div>

          {state.connected ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>Webhook</div>
                <div className="text-sm mt-0.5 break-all" style={{ fontFamily: 'var(--font-mono)' }} data-testid="slack-masked">{state.webhook_masked}</div>
              </div>
              {state.last_delivery_at && (
                <div className="text-[11px] text-[color:var(--text-3)]">
                  Last delivered {formatDistanceToNow(new Date(state.last_delivery_at), { addSuffix: true })}
                </div>
              )}
              {state.last_error && (
                <div data-testid="slack-error" className="rounded-lg p-3 border border-[color:rgba(248,113,113,0.30)] bg-[color:rgba(248,113,113,0.06)]">
                  <div className="text-[10px] uppercase tracking-widest text-[color:#FFB4B4] font-semibold flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    <AlertCircle size={11} /> Last attempt failed
                  </div>
                  <div className="text-xs mt-1 break-all">{state.last_error}</div>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button data-testid="slack-test" onClick={sendTest} disabled={busy} className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Send test message
                </button>
                <button data-testid="slack-disconnect" onClick={disconnect} disabled={busy} className="h-9 px-4 rounded-lg border border-[color:var(--stroke)] hover:bg-white/5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  <Unplug size={14} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <ol className="text-xs text-[color:var(--text-3)] space-y-1 list-decimal list-inside">
                <li>In Slack, create an app and turn on <span className="text-[color:var(--text-2)]">Incoming Webhooks</span>.</li>
                <li>Add a webhook to the channel or DM you want notifications in.</li>
                <li>Copy the URL it gives you and paste it below.</li>
              </ol>
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[color:var(--brand-teal)] hover:text-[color:var(--focus-ring)] inline-flex items-center gap-1"
              >
                <ExternalLink size={11} /> Slack's guide to incoming webhooks
              </a>
              <div>
                <label className="text-xs text-[color:var(--text-2)]">Incoming webhook URL</label>
                <input
                  data-testid="slack-url-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T000/B000/xxxx"
                  className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] px-3 text-sm"
                />
              </div>
              <button
                data-testid="slack-connect"
                onClick={connect}
                disabled={busy || !url.trim()}
                className="h-9 px-4 rounded-lg bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Slack size={14} />} Connect Slack
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
