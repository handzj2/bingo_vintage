'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, ArrowLeft, Send, CheckCircle, Clock, ShieldAlert, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Step = 'form' | 'submitted';

export default function ResetPasswordPage() {
  const [step, setStep]     = useState<Step>('form');
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address');
    setError('');
    setLoading(true);
    try {
      // Calls the NEW /auth/request-reset endpoint (not the old /auth/password-reset/request)
      const res = await fetch(`${API}/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setStep('submitted');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>Bingo <span style={{ color: '#2563eb' }}>Vintage</span></span>
        </div>

        {step === 'form' && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '24px 32px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Password Reset Request</h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0, marginTop: 3 }}>Submit your request — an admin will issue you a one-time OTP</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '28px 32px 32px' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>How this works</p>
                {[
                  '1. Submit your email address below',
                  '2. Admin reviews your request in Settings',
                  '3. Admin approves and gets a 6-digit OTP',
                  '4. Admin gives you the OTP in person or by phone',
                  '5. Use the OTP tab on the login page',
                  '6. Set your new permanent password',
                ].map(s => (
                  <p key={s} style={{ fontSize: 12, color: '#3730a3', margin: '3px 0', lineHeight: 1.5 }}>{s}</p>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Your Email Address</label>
                  <input
                    type="email" required autoFocus
                    placeholder="e.g. john@bingovintage.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', boxSizing: 'border-box', transition: 'all 0.2s' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
                  {loading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={16} /> Submit Reset Request</>}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button onClick={() => router.push('/auth/login')}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'submitted' && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '48px 40px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={34} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 10 }}>Request Submitted!</h2>
            <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
              Your request has been sent. Once the admin approves it, they will share a 6-digit OTP with you via phone or in person.
            </p>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
              <Clock size={17} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                <strong>Next step:</strong> Once you receive the OTP, go back to the login page and click the <strong>"OTP Verification"</strong> tab to enter it. The OTP is valid for 10 minutes.
              </p>
            </div>
            <button onClick={() => router.push('/auth/login')}
              style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <ArrowLeft size={15} /> Back to Login
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
          Need urgent help? Contact <strong style={{ color: '#6b7280' }}>+256 781 909 507</strong>
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
