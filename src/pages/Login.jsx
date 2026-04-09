import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/queue');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>Clinic<span style={{ color: 'var(--green)' }}>Ping</span></div>
        <p style={S.sub}>Sign in to your clinic dashboard</p>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="clinic@email.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          <button style={S.btn} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p style={S.footer}>New clinic? <Link to="/signup">Create account</Link></p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-bg)' },
  card: { background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-border)', padding: '36px 32px', width: 380 },
  logo: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  sub: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 },
  error: { background: 'var(--red-light)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5, marginTop: 14 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid var(--gray-border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--white)' },
  btn: { width: '100%', marginTop: 20, padding: '11px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: 14 },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' },
};
