import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (e) {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };
  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="topbar-notification-bell-button"
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-full grid place-items-center hover:bg-white/5 text-[color:var(--text-2)] transition-colors"
        >
          <Bell className="h-4.5 w-4.5" size={18} />
          {unread > 0 && (
            <span data-testid="topbar-notification-unread-count" className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[var(--brand-teal)] text-white text-[10px] font-bold grid place-items-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 border-[color:var(--stroke)] bg-[color:var(--bg-1)] text-[color:var(--text-1)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--stroke)]">
          <div className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Notifications</div>
          <button
            data-testid="notification-center-mark-all-read-button"
            onClick={markAllRead}
            className="text-xs text-[color:var(--text-3)] hover:text-[color:var(--text-1)] transition-colors flex items-center gap-1"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
        <ScrollArea className="h-[420px]">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-[color:var(--text-3)]">No notifications yet</div>
          )}
          <ul className="divide-y divide-[color:var(--stroke)]">
            {items.map((n) => (
              <li
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                className={`p-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${!n.read ? 'bg-white/[0.02]' : ''}`}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.link) { setOpen(false); navigate(n.link); }
                }}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${!n.read ? 'bg-[var(--brand-teal)]' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[color:var(--text-1)]">{n.title}</div>
                    <div className="text-xs text-[color:var(--text-3)] mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-[color:var(--text-3)] mt-1 tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="p-1 rounded hover:bg-white/5 text-[color:var(--text-3)]"
                      aria-label="Mark read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
