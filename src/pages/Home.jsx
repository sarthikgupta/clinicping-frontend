import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const [mobile, setMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (token) navigate('/queue');
  }, [token]);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 5%', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, background: '#fff', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700 }}>
          <LogoMark />
          Clinic<span style={{ color: '#1D9E75' }}>Ping</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 16px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#444' }} onClick={() => navigate('/login')}>
            Login
          </button>
          <button style={{ padding: '8px 16px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/signup')}>
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'center', gap: mobile ? 32 : 60, padding: mobile ? '40px 5% 32px' : '70px 5% 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ flex: '1 1 400px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E1F5EE', color: '#085041', fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, marginBottom: 20 }}>
            🇮🇳 Built for Indian clinics
          </div>
          <h1 style={{ fontSize: mobile ? 36 : 48, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Smart queue &amp;<br /><span style={{ color: '#1D9E75' }}>WhatsApp follow-ups</span>
          </h1>
          <p style={{ fontSize: mobile ? 15 : 17, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
            Token system + WhatsApp alerts + digital prescriptions.<br />
            Set up in 10 minutes. No app for patients.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <button style={{ padding: '12px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/signup')}>
              Start free — no credit card
            </button>
            <button style={{ padding: '12px 20px', background: '#fff', color: '#444', border: '1.5px solid #e0e0e0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }} onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>Free for 3 months · Works on any device · Hindi WhatsApp messages</div>
        </div>

        {/* Mock card — hide on small mobile */}
        {!mobile && (
          <div style={{ flex: '0 0 300px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid #f0f0ee', background: '#fafaf8' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#085041' }}>Live queue</span>
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>9 Apr</span>
            </div>
            {[
              { num: 7, name: 'Gurpreet Kaur', label: 'In consultation', consulting: true },
              { num: 8, name: 'Rajveer Singh', label: '~10 min', consulting: false },
              { num: 9, name: 'Simran Bedi', label: '~20 min', consulting: false },
            ].map(p => (
              <div key={p.num} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f5f5f3', background: p.consulting ? '#f8fffe' : '#fff' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.consulting ? '#1D9E75' : '#E1F5EE', color: p.consulting ? '#fff' : '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{p.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{p.label}</div>
                </div>
                {p.consulting && <div style={{ fontSize: 10, background: '#1D9E75', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Now</div>}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fafaf8' }}>
              <span style={{ color: '#1D9E75', fontSize: 12, fontWeight: 600 }}>3 done today</span>
              <span style={{ color: '#aaa', fontSize: 11 }}>WhatsApp sent ✓</span>
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section style={{ padding: mobile ? '40px 5%' : '60px 5%', background: '#f7f7f5' }}>
        <h2 style={{ fontSize: mobile ? 24 : 30, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', marginBottom: 32, letterSpacing: '-0.01em' }}>
          Everything your clinic needs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, maxWidth: 900, margin: '0 auto' }}>
          {[
            { icon: '📱', title: 'WhatsApp tokens', desc: 'Patient gets token + wait time on WhatsApp. No app download.' },
            { icon: '👨‍⚕️', title: 'Multi-doctor queue', desc: 'Each doctor has their own independent queue thread.' },
            { icon: '📋', title: 'Digital prescriptions', desc: '3 printable templates. Send Rx slip on WhatsApp.' },
            { icon: '🔔', title: 'Auto follow-ups', desc: 'Medicine reminders, appointment confirmations automated.' },
            { icon: '📊', title: 'Analytics', desc: 'Daily count, doctor performance, follow-up rates.' },
            { icon: '🔐', title: 'Role-based login', desc: 'Admin, doctor, receptionist — separate access levels.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: 12, padding: '18px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: mobile ? '40px 5%' : '60px 5%', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: mobile ? 24 : 30, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', marginBottom: 8 }}>Simple pricing</h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 32 }}>Free forever with limits. Upgrade when you need more.</p>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { plan: 'Free', price: '₹0', period: '/forever', desc: '30 patients/month · 1 doctor · Prescription print · No WhatsApp', hl: false },
            { plan: 'Growth', price: '₹799', period: '/month', desc: 'Unlimited patients · WhatsApp messages · Follow-ups · 1 doctor', hl: true },
            { plan: 'Clinic', price: '₹1,499', period: '/month', desc: 'Everything in Growth · Up to 3 doctors', hl: false },
          ].map(p => (
            <div key={p.plan} style={{ border: p.hl ? '2px solid #1D9E75' : '1.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '24px 20px', position: 'relative', background: p.hl ? '#f8fffe' : '#fff' }}>
              {p.hl && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>Most popular</div>}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{p.plan}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>{p.price}<span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>{p.period}</span></div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</div>
              <button style={{ width: '100%', padding: '10px', background: p.hl ? '#1D9E75' : '#f5f5f3', color: p.hl ? '#fff' : '#444', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }} onClick={() => navigate('/signup')}>
                Get started free
              </button>
            </div>
          ))}
        </div>
      </section>


      {/* FAQ */}
      <section style={{ padding: mobile ? '40px 5%' : '60px 5%', background: '#f7f7f5' }}>
        <h2 style={{ fontSize: mobile ? 24 : 30, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', marginBottom: 8 }}>Frequently asked questions</h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 36 }}>Still have questions? WhatsApp us at +91 98780 50904</p>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              q: 'Do patients need to download any app?',
              a: 'No. Patients receive their token number and updates directly on WhatsApp. No app download, no registration needed.'
            },
            {
              q: 'How does the token system work?',
              a: 'Receptionist adds a patient → token number is auto-assigned → patient gets a WhatsApp message with their token and estimated wait time. When their turn comes, they get a call-in message.'
            },
            {
              q: 'Can multiple doctors use it at the same time?',
              a: 'Yes. Each doctor has their own independent queue. Receptionist assigns patients to specific doctors when adding them to the queue.'
            },
            {
              q: 'What happens after the free limit of 30 patients?',
              a: 'New patients cannot be added until you upgrade or the next month begins. Existing patients and consultations are not affected.'
            },
            {
              q: 'Is my patient data safe?',
              a: 'Yes. Data is stored securely on Supabase (PostgreSQL) with row-level security. Each clinic can only see their own data.'
            },
            {
              q: 'Can I print prescriptions?',
              a: 'Yes. ClinicPing has 3 prescription templates — Classic, Modern, and Minimal. You can print directly or send the prescription slip to the patient\'s WhatsApp.'
            },
            {
              q: 'What if I face any issue?',
              a: 'WhatsApp us directly at +91 98780 50904. We're based in Nabha, Punjab and respond same day.'
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. No lock-in, no cancellation fee. Your data remains accessible even after cancellation.'
            },
          ].map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 5%', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
          <LogoMark small />
          Clinic<span style={{ color: '#1D9E75' }}>Ping</span>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>Made in Nabha, Punjab 🇮🇳</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</button>
          <button style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }} onClick={() => navigate('/signup')}>Sign up</button>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: '#1D9E75', flexShrink: 0, fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', fontSize: 14, color: '#555', lineHeight: 1.65 }}>{a}</div>
      )}
    </div>
  );
}

function LogoMark({ small }) {
  const s = small ? 22 : 30;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1D9E75"/>
      <rect x="16" y="7" width="8" height="26" rx="3" fill="white"/>
      <rect x="7" y="16" width="26" height="8" rx="3" fill="white"/>
      <circle cx="31" cy="9" r="5" fill="white"/>
      <circle cx="31" cy="9" r="3" fill="#1D9E75"/>
    </svg>
  );
}
