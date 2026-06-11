'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bike, TrendingUp, Shield, Clock, Users, Star, Menu, X,
  ArrowRight, CheckCircle2, MapPin, Phone, Mail, ChevronDown,
  Zap, Award, BarChart3, Lock, RefreshCw, HeartHandshake,
  MoveRight, PlayCircle, DollarSign, Wallet,
} from 'lucide-react';

/* ── scroll reveal ──────────────────────────────────────────── */
function useInView(ref: React.RefObject<Element>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null!);
  const vis = useInView(ref);
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── animated counter ───────────────────────────────────────── */
function Counter({ target, suffix = '', prefix = '', active }: { target: number; suffix?: string; prefix?: string; active: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cur = 0; const step = target / 80;
    const t = setInterval(() => { cur += step; if (cur >= target) { setN(target); clearInterval(t); } else setN(Math.floor(cur)); }, 20);
    return () => clearInterval(t);
  }, [active, target]);
  return <>{prefix}{n.toLocaleString()}{suffix}</>;
}

/* ── NAV ────────────────────────────────────────────────────── */
function Nav({ onLogin }: { onLogin: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid #e5e7eb' : 'none', transition: 'all 0.3s ease', boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.06)' : 'none' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            <Bike size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, color: scrolled ? '#111827' : '#fff', letterSpacing: '-0.5px' }}>
            Bingo <span style={{ color: '#2563eb' }}>Vintage</span>
          </span>
        </div>

        {/* Desktop */}
        <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Features','Products','Process','Testimonials','Contact'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{ color: scrolled ? '#6b7280' : 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#2563eb')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = scrolled ? '#6b7280' : 'rgba(255,255,255,0.85)')}
            >{l}</a>
          ))}
        </div>
        <div className="dsk" style={{ display: 'flex', gap: 10 }}>
          <button onClick={onLogin} style={{ background: 'none', border: `1px solid ${scrolled ? '#d1d5db' : 'rgba(255,255,255,0.3)'}`, color: scrolled ? '#374151' : '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Sign In</button>
          <button onClick={onLogin} style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', transition: 'all 0.2s' }}>Get Started →</button>
        </div>

        <button className="mob" onClick={() => setOpen(!open)} style={{ display: 'none', background: 'none', border: 'none', color: scrolled ? '#111' : '#fff', cursor: 'pointer', padding: 4 }}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div style={{ background: '#fff', borderTop: '1px solid #f3f4f6', padding: '12px 24px 20px' }}>
          {['Features','Products','Process','Testimonials','Contact'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} style={{ display: 'block', padding: '11px 0', color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f9fafb', fontSize: 15, fontWeight: 500 }}>{l}</a>
          ))}
          <button onClick={onLogin} style={{ marginTop: 14, width: '100%', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Get Started →</button>
        </div>
      )}

      <style>{`.dsk{display:flex!important}.mob{display:none!important}@media(max-width:768px){.dsk{display:none!important}.mob{display:block!important}}`}</style>
    </nav>
  );
}

/* ── HERO ───────────────────────────────────────────────────── */
function Hero({ onLogin }: { onLogin: () => void }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 45%,#3b82f6 100%)', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 68 }}>
      {/* BG shapes */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -200, right: -200 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -100, left: -100 }} />
        {/* Dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          <defs><pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#fff" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
        {/* Left */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '7px 16px', marginBottom: 28, opacity: loaded ? 1 : 0, transition: 'opacity 0.7s ease' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#86efac', boxShadow: '0 0 8px #86efac' }} />
            <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: 600, letterSpacing: '0.3px' }}>Trusted by 10,000+ riders across Uganda</span>
          </div>

          <h1 style={{ fontSize: 'clamp(40px,5.5vw,68px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 22, letterSpacing: '-1.5px', opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(24px)', transition: 'all 0.75s ease 0.1s' }}>
            Finance Your<br />
            <span style={{ color: '#bfdbfe' }}>Dream Ride</span><br />
            Today
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 36, maxWidth: 460, opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.75s ease 0.2s' }}>
            Fast motorcycle &amp; cash loans with flexible weekly repayments. Approval within 24 hours — no bureaucracy, no hidden fees.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', opacity: loaded ? 1 : 0, transition: 'opacity 0.75s ease 0.35s' }}>
            <button onClick={onLogin}
              style={{ background: '#fff', border: 'none', color: '#1d4ed8', padding: '15px 32px', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', transition: 'transform 0.2s,box-shadow 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}>
              Apply for a Loan <ArrowRight size={18} />
            </button>
            <button onClick={onLogin}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '15px 28px', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)')}>
              <PlayCircle size={18} /> See How It Works
            </button>
          </div>

          {/* Trust pills */}
          <div style={{ display: 'flex', gap: 20, marginTop: 36, flexWrap: 'wrap', opacity: loaded ? 1 : 0, transition: 'opacity 0.75s ease 0.5s' }}>
            {[{ icon: Shield, t: 'Secure & Licensed' }, { icon: Zap, t: '24h Approval' }, { icon: Lock, t: 'No Hidden Fees' }].map(({ icon: Icon, t }) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500 }}>
                <Icon size={14} color="rgba(255,255,255,0.8)" /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — floating card */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateX(30px)', transition: 'all 0.85s ease 0.3s' }} className="hero-card">
          <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 20 }}>Quick Loan Calculator</p>
            {/* Fake calculator card */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>LOAN AMOUNT</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#111827', letterSpacing: '-1px' }}>UGX 500,000</p>
              <div style={{ height: 6, background: '#eff6ff', borderRadius: 3, marginTop: 12, marginBottom: 4, overflow: 'hidden' }}>
                <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: 3 }} />
              </div>
            </div>
            {[
              { label: 'Weekly Repayment', value: 'UGX 12,500', color: '#2563eb' },
              { label: 'Loan Term', value: '52 weeks', color: '#059669' },
              { label: 'Interest Rate', value: '12% p.a.', color: '#7c3aed' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{r.label}</span>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{r.value}</span>
              </div>
            ))}
            <button onClick={onLogin} style={{ marginTop: 20, width: '100%', background: '#fff', border: 'none', color: '#1d4ed8', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              Apply Now →
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite', opacity: 0.5 }}>
        <ChevronDown size={22} color="#fff" />
      </div>
      <style>{`
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}
        @media(max-width:768px){.hero-grid{grid-template-columns:1fr!important}.hero-card{display:none!important}}
      `}</style>
    </section>
  );
}

/* ── STATS ──────────────────────────────────────────────────── */
function Stats() {
  const ref = useRef<HTMLDivElement>(null!);
  const vis = useInView(ref);
  const items = [
    { v: 10000, s: '+', p: '', l: 'Loans Approved' },
    { v: 98,    s: '%', p: '', l: 'Satisfaction Rate' },
    { v: 24,    s: 'h', p: '', l: 'Avg. Approval Time' },
    { v: 5,     s: 'B+', p: 'UGX ', l: 'Total Disbursed' },
  ];
  return (
    <div ref={ref} style={{ background: '#1e3a8a', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 24, textAlign: 'center' }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: '16px 8px' }}>
            <div style={{ fontSize: 'clamp(34px,4vw,48px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
              <Counter target={it.v} suffix={it.s} prefix={it.p} active={vis} />
            </div>
            <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FEATURES ───────────────────────────────────────────────── */
function Features() {
  const feats = [
    { icon: Zap,           title: 'Lightning Fast Approval',  desc: 'Submit your application and receive a decision within 24 hours. Streamlined process, zero waiting.',        color: '#dbeafe', ic: '#2563eb' },
    { icon: Shield,        title: 'Bank-Grade Security',      desc: 'Your personal and financial data is encrypted end-to-end. We follow the highest standards in Uganda.',       color: '#dcfce7', ic: '#16a34a' },
    { icon: RefreshCw,     title: 'Flexible Repayment',       desc: 'Choose weekly or monthly schedules that match your income cycle. Adjust terms without penalty fees.',         color: '#ede9fe', ic: '#7c3aed' },
    { icon: Award,         title: 'Transparent Pricing',      desc: 'No hidden charges, no surprises. Every fee is disclosed upfront so you always know exactly what you owe.',    color: '#fff7ed', ic: '#ea580c' },
    { icon: HeartHandshake, title: 'Dedicated Support',       desc: 'Your personal loan officer is available 6 days a week to assist with payments, queries and adjustments.',     color: '#fce7f3', ic: '#db2777' },
    { icon: BarChart3,     title: 'Track Your Progress',      desc: 'Real-time dashboard shows your balance, payment history, and next due date — accessible from your phone.',    color: '#f0fdf4', ic: '#059669' },
  ];
  return (
    <section id="features" style={{ background: '#f8fafc', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>Why Choose Us</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#111827', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 14 }}>Built for Riders,<br />Engineered for Trust</h2>
            <p style={{ color: '#6b7280', fontSize: 17, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Every feature is designed around the real needs of Uganda's transport entrepreneurs.</p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          {feats.map((f, i) => (
            <Reveal key={i} delay={i * 70}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #f1f5f9', transition: 'all 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.09)'; el.style.borderColor = '#e0e7ff'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.borderColor = '#f1f5f9'; }}>
                <div style={{ width: 48, height: 48, background: f.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <f.icon size={22} color={f.ic} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 9 }}>{f.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PRODUCTS ───────────────────────────────────────────────── */
function Products({ onLogin }: { onLogin: () => void }) {
  const products = [
    { tag: 'MOST POPULAR', title: 'Motorcycle Loan', sub: 'Boda Boda & Cargo', price: 'UGX 70,000', period: '/week', badge: 'bg-blue', features: ['Boxer, Bajaj & TVS models', 'Comprehensive insurance cover', 'Free maintenance (first 3 months)', 'Weekly or monthly repayments', '12–52 week flexible terms'], cta: 'Apply for Bike Loan', primary: true },
    { tag: 'QUICK CASH',   title: 'Cash Loan',       sub: 'Business & Personal', price: 'UGX 50,000', period: '/month', features: ['No collateral required', 'Same-day disbursement', 'Amounts from UGX 100K–5M', 'Flexible 1–6 month terms', 'Auto-renew on full repayment'], cta: 'Apply for Cash Loan', primary: false },
    { tag: 'HEAVY LOAD',   title: 'Cargo / Tuk-Tuk', sub: 'Commercial Transport', price: 'UGX 150,000', period: '/month', features: ['New & quality-used tuk-tuks', 'Commercial permit assistance', 'Spare parts warranty (6 months)', 'Guaranteed buyback option', '6–18 month repayment'], cta: 'Apply for Tuk-Tuk Loan', primary: false },
  ];
  return (
    <section id="products" style={{ background: '#fff', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>Loan Products</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#111827', letterSpacing: '-1px', lineHeight: 1.1 }}>Choose the Plan<br />That Fits Your Ride</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          {products.map((p, i) => (
            <Reveal key={i} delay={i * 90}>
              <div style={{ background: p.primary ? 'linear-gradient(160deg,#1e3a8a,#2563eb)' : '#fff', border: p.primary ? 'none' : '1px solid #e5e7eb', borderRadius: 20, padding: '32px 28px', boxShadow: p.primary ? '0 20px 48px rgba(37,99,235,0.3)' : '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.25s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-5px)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}>
                {p.primary && <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />}
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', color: p.primary ? '#bfdbfe' : '#2563eb', background: p.primary ? 'rgba(255,255,255,0.12)' : '#eff6ff', padding: '4px 10px', borderRadius: 4, display: 'inline-block', marginBottom: 16 }}>{p.tag}</span>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: p.primary ? '#fff' : '#111827', letterSpacing: '-0.5px', marginBottom: 4 }}>{p.title}</h3>
                <p style={{ color: p.primary ? 'rgba(255,255,255,0.6)' : '#9ca3af', fontSize: 13, marginBottom: 20 }}>{p.sub}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 12, color: p.primary ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>From</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: p.primary ? '#fff' : '#2563eb', letterSpacing: '-0.5px' }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: p.primary ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{p.period}</span>
                </div>
                <div style={{ borderTop: `1px solid ${p.primary ? 'rgba(255,255,255,0.12)' : '#f1f5f9'}`, paddingTop: 20, marginBottom: 24 }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <CheckCircle2 size={15} color={p.primary ? '#86efac' : '#16a34a'} />
                      <span style={{ color: p.primary ? 'rgba(255,255,255,0.75)' : '#374151', fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onLogin} style={{ width: '100%', background: p.primary ? '#fff' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: p.primary ? '#1d4ed8' : '#fff', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.9')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
                  {p.cta}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PROCESS ────────────────────────────────────────────────── */
function Process({ onLogin }: { onLogin: () => void }) {
  const steps = [
    { n: '01', title: 'Submit Application', desc: 'Fill out our simple form online or visit our office in Mbale. Takes less than 10 minutes.' },
    { n: '02', title: 'Document Review',    desc: 'Our team verifies your ID, residence, and guarantors. We contact you within 4 hours.' },
    { n: '03', title: 'Loan Approval',      desc: 'Receive your decision within 24 hours. Terms and repayment schedule shared via SMS.' },
    { n: '04', title: 'Get Your Ride',      desc: 'Sign the agreement, collect your motorcycle or cash. Start earning the same day.' },
  ];
  return (
    <section id="process" style={{ background: '#f8fafc', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>How It Works</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#111827', letterSpacing: '-1px', lineHeight: 1.1 }}>Four Steps to<br />Your New Motorcycle</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 32 }}>
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 100}>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: '#eff6ff', lineHeight: 1, marginBottom: 12, letterSpacing: '-2px' }}>{s.n}</div>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', border: '3px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2563eb' }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={400}>
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <button onClick={onLogin} style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', padding: '16px 40px', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
              Start Your Application <MoveRight size={18} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── TESTIMONIALS ───────────────────────────────────────────── */
function Testimonials() {
  const [active, setActive] = useState(0);
  const testimonials = [
    { i: 'JK', name: 'John Kamau',    role: 'Boda Boda Rider · Mbale',         text: 'Before Bingo Vintage I was renting a bike at 25K per day. Now I own my Boxer and clear 90K profit daily. Within 8 months I am almost fully repaid.' },
    { i: 'SR', name: 'Sarah Atieno',  role: 'Delivery Partner · Tororo',        text: 'The flexible weekly schedule matched perfectly with my income. When I had a slow month they adjusted without any penalty. Incredible support.' },
    { i: 'MM', name: 'Moses Mwangi',  role: 'Cargo Tuk-Tuk Operator · Iganga', text: 'From walking into the office to picking up my tuk-tuk took only 3 days. I now run two routes and earn more in a week than I used to in a month.' },
    { i: 'AG', name: 'Agnes Nabirye', role: 'Cash Loan Client · Jinja',         text: 'I needed 500K quickly for shop stock. The cash loan was approved same day and I got the money via mobile money by evening. Life-changing speed.' },
  ];
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, []);
  const t = testimonials[active];
  return (
    <section id="testimonials" style={{ background: '#fff', padding: '100px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>Testimonials</span>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#111827', letterSpacing: '-1px', marginBottom: 56 }}>Real Stories from Real Riders</h2>
        </Reveal>
        <div key={active} style={{ animation: 'fadeUp 0.5s ease', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 24, padding: 'clamp(28px,5vw,48px)' }}>
          <div style={{ display: 'flex', gap: 1, justifyContent: 'center', marginBottom: 24 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={18} color="#f59e0b" fill="#f59e0b" />)}
          </div>
          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: '#374151', lineHeight: 1.7, marginBottom: 28, fontStyle: 'italic' }}>"{t.text}"</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>{t.i}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, color: '#111827' }}>{t.name}</div>
              <div style={{ color: '#9ca3af', fontSize: 13 }}>{t.role}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? '#2563eb' : '#e5e7eb', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} />
          ))}
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────────────── */
function CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section style={{ background: '#f8fafc', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%)', borderRadius: 24, padding: 'clamp(40px,6vw,72px)', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 60px rgba(37,99,235,0.3)' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 16, position: 'relative' }}>Ready to Get Started?</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>Join thousands of riders who have transformed their lives with our affordable loans.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <button onClick={onLogin} style={{ background: '#fff', border: 'none', color: '#1d4ed8', padding: '15px 36px', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                Apply for a Loan <ArrowRight size={18} />
              </button>
              <button onClick={onLogin} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '15px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                Sign In to Dashboard
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FOOTER ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer id="contact" style={{ background: '#111827', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Bingo <span style={{ color: '#60a5fa' }}>Vintage</span></span>
            </div>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.8, maxWidth: 240 }}>Empowering Uganda's riders with fast, affordable vehicle financing since 2020.</p>
          </div>
          <div>
            <h4 style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 18 }}>Products</h4>
            {['Motorcycle Loan', 'Cash Loan', 'Tuk-Tuk Loan', 'Fleet Financing'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#products" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#60a5fa')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 18 }}>Company</h4>
            {['About Us', 'How It Works', 'FAQs', 'Careers'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#60a5fa')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 18 }}>Contact</h4>
            {[{ icon: MapPin, text: 'Mbale, Eastern Uganda' }, { icon: Phone, text: '+256 781 909 507' }, { icon: Mail, text: 'info@bingovintage.com' }].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#6b7280', fontSize: 14 }}>
                <Icon size={14} color="#60a5fa" />{text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: '#4b5563', fontSize: 13 }}>© 2026 Bingo Vintage Ltd. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Service'].map(l => (
              <a key={l} href="#" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#4b5563')}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── ROOT ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const login = () => router.push('/auth/login');
  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <Nav onLogin={login} />
      <Hero onLogin={login} />
      <Stats />
      <Features />
      <Products onLogin={login} />
      <Process onLogin={login} />
      <Testimonials />
      <CTA onLogin={login} />
      <Footer />
    </div>
  );
}
