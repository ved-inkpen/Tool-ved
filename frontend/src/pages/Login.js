import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Lottie from 'lottie-react';
import rocketLaunch from '@/assets/rocket-launch.json';
import { Aurora, AuroraStars } from '@/components/Aurora';
import { Sparkles, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_ACCOUNTS = [
  { label: 'Admin', short: 'AD', tint: '#7DEBFF', email: 'admin@marketing.studio', password: 'Admin@12345' },
  { label: 'Creator', short: 'CR', tint: '#6EF3E6', email: 'creator@marketing.studio', password: 'Creator@123' },
  { label: 'Script Reviewer', short: 'SR', tint: '#A9E7F5', email: 'reviewer@marketing.studio', password: 'Reviewer@123' },
  { label: 'Agency Admin', short: 'AA', tint: '#B7FFF7', email: 'agency-admin@pixel.studio', password: 'Agency@123' },
  { label: 'Video Editor', short: 'VE', tint: '#FFD08A', email: 'editor@pixel.studio', password: 'Editor@123' },
  { label: 'Final Reviewer', short: 'FR', tint: '#D7FF9A', email: 'final@marketing.studio', password: 'Final@123' },
  { label: 'Ad Poster', short: 'AP', tint: '#C7B9FF', email: 'poster@marketing.studio', password: 'Poster@123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back');
      nav('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const fill = (a) => { setEmail(a.email); setPassword(a.password); };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-0)]">
      {/* One backdrop spanning the whole page. Two hue-offset copies cross-fade
          left to right and a single star field sits over both, so the colour
          shifts across the page without a seam between the panels. */}
      <Aurora />
      <Aurora dim />
      <AuroraStars />

      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 relative grain-overlay">
        <div className="relative flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-[var(--brand-teal)] to-[#0EA5B5] text-white"><Sparkles size={18} /></div>
          <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Marco</div>
        </div>
        <div className="relative max-w-md">
          <Lottie
            animationData={rocketLaunch}
            loop
            className="w-56 h-56 -ml-4 -mb-2"
            aria-hidden="true"
            data-testid="rocket-lottie"
          />
          <h1 className="text-4xl font-semibold leading-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Giving escape velocity to our rocketship
          </h1>
          <p className="text-sm text-[color:var(--text-3)]">
            Replace spreadsheets with a fast, dark-themed studio control room. Track every ad from script to approved asset with clear ownership across teams and agencies.
          </p>
        </div>
        <div className="relative text-[11px] text-[color:var(--text-3)]" style={{ fontFamily: 'var(--font-mono)' }}>v1.0 · Studio Ops</div>
      </div>

      <div className="relative flex items-center justify-center p-6 lg:p-10">
        {/* soft halo so the card reads as lit rather than pasted on */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-[34rem] w-[34rem] rounded-full bg-[color:var(--brand-teal)]/[0.07] blur-[110px]" />
        </div>

        <div className="login-card relative w-full max-w-md rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.14] via-white/[0.05] to-transparent">
          <div className="rounded-2xl bg-[color:var(--bg-1)]/95 backdrop-blur-xl p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-[var(--brand-teal)] to-[#0EA5B5] text-white"><Sparkles size={16} /></div>
              <div className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Marco</div>
            </div>

            <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Sign in</h2>
            <p className="text-sm text-[color:var(--text-3)] mt-1">Use your work account to access your role dashboard.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-[color:var(--text-2)]">Email</label>
                <div className="relative mt-1">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] pointer-events-none" />
                  <input
                    data-testid="login-email-input"
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    autoComplete="email"
                    className="w-full h-11 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] pl-9 pr-3 text-sm text-[color:var(--text-1)] placeholder:text-[color:var(--text-3)] transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:border-[color:var(--brand-teal)] focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]/25"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[color:var(--text-2)]">Password</label>
                <div className="relative mt-1">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] pointer-events-none" />
                  <input
                    data-testid="login-password-input"
                    type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                    autoComplete="current-password"
                    className="w-full h-11 rounded-lg bg-[color:var(--bg-2)] border border-[color:var(--stroke)] pl-9 pr-10 text-sm text-[color:var(--text-1)] placeholder:text-[color:var(--text-3)] transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:border-[color:var(--brand-teal)] focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]/25"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    data-testid="login-toggle-password"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-[color:var(--text-3)] hover:text-[color:var(--text-1)] hover:bg-white/5 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                data-testid="login-submit-button"
                disabled={busy}
                className="group w-full h-11 rounded-lg font-medium bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_8px_24px_-10px_var(--brand-teal)]"
              >
                {busy ? <Loader2 className="animate-spin" size={15} /> : null}
                Sign in
                {!busy && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-[color:var(--stroke)]">
              <button
                type="button"
                data-testid="login-demo-toggle"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-widest text-[color:var(--text-3)] hover:text-[color:var(--text-2)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Demo accounts
                <ChevronDown size={13} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
              </button>

              {showDemo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                  {SAMPLE_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      data-testid={`login-demo-${a.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      onClick={() => fill(a)}
                      title={a.email}
                      className="group flex items-center gap-2 text-left px-2.5 py-2 rounded-lg bg-[color:var(--bg-2)] hover:bg-white/[0.06] border border-[color:var(--stroke)] hover:border-[color:var(--brand-teal)]/40 transition-colors"
                    >
                      <span className="h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold text-[color:var(--bg-0)]" style={{ background: a.tint }}>
                        {a.short}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-[color:var(--text-1)] font-medium truncate">{a.label}</span>
                        <span className="block text-[10px] text-[color:var(--text-3)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>{a.email}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
