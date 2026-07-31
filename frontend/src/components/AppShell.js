import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Search, Users, Building2, Video,
  ClipboardCheck, CheckCircle2, Download, Menu, LogOut, ChevronDown, Sparkles, UsersRound
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationCenter } from '@/components/NotificationCenter';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const ROLE_LABELS = {
  admin: 'Admin',
  creator: 'Creator',
  script_reviewer: 'Script Reviewer',
  agency_admin: 'Agency Admin',
  video_editor: 'Video Editor',
  final_reviewer: 'Final Reviewer',
};

function navFor(role) {
  const groups = [];
  if (role === 'admin') {
    groups.push({
      label: 'Administration',
      items: [
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/agencies', label: 'Agencies', icon: Building2 },
      ],
    });
  }
  if (['creator', 'admin'].includes(role)) {
    groups.push({
      label: 'Creator',
      items: [
        { to: '/creator', label: 'My Ad Sets', icon: FileText },
      ],
    });
  }
  if (['script_reviewer', 'admin'].includes(role)) {
    groups.push({
      label: 'Script Review',
      items: [
        { to: '/script-review', label: 'Review Queue', icon: Search },
      ],
    });
  }
  if (['agency_admin', 'admin'].includes(role)) {
    groups.push({
      label: 'Agency',
      items: [
        { to: '/agency', label: 'Agency Dashboard', icon: Building2 },
        { to: '/agency/editors', label: 'My Editors', icon: UsersRound },
      ],
    });
  }
  if (['video_editor', 'admin'].includes(role)) {
    groups.push({
      label: 'Editor',
      items: [
        { to: '/editor', label: 'My Ads', icon: Video },
      ],
    });
  }
  if (['final_reviewer', 'admin'].includes(role)) {
    groups.push({
      label: 'Final Review',
      items: [
        { to: '/final-review', label: 'Review Queue', icon: ClipboardCheck },
      ],
    });
  }
  groups.push({
    label: 'Assets',
    items: [
      { to: '/downloads', label: 'Approved Downloads', icon: Download },
    ],
  });
  return groups;
}

function Sidebar({ user, onNavigate }) {
  const groups = navFor(user?.role);
  return (
    <aside className="h-full w-full lg:w-[264px] shrink-0 border-r border-[color:var(--stroke)] bg-[color:var(--bg-1)] flex flex-col" data-testid="app-sidebar">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-[color:var(--stroke)]">
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-[color:var(--brand-teal)] to-[#0EA5B5] text-white shadow-inner">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Marketing Studio</div>
          <div className="text-[11px] text-[color:var(--text-3)] tracking-wide uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Ops Console</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="px-2 mb-2 text-[10px] uppercase tracking-widest text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {g.label}
            </div>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    onClick={onNavigate}
                    data-testid={`nav-${it.to.replace(/\//g, '-')}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-[color:var(--bg-2)] text-white border border-[color:var(--stroke)]'
                          : 'text-[color:var(--text-2)] hover:bg-white/[0.03] hover:text-white border border-transparent'
                      }`
                    }
                  >
                    <it.icon size={16} />
                    <span>{it.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[color:var(--stroke)] text-[11px] text-[color:var(--text-3)]">
        Logged in as <span className="text-[color:var(--text-2)]">{ROLE_LABELS[user?.role] || user?.role}</span>
      </div>
    </aside>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[color:var(--bg-0)] text-[color:var(--text-1)]">
      <div className="hidden lg:flex"><Sidebar user={user} /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[color:var(--stroke)] bg-[color:var(--bg-1)]/80 backdrop-blur sticky top-0 z-20 flex items-center px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button data-testid="topbar-menu-button" className="lg:hidden h-9 w-9 rounded-lg hover:bg-white/5 grid place-items-center text-[color:var(--text-2)] transition-colors">
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-[color:var(--bg-1)] border-r border-[color:var(--stroke)]">
              <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <NotificationCenter />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="topbar-user-menu" className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/[0.04] transition-colors">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[color:var(--brand-teal)] to-[#0EA5B5] text-white grid place-items-center text-xs font-bold">
                  {(user?.name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs leading-tight text-[color:var(--text-1)] font-medium">{user?.name}</div>
                  <div className="text-[10px] leading-tight text-[color:var(--text-3)]">{ROLE_LABELS[user?.role] || user?.role}</div>
                </div>
                <ChevronDown size={14} className="text-[color:var(--text-3)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[color:var(--bg-1)] border-[color:var(--stroke)] text-[color:var(--text-1)]">
              <DropdownMenuLabel className="text-xs text-[color:var(--text-3)]">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[color:var(--stroke)]" />
              <DropdownMenuItem data-testid="topbar-logout-menu-item" onClick={logout} className="text-sm cursor-pointer focus:bg-white/5">
                <LogOut size={14} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
