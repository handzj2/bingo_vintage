'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Bike, Loader2, Eye, EyeOff, Shield, TrendingUp,
  CheckCircle, ArrowRight, Lock, Users,
  Car, DollarSign, Hash, KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function Particle({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', animation: 'float 6s ease-in-out infinite', ...style }} />;
}

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cur = 0; const step = target / 60;
    const t = setInterval(() => { cur += step; if (cur >= target) { setN(target); clearInterval(t); } else setN(Math.floor(cur)); }, 24);
    return () => clearInterval(t);
  }, [target]);
  return <>{n.toLocaleString()}{suffix}</>;
}

function MotorcycleSVG() {
  return (
    <svg viewBox="0 0 280 160" style={{ width: '100%', maxWidth: 280, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>
      <circle cx="60" cy="118" r="32" fill="#1f2937" stroke="#374151" strokeWidth="3" /><circle cx="60" cy="118" r="20" fill="#374151" /><circle cx="60" cy="118" r="8" fill="#6b7280" />
      <circle cx="220" cy="118" r="32" fill="#1f2937" stroke="#374151" strokeWidth="3" /><circle cx="220" cy="118" r="20" fill="#374151" /><circle cx="220" cy="118" r="8" fill="#6b7280" />
      <path d="M60 118 L100 72 L160 62 L200 78 L220 118" fill="none" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" />
      <path d="M130 68 L100 72" fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <path d="M160 62 L140 42 L120 42" fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <ellipse cx="148" cy="72" rx="28" ry="14" fill="#2563eb" />
      <rect x="100" y="80" width="56" height="28" rx="6" fill="#374151" />
      <ellipse cx="152" cy="34" rx="11" ry="13" fill="#3b82f6" />
      <rect x="144" y="44" width="18" height="22" rx="4" fill="#1d4ed8" />
      <line x1="0" y1="150" x2="280" y2="150" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeDasharray="20,16" />
    </svg>
  );
}

function CashLoanSVG() {
  return (
    <svg viewBox="0 0 240 160" style={{ width: '100%', maxWidth: 240, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>
      <rect x="70" y="50" width="100" height="60" rx="8" fill="#10b981" /><rect x="65" y="45" width="100" height="60" rx="8" fill="#34d399" /><rect x="60" y="40" width="100" height="60" rx="8" fill="#6ee7b7" />
      <rect x="95" y="40" width="30" height="10" rx="3" fill="#f59e0b" /><rect x="95" y="70" width="30" height="10" rx="3" fill="#f59e0b" />
      <text x="110" y="85" fontSize="36" fill="#fff" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">$</text>
      <circle cx="180" cy="110" r="22" fill="#fbbf24" /><circle cx="170" cy="120" r="22" fill="#f59e0b" /><circle cx="160" cy="130" r="22" fill="#d97706" />
    </svg>
  );
}

function TukTukSVG() {
  return (
    <svg viewBox="0 0 240 160" style={{ width: '100%', maxWidth: 240, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>
      <path d="M20 110 L20 60 Q20 30 50 26 L170 26 Q200 26 210 50 L220 110 Z" fill="#f59e0b" />
      <path d="M20 70 L220 70 L220 110 L20 110 Z" fill="#d97706" />
      <path d="M60 30 L60 60 L180 60 L180 30 Q170 26 150 26 L90 26 Q70 26 60 30 Z" fill="#bfdbfe" opacity="0.7" />
      <circle cx="55" cy="118" r="24" fill="#1f2937" /><circle cx="55" cy="118" r="14" fill="#374151" /><circle cx="55" cy="118" r="6" fill="#6b7280" />
      <circle cx="185" cy="118" r="24" fill="#1f2937" /><circle cx="185" cy="118" r="14" fill="#374151" /><circle cx="185" cy="118" r="6" fill="#6b7280" />
    </svg>
  );
}

/* ── 6-box OTP input ─────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleChange = (idx: number, ch: string) => {
    const d = ch.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const arr = (value + '      ').slice(0, 6).split('');
    arr[idx] = d;
    onChange(arr.join('').replace(/ /g, '').slice(0, 6));
    if (idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, idx) + value.slice(idx + 1));
      if (idx > 0) refs.current[idx - 1]?.focus();
    }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { onChange(p); refs.current[Math.min(p.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          style={{ width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800, border: `2px solid ${d.trim() ? '#2563eb' : '#e5e7eb'}`, borderRadius: 10, background: d.trim() ? '#eff6ff' : '#f9fafb', color: '#111827', outline: 'none', transition: 'all 0.15s' }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }} />
      ))}
    </div>
  );
}

/* ── main ───────────────────────────────────────────────────── */
function LoginPageInner() {
  const [creds, setCreds]         = useState({ username: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [tab, setTab]             = useState<'password' | 'otp'>('password');
  const [otpEmail, setOtpEmail]   = useState('');
  const [otpCode, setOtpCode]     = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError]   = useState('');
  const [vehicle, setVehicle]     = useState(0);
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const pwChanged = searchParams.get('passwordChanged') === '1';

  useEffect(() => { const t = setInterval(() => setVehicle(v => (v + 1) % 3), 4000); return () => clearInterval(t); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await login(creds); toast.success('Welcome back!'); }
    catch (err: any) { toast.error(err.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) return setOtpError('Please enter your email address');
    if (otpCode.length !== 6) return setOtpError('Please enter all 6 digits');
    setOtpError(''); setOtpLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail.trim(), otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP verification failed');
      // ✅ Backend returns { action: "RESET_PASSWORD", reset_token } — NOT a JWT
      // NOTE: SnakeCaseInterceptor converts resetToken → reset_token in all responses
      const resetToken = data.reset_token || data.resetToken;
      if (data.action === 'RESET_PASSWORD' && resetToken) {
        toast.success('OTP verified! Set your new password.');
        window.location.href = `/auth/set-new-password?token=${encodeURIComponent(resetToken)}`;
      } else {
        throw new Error('Unexpected server response. Please try again.');
      }
    } catch (err: any) { setOtpError(err.message || 'Verification failed'); }
    finally { setOtpLoading(false); }
  };

  const stats = [{ value: 500, suffix: '+', label: 'Active Loans' }, { value: 98, suffix: '%', label: 'Repayment Rate' }, { value: 24, suffix: 'h', label: 'Approval Time' }, { value: 10, suffix: 'K+', label: 'Clients Served' }];
  const steps = [{ icon: CheckCircle, label: 'Apply' }, { icon: Shield, label: 'Approve' }, { icon: DollarSign, label: 'Disburse' }, { icon: TrendingUp, label: 'Grow' }];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc' }}>

      {/* ══ LEFT PANEL ════════════════════════════════════════ */}
      <div className="left-panel" style={{ width: '54%', background: 'linear-gradient(160deg,#1e3a8a 0%,#2563eb 55%,#3b82f6 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 52px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -180, right: -180 }} />
          <Particle style={{ width: 10, height: 10, top: '15%', left: '10%' }} /><Particle style={{ width: 6, height: 6, top: '30%', right: '12%', animationDelay: '1.5s' }} />
          <Particle style={{ width: 8, height: 8, bottom: '25%', left: '20%', animationDelay: '3s' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, position: 'relative' }}>
          <div style={{ width: 46, height: 46, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={24} color="#fff" /></div>
          <div><div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>BINGO VINTAGE</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>Finance Platform</div></div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac', boxShadow: '0 0 6px #86efac', animation: 'blink 2s ease infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>Asset Financing & Loan Management</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,3vw,42px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 12 }}>Powering Uganda's<br /><span style={{ color: '#bfdbfe' }}>Riders & Traders</span></h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 360 }}>Complete loan management for motorcycles, tuk-tuks, and cash lending.</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '28px 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[{ icon: Bike, label: 'Boda Loans' }, { icon: DollarSign, label: 'Cash Loans' }, { icon: Car, label: 'Tuk-Tuk Loans' }].map(({ icon: Icon, label }, i) => (
              <button key={i} onClick={() => setVehicle(i)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: vehicle === i ? '#fff' : 'rgba(255,255,255,0.1)', color: vehicle === i ? '#1d4ed8' : 'rgba(255,255,255,0.7)' }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
            {vehicle === 0 ? <MotorcycleSVG /> : vehicle === 1 ? <CashLoanSVG /> : <TukTukSVG />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {(vehicle === 0 ? [{ lbl: 'Weekly From', amt: 'UGX 70K' }, { lbl: 'Term', amt: '12–52 wks' }, { lbl: 'Approval', amt: '24 hours' }]
              : vehicle === 1 ? [{ lbl: 'Amount From', amt: 'UGX 100K' }, { lbl: 'Term', amt: '1–6 months' }, { lbl: 'Approval', amt: 'Same day' }]
              : [{ lbl: 'Monthly From', amt: 'UGX 150K' }, { lbl: 'Term', amt: '6–18 mo' }, { lbl: 'Approval', amt: '24 hours' }]
            ).map((item, idx) => (
              <div key={idx} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 6px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{item.amt}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px' }}>
          {steps.map(({ icon: Icon, label }, i) => (
            <React.Fragment key={label}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}><Icon size={17} color="#fff" /></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{label}</div>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 8px', marginBottom: 16 }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}><Counter target={s.value} suffix={s.suffix} /></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ═══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={20} color="#fff" /></div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>BINGO <span style={{ color: '#2563eb' }}>VINTAGE</span></span>
          </div>

          <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* card header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '26px 32px 0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', marginBottom: 18 }}>
                <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tab === 'otp' ? <Hash size={18} color="#fff" /> : <Lock size={18} color="#fff" />}
                </div>
                <div>
                  <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>Staff Portal</h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>{tab === 'otp' ? 'Enter your admin-issued OTP' : 'Sign in to your dashboard'}</p>
                </div>
              </div>
              {/* tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: '10px 10px 0 0', padding: '4px 4px 0' }}>
                {([['password', Lock, 'Password Login'], ['otp', Hash, 'OTP Verification']] as const).map(([id, Icon, label]) => (
                  <button key={id} onClick={() => setTab(id as any)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#1d4ed8' : 'rgba(255,255,255,0.65)' }}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* form body */}
            <div style={{ padding: '24px 32px 32px' }}>
              {pwChanged && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <div><p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: 0 }}>Password changed!</p><p style={{ fontSize: 12, color: '#166534', margin: '2px 0 0' }}>Please sign in with your new password.</p></div>
                </div>
              )}

              {/* ── PASSWORD FORM ──────────────────────────────── */}
              {tab === 'password' && (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Username</label>
                    <input type="text" required autoComplete="username" placeholder="Enter your username" value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Password</label>
                      <Link href="/auth/login/reset-password" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</Link>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input type={showPass ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })}
                        style={{ width: '100%', padding: '12px 44px 12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                        onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }} />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                    <input type="checkbox" id="rem" style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }} />
                    <label htmlFor="rem" style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>Stay signed in</label>
                  </div>
                  <button type="submit" disabled={loading}
                    style={{ width: '100%', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)' }}>
                    {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Signing in...</> : <>Access Dashboard <ArrowRight size={16} /></>}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#6b7280' }}>
                    Have an OTP?{' '}<button type="button" onClick={() => setTab('otp')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Use it here</button>
                  </p>
                </form>
              )}

              {/* ── OTP FORM ───────────────────────────────────── */}
              {tab === 'otp' && (
                <form onSubmit={handleOtp}>
                  <div style={{ marginBottom: 18, padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, display: 'flex', gap: 10 }}>
                    <KeyRound size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', margin: 0 }}>Admin OTP Verification</p>
                      <p style={{ fontSize: 11, color: '#3b82f6', margin: '3px 0 0', lineHeight: 1.5 }}>Enter the 6-digit code your admin shared with you. OTP expires after 10 minutes.</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Your Email Address</label>
                    <input type="email" required placeholder="you@example.com" value={otpEmail} onChange={e => { setOtpEmail(e.target.value); setOtpError(''); }}
                      style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textAlign: 'center' }}>6-Digit OTP</label>
                    <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError(''); }} />
                    <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 8 }}>OTP expires 10 minutes after admin approval</p>
                  </div>

                  {otpError && (
                    <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{otpError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={otpLoading || otpCode.length !== 6}
                    style={{ width: '100%', background: (otpLoading || otpCode.length !== 6) ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: (otpLoading || otpCode.length !== 6) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (otpLoading || otpCode.length !== 6) ? 'none' : '0 4px 16px rgba(37,99,235,0.35)' }}>
                    {otpLoading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Verifying...</> : <><Shield size={16} />Verify OTP &amp; Continue</>}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#6b7280' }}>
                    Know your password?{' '}<button type="button" onClick={() => setTab('password')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Sign in normally</button>
                  </p>
                </form>
              )}

              {tab === 'password' && (
                <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><Users size={13} color="#6b7280" /><span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>System Roles</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { role: 'Admin', desc: 'Full system access', color: '#eff6ff', tc: '#1d4ed8', dot: '#2563eb' },
                      { role: 'Manager', desc: 'Approve & oversee', color: '#f0fdf4', tc: '#15803d', dot: '#16a34a' },
                      { role: 'Cashier', desc: 'Record payments', color: '#fff7ed', tc: '#c2410c', dot: '#ea580c' },
                      { role: 'Agent', desc: 'Client onboarding', color: '#fdf4ff', tc: '#7e22ce', dot: '#9333ea' },
                    ].map(({ role, desc, color, tc, dot }) => (
                      <div key={role} style={{ background: color, borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        <div><div style={{ fontSize: 12, fontWeight: 800, color: tc }}>{role}</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{desc}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Secured with 256-bit SSL encryption</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>© {new Date().getFullYear()} Bingo Vintage Ltd · <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</a> · <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</a></p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Need access? Contact your system administrator</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @media (max-width: 1023px) { .left-panel { display: none !important; } .mobile-logo { display: flex !important; } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageInner /></Suspense>;
}
