import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const TYPES = [
  { key: 'medicine', label: 'Medicine reminder', desc: 'Remind patient to take medicine' },
  { key: 'appointment', label: 'Next appointment', desc: 'Confirm next visit date/time' },
  { key: 'lab', label: 'Lab report', desc: 'Ask patient to bring lab reports' },
  { key: 'wellness', label: 'Wellness check', desc: 'Ask how patient is feeling' },
];

function toLocalInputString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInputString(d);
}

function fmtDate(d) {
  if (!d) return '—';
  // If no timezone in string, append +05:30 so it's treated as IST not UTC
  const dateStr = d.includes('T') && !d.includes('Z') && !d.includes('+') 
    ? d + '+05:30' 
    : d;
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function Followups() {
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState('pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [type, setType] = useState('medicine');
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime());
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const dropRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadAll() {
    try {
      const [p, s, pts] = await Promise.all([
        api.get('/api/followups?status=pending'),
        api.get('/api/followups?status=sent'),
        api.get('/api/patients'),
      ]);
      setPending(p.data);
      setSent(s.data);
      setAllPatients(pts.data);
    } catch (e) { console.error(e); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const filteredPatients = allPatients.filter(p => {
    const q = patientSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.phone?.includes(q);
  }).slice(0, 8);

  function selectPatient(p) {
    setSelectedPatient(p);
    setPatientSearch(p.name + (p.phone ? ` · ${p.phone}` : ''));
    setShowDropdown(false);
  }

  function openModal() {
    setModalOpen(true);
    setSelectedPatient(null);
    setPatientSearch('');
    setType('medicine');
    setScheduledAt(defaultScheduleTime());
    setApptDate('');
    setApptTime('');
  }

  async function handleSchedule(e) {
    e.preventDefault();
    if (!selectedPatient) { showToast('Please select a patient'); return; }
    if (!scheduledAt) { showToast('Please set a send time'); return; }
    setSaving(true);
    try {
      await api.post('/api/followups', {
        patient_id: selectedPatient.id,
        type,
        scheduled_at: scheduledAt,
        appointment_date: apptDate || null,
        appointment_time: apptTime || null,
        message: JSON.stringify({ date: apptDate, time: apptTime }),
      });
      showToast('Follow-up scheduled ✓');
      setModalOpen(false);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  }

  async function sendNow(id) {
    try { await api.post(`/api/followups/${id}/send-now`); showToast('Sent ✓'); loadAll(); }
    catch { showToast('Send failed'); }
  }

  async function cancel(id) {
    try { await api.delete(`/api/followups/${id}`); loadAll(); }
    catch { showToast('Failed'); }
  }

  const list = tab === 'pending' ? pending : sent;

  return (
    <div>
      {toast && <div style={S.toast}>{toast}</div>}

      <div style={S.header}>
        <div>
          <h1 style={S.title}>Follow-ups</h1>
          <p style={S.sub}>Automated WhatsApp reminders for patients</p>
        </div>
        <button style={S.addBtn} onClick={openModal}>+ Schedule</button>
      </div>

      <div style={S.tabs}>
        {['pending', 'sent'].map(t => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'pending' ? pending.length : sent.length})
          </button>
        ))}
      </div>

      <div style={S.card}>
        {list.length === 0 ? (
          <p style={S.empty}>{tab === 'pending' ? 'No pending follow-ups.' : 'No sent follow-ups yet.'}</p>
        ) : list.map((fu, i) => (
          <div key={fu.id} style={{ ...S.row, borderBottom: i < list.length - 1 ? '1px solid #f0f0ee' : 'none' }}>
            <div style={S.typeIcon}>{fu.type?.[0]?.toUpperCase()}</div>
            <div style={S.info}>
              <div style={S.name}>
                {fu.patients?.name}
                <span style={S.typeTag}>{fu.type}</span>
              </div>
              <div style={S.meta}>
                {fu.patients?.phone && fu.patients.phone !== '' && `${fu.patients.phone} · `}
                {tab === 'pending' ? `Scheduled: ${fmtDate(fu.scheduled_at)}` : `Sent: ${fmtDate(fu.sent_at)}`}
              </div>
            </div>
            {tab === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.sendBtn} onClick={() => sendNow(fu.id)}>Send now</button>
                <button style={S.cancelBtn} onClick={() => cancel(fu.id)}>Cancel</button>
              </div>
            )}
            {tab === 'sent' && <span style={S.sentBadge}>Sent ✓</span>}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div style={S.overlay} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Schedule follow-up</span>
              <button style={S.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSchedule}>

              {/* Patient search — contained within modal */}
              <div style={{ marginBottom: 16, position: 'relative' }} ref={dropRef}>
                <label style={S.label}>Patient</label>
                <div style={S.searchWrap}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#aaa', flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    ref={searchRef}
                    style={S.searchInput}
                    placeholder="Search by name or phone..."
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); setShowDropdown(true); }}
                    onFocus={() => { if (patientSearch) setShowDropdown(true); }}
                    autoComplete="off"
                  />
                  {selectedPatient && <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>✓</span>}
                </div>
                {/* Dropdown — contained within modal width */}
                {showDropdown && patientSearch.length > 0 && (
                  <div style={S.dropdown}>
                    {filteredPatients.length === 0
                      ? <div style={S.dropEmpty}>No patients found</div>
                      : filteredPatients.map(p => (
                        <div key={p.id} style={S.dropItem}
                          onMouseDown={e => { e.preventDefault(); selectPatient(p); }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{p.phone || 'No phone'} · {p.visit_count} visit{p.visit_count !== 1 ? 's' : ''}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Type selector */}
              <label style={S.label}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {TYPES.map(t => {
                  const isActive = type === t.key;
                  return (
                    <div key={t.key}
                      style={{
                        ...S.typeCard,
                        borderColor: isActive ? '#1D9E75' : '#e8e8e5',
                        background: isActive ? '#E1F5EE' : '#fff',
                      }}
                      onClick={() => setType(t.key)}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#085041' : '#1a1a1a' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: isActive ? '#0F6E56' : '#aaa', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Appointment fields */}
              {type === 'appointment' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={S.label}>Appointment date</label>
                    <input style={S.inp} type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Time</label>
                    <input style={S.inp} type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Send at */}
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Send reminder at</label>
                <input
                  style={S.inp}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  required
                />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>
                  WhatsApp message will be sent at this time
                </div>
              </div>

              <button style={{ ...S.submitBtn, opacity: (!selectedPatient || saving) ? 0.6 : 1 }}
                disabled={saving || !selectedPatient}>
                {saving ? 'Scheduling...' : 'Schedule follow-up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  toast: { position: 'fixed', top: 20, right: 20, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  addBtn: { padding: '10px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0 },
  tabs: { display: 'flex', gap: 6, marginBottom: 16 },
  tab: { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' },
  tabActive: { background: '#E1F5EE', color: '#085041', borderColor: 'transparent', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  empty: { padding: 24, textAlign: 'center', color: '#888', fontSize: 14 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' },
  typeIcon: { width: 36, height: 36, borderRadius: '50%', background: '#FAEEDA', color: '#854F0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeTag: { fontSize: 11, background: '#E1F5EE', color: '#085041', padding: '2px 8px', borderRadius: 20 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  sendBtn: { padding: '6px 14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  cancelBtn: { padding: '6px 14px', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 12, color: '#888', cursor: 'pointer', flexShrink: 0 },
  sentBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E1F5EE', color: '#085041', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #e8e8e5', borderRadius: 8, padding: '10px 12px', background: '#fff' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1a1a1a', background: 'transparent', minWidth: 0, width: '100%' },
  dropdown: { position: 'absolute', left: 0, right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 4 },
  dropEmpty: { padding: '14px 16px', color: '#aaa', fontSize: 13, textAlign: 'center' },
  dropItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f3' },
  inp: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1a1a1a', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  typeCard: { border: '2px solid #e8e8e5', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s' },
  submitBtn: { width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
};
