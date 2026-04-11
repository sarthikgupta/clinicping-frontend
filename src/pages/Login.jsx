import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Login() {
  const [mode, setMode] = useState('code'); // 'code' | 'email'
  const [clinicCode, setClinicCode] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'code') {
        await login(null, password, clinicCode.trim().toUpperCase(), username.trim().toLowerCase());
      } else {
        await login(email.trim(), password, null, null);
      }
      
      // In Login.jsx handleSubmit, after await doLogin(...)
      const u = useAuthStore.getState().user;
      if (u?.role === 'doctor') navigate('/doctor');
      else if (u?.role === 'receptionist') navigate('/queue');
      else navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
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

        <h1 style={S.title}>Welcome back</h1>

        {/* Mode toggle */}
        <div style={S.modeToggle}>
          <button
            type="button"
            style={{ ...S.modeBtn, ...(mode === 'code' ? S.modeBtnActive : {}) }}
            onClick={() => { setMode('code'); setError(''); }}
          >
            Staff login
          </button>
          <button
            type="button"
            style={{ ...S.modeBtn, ...(mode === 'email' ? S.modeBtnActive : {}) }}
            onClick={() => { setMode('email'); setError(''); }}
          >
            Admin (email)
          </button>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          {mode === 'code' ? (
            <>
              <div style={S.field}>
                <label style={S.label}>Clinic code</label>
                <input
                  style={{ ...S.input, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, fontSize: 16 }}
                  type="text"
                  placeholder="e.g. BHALLA"
                  value={clinicCode}
                  onChange={e => setClinicCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="organization"
                  required
                  autoFocus
                  maxLength={12}
                />
                <div style={S.hint}>Ask your clinic admin for the code</div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={S.atSymbol}>@</span>
                  <input
                    style={{ ...S.input, paddingLeft: 28, fontFamily: 'monospace' }}
                    type="text"
                    placeholder="your.username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={S.field}>
              <label style={S.label}>Email address</label>
              <input
                style={S.input}
                type="email"
                placeholder="admin@clinic.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
              <div style={S.hint}>For clinic admins only</div>
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={S.footer}>
          New clinic? <Link to="/signup" style={S.link}>Create account</Link>
        </p>
      </div>
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
  card: { background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: '32px 28px', width: '100%', maxWidth: 400, boxSizing: 'border-box' },
  backBtn: { display: 'block', background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 24 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  logoText: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' },
  modeToggle: { display: 'flex', background: '#f5f5f3', borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 },
  modeBtn: { flex: 1, padding: '8px 12px', background: 'none', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#888', transition: 'all 0.15s' },
  modeBtnActive: { background: '#fff', color: '#1a1a1a', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  errorBox: { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { display: 'block', width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 15, color: '#1a1a1a', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', WebkitAppearance: 'none' },
  atSymbol: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 15, pointerEvents: 'none' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 5 },
  btn: { display: 'block', width: '100%', marginTop: 8, padding: '14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' },
  link: { color: '#1D9E75', fontWeight: 600, textDecoration: 'none' },
};
