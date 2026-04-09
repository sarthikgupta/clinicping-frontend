import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load(q = '') {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/patients${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setPatients(data);
    } finally { setLoading(false); }
  }

  async function openPatient(p) {
    setSelected(p);
    const { data } = await api.get(`/api/patients/${p.id}/history`);
    setHistory(data);
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    clearTimeout(window._searchT);
    window._searchT = setTimeout(() => load(e.target.value), 400);
  }

  return (
    <div>
      <h1 style={S.title}>Patients</h1>
      <p style={S.sub}>All patients who have visited your clinic</p>

      <input style={S.search} placeholder="Search by name or phone..." value={search} onChange={handleSearch} />

      <div style={S.card}>
        {loading ? (
          <p style={S.empty}>Loading...</p>
        ) : patients.length === 0 ? (
          <p style={S.empty}>No patients found.</p>
        ) : patients.map((p, i) => (
          <div key={p.id} style={{ ...S.row, borderBottom: i < patients.length - 1 ? '1px solid var(--gray-border)' : 'none', cursor: 'pointer' }}
            onClick={() => openPatient(p)}>
            <div style={S.avatar}>{p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
            <div style={S.info}>
              <div style={S.name}>{p.name}</div>
              <div style={S.meta}>{p.phone} · {p.visit_count} visit{p.visit_count !== 1 ? 's' : ''}</div>
            </div>
            <div style={S.lastVisit}>{fmtDate(p.last_visit)}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={S.overlay} onClick={() => { setSelected(null); setHistory(null); }}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={S.avatarLg}>{selected.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.phone} · {selected.visit_count} visits</div>
                </div>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={S.sectionHead}>Visit history</div>
            {!history ? <p style={S.empty}>Loading...</p> : history.visits.length === 0 ? (
              <p style={S.empty}>No visits recorded.</p>
            ) : history.visits.slice(0, 8).map(v => (
              <div key={v.id} style={S.histRow}>
                <span style={S.histDate}>{fmtDate(v.created_at)}</span>
                <span style={S.histReason}>{v.reason || 'General'}</span>
                <span style={{ ...S.histBadge, background: v.status === 'done' ? '#f0f0ee' : 'var(--green-light)', color: v.status === 'done' ? '#888' : 'var(--green-text)' }}>{v.status}</span>
              </div>
            ))}

            <div style={{ ...S.sectionHead, marginTop: 20 }}>Follow-ups sent</div>
            {!history ? null : history.followups.length === 0 ? (
              <p style={S.empty}>No follow-ups yet.</p>
            ) : history.followups.slice(0, 5).map(f => (
              <div key={f.id} style={S.histRow}>
                <span style={S.histDate}>{fmtDate(f.sent_at || f.created_at)}</span>
                <span style={S.histReason}>{f.type}</span>
                <span style={{ ...S.histBadge, background: f.status === 'sent' ? 'var(--green-light)' : 'var(--amber)', color: f.status === 'sent' ? 'var(--green-text)' : 'var(--amber-text)' }}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const S = {
  title: { fontSize: 22, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 },
  search: { width: '100%', padding: '10px 14px', border: '1px solid var(--gray-border)', borderRadius: 'var(--radius-sm)', fontSize: 14, marginBottom: 16, background: 'var(--white)', outline: 'none' },
  card: { background: 'var(--white)', border: '1px solid var(--gray-border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  empty: { padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'var(--green-light)', color: 'var(--green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  info: { flex: 1 },
  name: { fontWeight: 500, fontSize: 14 },
  meta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  lastVisit: { fontSize: 12, color: 'var(--text-muted)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: 24, width: 480, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  avatarLg: { width: 44, height: 44, borderRadius: '50%', background: 'var(--green-light)', color: 'var(--green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, flexShrink: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, color: 'var(--text-muted)' },
  sectionHead: { fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 },
  histRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gray-border)' },
  histDate: { fontSize: 12, color: 'var(--text-muted)', width: 100, flexShrink: 0 },
  histReason: { flex: 1, fontSize: 13 },
  histBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20 },
};
