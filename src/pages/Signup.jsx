import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Signup() {
  const [form, setForm] = useState({
    clinic_name: '', name: '', email: '', phone: '', password: '', confirm_password: '', city: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const pwMatch = form.confirm_password && form.password === form.confirm_password;
  const pwMismatch = form.confirm_password && form.password !== form.confirm_password;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signup({ clinic_name: form.clinic_name, name: form.name, email: form.email, phone: form.phone, password: form.password, city: form.city });
      navigate('/queue');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed.');
    } finally { setLoading(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <button style={S.backBtn} onClick={() => navigate('/')}>← Back to home</button>
        <div style={S.logoRow}>
          <LogoMark />
          <span style={S.logoText}>Clinic<span style={{ color: '#1D9E75' }}>Ping</span></span>
        </div>
        <h1 style={S.title}>Create your clinic</h1>
        <p style={S.sub}>Free for 3 months · No credit card needed</p>
        <div style={S.infoBanner}>You'll be the Admin. Add doctors and receptionists from Settings after signup.</div>
        {error && <div style={S.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={S.row2}>
            <Field label="Clinic name *" placeholder="Dr. Bhalla Clinic" value={form.clinic_name} onChange={set('clinic_name')} required />
            <Field label="Your name *" placeholder="Dr. Anumeha Bhalla" value={form.name} onChange={set('name')} required />
          </div>
          <div style={S.row2}>
            <Field label="City" placeholder="Nabha" value={form.city} onChange={set('city')} />
            <Field label="Clinic phone *" placeholder="9988776655" value={form.phone} onChange={set('phone')} required />
          </div>
          <Field label="Email address *" type="email" placeholder="admin@clinic.com" value={form.email} onChange={set('email')} required />
          <div style={S.row2}>
            <Field label="Password *" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required />
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Confirm password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...S.input, borderColor: pwMismatch ? '#E24B4A' : pwMatch ? '#1D9E75' : '#e8e8e5', paddingRight: 36 }}
                  type="password" placeholder="Repeat password"
                  value={form.confirm_password} onChange={set('confirm_password')} required
                />
                {pwMatch && <span style={S.tick}>✓</span>}
                {pwMismatch && <span style={{ ...S.tick, color: '#E24B4A' }}>✕</span>}
              </div>
              {pwMismatch && <div style={S.pwErr}>Passwords do not match</div>}
            </div>
          </div>
          <button style={{ ...S.btn, opacity: loading || pwMismatch ? 0.6 : 1 }} disabled={loading || !!pwMismatch}>
            {loading ? 'Creating account...' : 'Create clinic account'}
          </button>
        </form>
        <p style={S.footer}>Already registered? <Link to="/login" style={S.link}>Sign in</Link></p>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      <input style={S.input} type={type} placeholder={placeholder} value={value} onChange={onChange} required={required} />
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1D9E75"/>
      <rect x="16" y="7" width="8" height="26" rx="3" fill="white"/>
      <rect x="7" y="16" width="26" height="8" rx="3" fill="white"/>
      <circle cx="31" cy="9" r="5" fill="white"/>
      <circle cx="31" cy="9" r="3" fill="#1D9E75"/>
    </svg>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f5', padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: '32px 28px', width: '100%', maxWidth: 520, boxSizing: 'border-box' },
  backBtn: { display: 'block', background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 24 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoText: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  sub: { fontSize: 14, color: '#888', margin: '0 0 16px' },
  infoBanner: { background: '#E1F5EE', color: '#085041', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, lineHeight: 1.5 },
  errorBox: { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { display: 'block', width: '100%', padding: '11px 14px', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 14, color: '#1a1a1a', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
  tick: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#1D9E75', fontWeight: 700, fontSize: 14 },
  pwErr: { fontSize: 12, color: '#E24B4A', marginTop: 5 },
  btn: { display: 'block', width: '100%', marginTop: 20, padding: '13px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' },
  link: { color: '#1D9E75', fontWeight: 600, textDecoration: 'none' },
};
