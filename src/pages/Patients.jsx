import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    api.get('/api/patients')
      .then(r => setPatients(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.phone?.includes(q);
  });

  async function openHistory(p) {
    setSelected(p);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/api/consultations/patient/${p.id}`);
      setHistory(data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }

  function initials(name) {
    return (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Patients</h1>
          <p style={S.sub}>All patients who have visited your clinic</p>
        </div>
        <div style={S.countBadge}>{patients.length} total</div>
      </div>

      <div style={S.searchWrap}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#aaa', flexShrink: 0 }}>
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          style={S.searchInput}
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {loading ? (
        <div style={S.empty}>Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>{search ? 'No patients found' : 'No patients yet'}</div>
      ) : (
        <div style={S.list}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{ ...S.row, borderBottom: i < filtered.length - 1 ? '1px solid #f0f0ee' : 'none' }}
              onClick={() => openHistory(p)}
            >
              <div style={S.avatar}>{initials(p.name)}</div>
              <div style={S.info}>
                <div style={S.name}>{p.name}</div>
                <div style={S.meta}>
                  {p.phone && p.phone !== '' && <span>{p.phone}</span>}
                  {p.phone && p.phone !== '' && <span style={S.dot}>·</span>}
                  <span>{p.visit_count} visit{p.visit_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={S.lastVisit}>
                {p.last_visit
                  ? new Date(p.last_visit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : ''}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#ccc', marginTop: 4 }}>
                  <path d="M4 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visit history modal */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={S.modalAvatar}>{initials(selected.name)}</div>
                <div>
                  <div style={S.modalName}>{selected.name}</div>
                  <div style={S.modalMeta}>
                    {selected.phone && selected.phone !== '' && `${selected.phone} · `}
                    {selected.visit_count} visit{selected.visit_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={S.modalBody}>
              {historyLoading ? (
                <div style={S.empty}>Loading history...</div>
              ) : history.length === 0 ? (
                <div style={S.empty}>No consultation records yet.</div>
              ) : (
                history.map((c, i) => (
                  <div key={c.id} style={{ ...S.visitCard, marginBottom: i < history.length - 1 ? 12 : 0 }}>
                    <div style={S.visitDate}>
                      {new Date(c.visit_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {c.diagnosis && (
                      <div style={S.visitSection}>
                        <div style={S.visitLabel}>Diagnosis</div>
                        <div style={S.visitText}>{c.diagnosis}</div>
                      </div>
                    )}
                    {c.medicines?.length > 0 && (
                      <div style={S.visitSection}>
                        <div style={S.visitLabel}>Medicines</div>
                        {c.medicines
                          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                          .map((m, idx) => (
                            <div key={idx} style={S.medItem}>
                              {m.name}
                              {m.dose && <span style={S.medDetail}> · {m.dose}</span>}
                              {m.duration && <span style={S.medDetail}> · {m.duration}</span>}
                            </div>
                          ))}
                      </div>
                    )}
                    {c.tests_ordered?.length > 0 && (
                      <div style={S.visitSection}>
                        <div style={S.visitLabel}>Tests</div>
                        <div style={S.visitText}>{c.tests_ordered.map(t => t.name).join(' · ')}</div>
                      </div>
                    )}
                    {c.next_appointment_date && (
                      <div style={S.apptChip}>
                        Next: {new Date(c.next_appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {c.next_appointment_note && ` · ${c.next_appointment_note}`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { maxWidth: 800 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  countBadge: { background: '#E1F5EE', color: '#085041', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 20 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e8e8e5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1a1a1a', background: 'transparent' },
  clearBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 },
  list: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.1s' },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  meta: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888', marginTop: 2 },
  dot: { color: '#ccc' },
  lastVisit: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 12, color: '#aaa', flexShrink: 0 },
  empty: { padding: '40px 0', textAlign: 'center', color: '#888', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 },
  modalAvatar: { width: 42, height: 42, borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  modalName: { fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  modalMeta: { fontSize: 12, color: '#888', marginTop: 3 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', padding: 4, lineHeight: 1 },
  modalBody: { overflowY: 'auto', padding: '16px 20px' },
  visitCard: { background: '#fafaf8', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '14px 16px' },
  visitDate: { fontSize: 12, fontWeight: 600, color: '#1D9E75', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' },
  visitSection: { marginBottom: 10 },
  visitLabel: { fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 },
  visitText: { fontSize: 13, color: '#333', lineHeight: 1.5 },
  medItem: { fontSize: 13, color: '#1a1a1a', marginBottom: 3 },
  medDetail: { color: '#888' },
  apptChip: { display: 'inline-block', background: '#E1F5EE', color: '#085041', fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 500, marginTop: 6 },
};
