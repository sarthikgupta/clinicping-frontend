import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/queue');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Back to home */}
        <button style={S.backBtn} onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </button>

        {/* Logo */}
        <div style={S.logoRow}>
          <LogoMark />
          <span style={S.logoText}>Clinic<span style={{ color: '#1D9E75' }}>Ping</span></span>
        </div>

        <h1 style={S.title}>Welcome back</h1>
        <p style={S.sub}>Sign in to your clinic dashboard</p>

        {error && <div style={S.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>Email address</label>
            <input
              style={S.input}
              type="email"
              placeholder="doctor@clinic.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
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
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7f7f5',
    padding: 20,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '36px 32px',
    width: '100%',
    maxWidth: 400,
    boxSizing: 'border-box',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 24,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 6px',
  },
  sub: {
    fontSize: 14,
    color: '#888',
    margin: '0 0 24px',
  },
  errorBox: {
    background: '#FCEBEB',
    color: '#A32D2D',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  field: { marginBottom: 16 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
    marginBottom: 6,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e8e8e5',
    borderRadius: 8,
    fontSize: 15,
    color: '#1a1a1a',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  btn: {
    display: 'block',
    width: '100%',
    marginTop: 20,
    padding: '13px',
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#888',
  },
  link: {
    color: '#1D9E75',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
