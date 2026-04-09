import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Signup() {
  const [form, setForm] = useState({
    clinic_name: '', name: '', email: '', phone: '', password: '', city: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form);
      navigate('/queue');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed');
    } finally { setLoading(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>Clinic<span style={{ color: '#1D9E75' }}>Ping</span></div>
        <p style={S.sub}>Register your clinic — free for 3 months</p>
        <p style={S.note}>You'll be the Admin. Add doctors and receptionists from Settings after signup.</p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { key: 'clinic_name', label: 'Clinic name', placeholder: 'e.g. Dr. Bhalla Clinic' },
            { key: 'name', label: 'Your name (Admin)', placeholder: 'e.g. Anumeha Bhalla' },
            { key: 'city', label: 'City', placeholder: 'e.g. Nabha, Patiala', required: false },
            { key: 'phone', label: 'Clinic phone', placeholder: '+91 98765 43210' },
            { key: 'email', label: 'Email', placeholder: 'admin@clinic.com', type: 'email' },
            { key: 'password', label: 'Password', placeholder: 'Min 6 characters', type: 'password' },
          ].map(({ key, label, placeholder, type = 'text', required = true }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={S.label}>{label}</label>
              <input style={S.input} type={type} placeholder={placeholder}
                value={form[key]} onChange={set(key)} required={required} />
            </div>
          ))}
          <button style={S.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create clinic account'}
          </button>
        </form>
        <p style={S.footer}>Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f5', padding: 20 },
  card: { background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', padding: '36px 32px', width: 420 },
  logo: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  sub: { color: '#888', fontSize: 14, marginBottom: 8 },
  note: { fontSize: 12, color: '#1D9E75', background: '#E1F5EE', padding: '8px 12px', borderRadius: 8, marginBottom: 20, lineHeight: 1.5 },
  error: { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 14 },
  btn: { width: '100%', marginTop: 16, padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  footer: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#888' },
};
