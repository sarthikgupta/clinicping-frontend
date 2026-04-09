import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/api';
import { useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) navigate('/queue', { replace: true });
  }, [token]);

  return (
    <div style={S.page}>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navLogo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <rect width="28" height="28" rx="8" fill="#1D9E75"/>
            <path d="M14 6v16M7 10h14M8 14h12M10 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={S.logoText}>Clinic<span style={{ color: '#1D9E75' }}>Ping</span></span>
        </div>
        <div style={S.navActions}>
          <button style={S.navLogin} onClick={() => navigate('/login')}>Login</button>
          <button style={S.navSignup} onClick={() => navigate('/signup')}>Get started free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={S.hero}>
        <div style={S.heroContent}>
          <div style={S.heroBadge}>🇮🇳 Built for Indian clinics</div>
          <h1 style={S.heroTitle}>
            Smart queue &<br/>
            <span style={{ color: '#1D9E75' }}>WhatsApp follow-ups</span><br/>
            for your clinic
          </h1>
          <p style={S.heroSub}>
            Patients get their token on WhatsApp. Doctors write prescriptions digitally.
            Receptionists manage the queue in one tap. No app download needed.
          </p>
          <button style={S.ctaPrimary} onClick={() => navigate('/signup')}>
            Start free — 3 months no charge →
          </button>
          <div style={S.heroNote}>Setup takes 10 minutes · No credit card required</div>
        </div>

        {/* WhatsApp phone mockup */}
        <div style={S.heroVisual}>
          <div style={S.phoneMock}>
            <div style={S.phoneNotch} />
            <div style={S.phoneScreen}>
              <div style={S.waChatHeader}>
                <div style={S.waAvatar}>CP</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>ClinicPing</div>
                  <div style={{ fontSize: 11, color: '#9fecc3' }}>● Online</div>
                </div>
              </div>
              <div style={S.waChatBody}>
                <div style={S.waBubble}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>🏥 Token #7 assigned!</p>
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                    Gurpreet ji, aapka number <b>7</b> hai.<br/>
                    Wait: <b>~30 min</b><br/>
                    Dr. Anumeha Bhalla Clinic
                  </p>
                  <div style={S.waMsgTime}>9:32 AM ✓✓</div>
                </div>
                <div style={{ ...S.waBubble, background: '#dcf8c6', marginTop: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#333', lineHeight: 1.5 }}>
                    💊 <b>Prescription ready!</b><br/>
                    Amlodipine 5mg — Subah 1<br/>
                    Telma 40mg — Raat 1<br/>
                    <span style={{ color: '#1D9E75', fontWeight: 600 }}>Next: 16 April, 10 AM</span>
                  </p>
                  <div style={S.waMsgTime}>10:15 AM ✓✓</div>
                </div>
                <div style={{ ...S.waBubble, marginTop: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                    🔔 <b>Reminder</b><br/>
                    Kal appointment hai —<br/>
                    16 April 10:00 AM
                  </p>
                  <div style={S.waMsgTime}>15 Apr ✓✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Everything your clinic needs</h2>
        <p style={S.sectionSub}>One tool. Queue, prescriptions, follow-ups.</p>
        <div style={S.featureGrid}>
          {[
            { icon: '📱', title: 'WhatsApp tokens', desc: 'Patient gets token + wait time on WhatsApp instantly. No app download.' },
            { icon: '👨‍⚕️', title: 'Digital prescriptions', desc: 'Print or send prescription to patient\'s WhatsApp in one click.' },
            { icon: '🔔', title: 'Auto follow-ups', desc: 'Medicine reminders, lab alerts, appointment confirmations — automatic.' },
            { icon: '👥', title: 'Multiple doctors', desc: 'Separate queues per doctor. Receptionist assigns patients easily.' },
            { icon: '📊', title: 'Analytics', desc: 'Patients seen, busiest days, follow-up rates — at a glance.' },
            { icon: '⚡', title: '10-min setup', desc: 'Sign up and your first patient is in queue within minutes.' },
          ].map((f, i) => (
            <div key={i} style={S.featureCard}>
              <div style={S.featureIcon}>{f.icon}</div>
              <div style={S.featureTitle}>{f.title}</div>
              <div style={S.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ ...S.section, background: '#f7f7f5' }}>
        <h2 style={S.sectionTitle}>Simple pricing</h2>
        <p style={S.sectionSub}>3 months free. No hidden charges.</p>
        <div style={S.pricingGrid}>
          {[
            {
              name: 'Starter', price: '₹799', period: '/month',
              desc: '1 doctor · up to 100 patients/month',
              features: ['Queue management', 'WhatsApp tokens', 'Basic follow-ups', 'Prescription printing'],
              hl: false,
            },
            {
              name: 'Growth', price: '₹1,499', period: '/month',
              desc: '1 doctor · unlimited patients',
              features: ['Everything in Starter', 'Unlimited patients', 'All follow-up types', 'WhatsApp prescription slip', 'Analytics'],
              hl: true,
            },
            {
              name: 'Multi-doctor', price: '₹2,499', period: '/month',
              desc: 'Up to 5 doctors · unlimited patients',
              features: ['Everything in Growth', 'Up to 5 doctors', 'Per-doctor analytics', 'Staff management', 'Priority support'],
              hl: false,
            },
          ].map((plan, i) => (
            <div key={i} style={{ ...S.priceCard, ...(plan.hl ? S.priceCardHL : {}) }}>
              {plan.hl && <div style={S.popularBadge}>Most popular</div>}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: plan.hl ? 'rgba(255,255,255,0.7)' : '#888', marginBottom: 10 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: plan.hl ? '#fff' : '#1a1a1a' }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: plan.hl ? 'rgba(255,255,255,0.6)' : '#888' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 12, color: plan.hl ? 'rgba(255,255,255,0.7)' : '#888', marginBottom: 18 }}>{plan.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ fontSize: 13, color: plan.hl ? 'rgba(255,255,255,0.9)' : '#444', display: 'flex', gap: 7 }}>
                    <span style={{ color: plan.hl ? '#9fecc3' : '#1D9E75', fontWeight: 700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button style={{ ...S.planBtn, ...(plan.hl ? S.planBtnHL : {}) }} onClick={() => navigate('/signup')}>
                Start free trial
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
          All plans include 3 months free · Cancel anytime
        </div>
      </section>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
          Clinic<span style={{ color: '#1D9E75' }}>Ping</span>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Made with ❤️ for Indian clinics · Nabha, Punjab</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 13 }}>
          <span style={{ color: '#aaa', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
          <span style={{ color: '#aaa', cursor: 'pointer' }} onClick={() => navigate('/signup')}>Sign up</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 16 }}>© 2026 ClinicPing. All rights reserved.</div>
      </footer>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 40px', borderBottom: '1px solid rgba(0,0,0,0.07)', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', zIndex: 100 },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoText: { fontSize: 20, fontWeight: 800, color: '#1a1a1a' },
  navActions: { display: 'flex', gap: 10, alignItems: 'center' },
  navLogin: { padding: '8px 16px', background: 'none', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#555' },
  navSignup: { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' },
  hero: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, padding: '60px 40px 80px', maxWidth: 1100, margin: '0 auto', alignItems: 'center' },
  heroContent: {},
  heroBadge: { display: 'inline-block', background: '#E1F5EE', color: '#085041', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20, marginBottom: 20 },
  heroTitle: { fontSize: 42, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.18, letterSpacing: '-1px', margin: '0 0 18px' },
  heroSub: { fontSize: 16, color: '#666', lineHeight: 1.7, marginBottom: 28 },
  ctaPrimary: { padding: '14px 26px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'block' },
  heroNote: { marginTop: 12, fontSize: 12, color: '#aaa' },
  heroVisual: { display: 'flex', justifyContent: 'center' },
  phoneMock: { width: 240, background: '#111', borderRadius: 32, padding: '10px', boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)' },
  phoneNotch: { width: 70, height: 5, background: '#333', borderRadius: 10, margin: '0 auto 10px' },
  phoneScreen: { background: '#f0f2f5', borderRadius: 22, overflow: 'hidden' },
  waChatHeader: { background: '#075E54', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 },
  waAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 },
  waChatBody: { padding: '12px 10px' },
  waBubble: { background: '#fff', borderRadius: '0 10px 10px 10px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  waMsgTime: { fontSize: 9, color: '#aaa', textAlign: 'right', marginTop: 4 },
  section: { padding: '64px 40px', textAlign: 'center' },
  sectionTitle: { fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 8, letterSpacing: '-0.5px' },
  sectionSub: { fontSize: 15, color: '#888', marginBottom: 36 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 900, margin: '0 auto', textAlign: 'left' },
  featureCard: { background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid rgba(0,0,0,0.07)' },
  featureIcon: { fontSize: 24, marginBottom: 10 },
  featureTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 },
  featureDesc: { fontSize: 13, color: '#888', lineHeight: 1.6 },
  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 900, margin: '0 auto', textAlign: 'left' },
  priceCard: { background: '#fff', borderRadius: 14, padding: '24px', border: '1.5px solid rgba(0,0,0,0.08)', position: 'relative' },
  priceCardHL: { background: '#1D9E75', border: '1.5px solid #1D9E75' },
  popularBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
  planBtn: { width: '100%', padding: '11px', background: '#E1F5EE', color: '#085041', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  planBtnHL: { background: 'rgba(255,255,255,0.2)', color: '#fff' },
  footer: { background: '#111', padding: '40px', textAlign: 'center' },
};
