import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Lottie from 'lottie-react';
import rocketLaunch from '@/assets/rocket-launch.json';
import { Aurora } from '@/components/Aurora';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_ACCOUNTS = [
  { label: 'Admin', email: 'admin@marketing.studio', password: 'Admin@12345' },
  { label: 'Creator', email: 'creator@marketing.studio', password: 'Creator@123' },
  { label: 'Script Reviewer', email: 'reviewer@marketing.studio', password: 'Reviewer@123' },
  { label: 'Agency Admin (Pixel Studio)', email: 'agency-admin@pixel.studio', password: 'Agency@123' },
  { label: 'Video Editor (Pixel Studio)', email: 'editor@pixel.studio', password: 'Editor@123' },
  { label: 'Final Reviewer', email: 'final@marketing.studio', password: 'Final@123' },
  { label: 'Ad Poster', email: 'poster@marketing.studio', password: 'Poster@123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[color:var(--bg-0)]">
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden grain-overlay"
           style={{ background: 'var(--bg-1)' }}>
        <Aurora />
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

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md card-elevated p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-[var(--brand-teal)] to-[#0EA5B5] text-white"><Sparkles size={16} /></div>
            <div className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Marco</div>
          </div>
          <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Sign in</h2>
          <p className="text-sm text-[color:var(--text-3)] mt-1">Use your work account to access your role dashboard.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Email</label>
              <input
                data-testid="login-email-input"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-1)] border border-[color:var(--stroke)] px-3 text-sm text-[color:var(--text-1)] placeholder:text-[color:var(--text-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-xs text-[color:var(--text-2)]">Password</label>
              <input
                data-testid="login-password-input"
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="mt-1 w-full h-10 rounded-lg bg-[color:var(--bg-1)] border border-[color:var(--stroke)] px-3 text-sm text-[color:var(--text-1)] placeholder:text-[color:var(--text-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                placeholder="••••••••"
              />
            </div>
            <button
              data-testid="login-submit-button"
              disabled={busy}
              className="w-full h-10 rounded-lg font-medium bg-[color:var(--brand-teal)] hover:bg-[color:var(--brand-teal-hover)] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="animate-spin" size={14} />} Sign in
            </button>
          </form>

          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-3)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Demo accounts</div>
            <div className="grid grid-cols-1 gap-1.5">
              {SAMPLE_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  data-testid={`login-demo-${a.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  onClick={() => fill(a)}
                  className="text-left text-xs px-3 py-2 rounded-md bg-[color:var(--bg-2)] hover:bg-white/[0.04] border border-[color:var(--stroke)] transition-colors"
                >
                  <span className="text-[color:var(--text-1)] font-medium">{a.label}</span>
                  <span className="text-[color:var(--text-3)] ml-2">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
