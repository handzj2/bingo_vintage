'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function PasswordRule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
      {ok ? <CheckCircle size={13} color="#16a34a" /> : <X size={13} color="#d1d5db" />}
      <span style={{ fontSize: 12, color: ok ? '#15803d' : '#9ca3af', fontWeight: ok ? 600 : 400 }}>{text}</span>
    </div>
  );
}

function SetNewPasswordInner() {
  const [newPass, setNewPass]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, clearMustChangePassword } = useAuth();

  // resetToken from the OTP flow (?token=uuid)
  const resetToken = searchParams.get('token');

  // If no resetToken and no JWT, redirect to login
  useEffect(() => {
    const jwtToken = localStorage.getItem('access_token');
    if (!resetToken && !jwtToken) {
      router.replace('/auth/login');
    }
  }, [resetToken, router]);

  const r = {
    length:  newPass.length >= 8,
    upper:   /[A-Z]/.test(newPass),
    lower:   /[a-z]/.test(newPass),
    digit:   /[0-9]/.test(newPass),
    match:   newPass.length > 0 && newPass === confirm,
  };
  const allGood = r.length && r.upper && r.lower && r.digit && r.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allGood) return;
    setError(''); setLoading(true);
    try {
      if (resetToken) {
        // ── NEW FLOW: OTP-based, uses resetToken ────────────────
        // POST /auth/set-new-password (no JWT required)
        const res = await fetch(`${API}/auth/set-new-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: newPass }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to set password');
        setDone(true);
        // Clear all local auth state
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setTimeout(() => { window.location.href = '/auth/login?passwordChanged=1'; }, 2000);
      } else {
        // ── LEGACY FLOW: OTP login-based, uses JWT ──────────────
        // POST /auth/password-reset/set-new (requires Bearer JWT)
        const jwtToken = localStorage.getItem('access_token');
        const res = await fetch(`${API}/auth/password-reset/set-new-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
          body: JSON.stringify({ newPassword: newPass }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to set password');
        // Update auth context
        if (clearMustChangePassword) clearMustChangePassword();
        setDone(true);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setTimeout(() => { window.location.href = '/auth/login?passwordChanged=1'; }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>Bingo <span style={{ color: '#2563eb' }}>Vintage</span></span>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '24px 32px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Set New Password</h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0, marginTop: 3 }}>
                  {resetToken ? 'OTP verified — choose your new permanent password' : 'Create a strong new password'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 32px 32px' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 60, height: 60, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle size={30} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Password Updated!</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Redirecting you to login...</p>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <Loader2 size={20} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {resetToken && (
                  <div style={{ marginBottom: 20, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>OTP verified successfully. Set your new password below.</span>
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNew ? 'text' : 'password'} required placeholder="Minimum 8 characters" value={newPass} onChange={e => setNewPass(e.target.value)}
                      style={{ width: '100%', padding: '12px 44px 12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }} />
                    <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConf ? 'text' : 'password'} required placeholder="Repeat your new password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      style={{ width: '100%', padding: '12px 44px 12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }} />
                    <button type="button" onClick={() => setShowConf(!showConf)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showConf ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* password rules */}
                <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 10, padding: '12px 14px', marginBottom: 22 }}>
                  <PasswordRule ok={r.length} text="At least 8 characters" />
                  <PasswordRule ok={r.upper}  text="One uppercase letter" />
                  <PasswordRule ok={r.lower}  text="One lowercase letter" />
                  <PasswordRule ok={r.digit}  text="One number" />
                  <PasswordRule ok={r.match}  text="Passwords match" />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={!allGood || loading}
                  style={{ width: '100%', background: (!allGood || loading) ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: (!allGood || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (!allGood || loading) ? 'none' : '0 4px 16px rgba(37,99,235,0.3)' }}>
                  {loading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><ShieldCheck size={16} />Set New Password</>}
                </button>
              </form>
            )}
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>© {new Date().getFullYear()} Bingo Vintage Ltd</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function SetNewPasswordPage() {
  return <Suspense fallback={null}><SetNewPasswordInner /></Suspense>;
}
