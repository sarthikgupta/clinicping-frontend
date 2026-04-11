import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const TYPES = [
  { key: 'medicine', label: 'Medicine reminder', desc: 'Remind patient to take medicine' },
  { key: 'appointment', label: 'Next appointment', desc: 'Confirm next visit date/time' },
  { key: 'lab', label: 'Lab report', desc: 'Ask patient to bring lab reports' },
  { key: 'wellness', label: 'Wellness check', desc: 'Ask how patient is feeling' },
];

export default function Followups() {
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState('pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ type: 'medicine', scheduled_at: tomorrowAt7(), appointment_date: '', appointment_time: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const searchRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  // Close dropdown on outside click
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
    const [p, s, pts] = await Promise.all([
      api.get('/api/followups?status=pending'),
      api.get('/api/followups?status=sent'),
      api.get('/api/patients'),
    ]);
    setPending(p.data);
    setSent(s.data);
    setAllPatients(pts.data);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  // Filtered patients based on search
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
    setForm({ type: 'medicine', scheduled_at: tomorrowAt7(), appointment_date: '', appointment_time: '' });
  }

  async function handleSchedule(e) {
    e.preventDefault();
    if (!selectedPatient) { showToast('Please select a patient'); return; }
    setSaving(true);
    try {
      await api.post('/api/followups', { ...form, patient_id: selectedPatient.id });
      showToast('Follow-up scheduled');
      setModalOpen(false);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  }

  async function sendNow(id) {
    try {
      await api.post(`/api/followups/${id}/send-now`);
      showToast('Sent via WhatsApp');
      loadAll();
    } catch { showToast('Send failed'); }
  }

  async function cancel(id) {
    await api.delete(`/api/followups/${id}`);
    loadAll();
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
        <button style={S.addBtn} onClick={openModal}>+ Schedule follow-up</button>
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
            <div style={S.typeIcon}>{fu.type[0].toUpperCase()}</div>
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
            {tab === 'sent' && <span style={S.sentBadge}>Sent</span>}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={S.overlay} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Schedule follow-up</span>
              <button style={S.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSchedule}>

              {/* Searchable patient input */}
              <div style={{ marginBottom: 16 }} ref={dropRef}>
                <label style={S.label}>Patient</label>
                <div style={S.searchWrap}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#aaa' }}>
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    ref={searchRef}
                    style={S.searchInput}
                    placeholder="Search by name or phone..."
                    value={patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setSelectedPatient(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    autoComplete="off"
                  />
                  {selectedPatient && (
                    <div style={S.selectedTick}>✓</div>
                  )}
                </div>

                {showDropdown && patientSearch.length > 0 && (
                  <div style={S.dropdown}>
                    {filteredPatients.length === 0 ? (
                      <div style={S.dropEmpty}>No patients found</div>
                    ) : filteredPatients.map(p => (
                      <div key={p.id} style={S.dropItem} onClick={() => selectPatient(p)}>
                        <div style={S.dropName}>{p.name}</div>
                        <div style={S.dropMeta}>{p.phone || 'No phone'} · {p.visit_count} visit{p.visit_count !== 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Type selector */}
              <label style={S.label}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {TYPES.map(t => (
                  <div key={t.key}
                    style={{ ...S.typeCard, ...(form.type === t.key ? S.typeCardActive : {}) }}
                    onClick={() => setForm(f => ({ ...f, type: t.key }))}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.type === t.key ? '#085041' : '#1a1a1a' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              {/* Appointment date/time if type is appointment */}
              {form.type === 'appointment' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={S.label}>Appointment date</label>
                    <input
                      style={{ ...S.inp, width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'block' }}
                      type="date"
                      value={form.appointment_date}
                      onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={S.label}>Time</label>
                    <input
                      style={{ ...S.inp, width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'block' }}
                      type="time"
                      value={form.appointment_time}
                      onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <label style={S.label}>Send at</label>
              <input style={{ ...S.inp, marginBottom: 18 }} type="datetime-local"
                value={new Date(form.scheduled_at).toISOString()}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />

              <button style={S.submitBtn} disabled={saving}>
                {saving ? 'Scheduling...' : 'Schedule follow-up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function tomorrowAt7() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  // Format as YYYY-MM-DDTHH:MM in LOCAL time (not UTC)
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, });
}

const S = {
  toast: { position: 'fixed', top: 20, right: 20, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  addBtn: { padding: '10px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 6, marginBottom: 16 },
  tab: { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#888', fontSize: 13, cursor: 'pointer' },
  tabActive: { background: '#E1F5EE', color: '#085041', borderColor: 'transparent', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  empty: { padding: 24, textAlign: 'center', color: '#888', fontSize: 14 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' },
  typeIcon: { width: 36, height: 36, borderRadius: '50%', background: '#FAEEDA', color: '#854F0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 },
  info: { flex: 1 },
  name: { fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 },
  typeTag: { fontSize: 11, background: '#E1F5EE', color: '#085041', padding: '2px 8px', borderRadius: 20, fontWeight: 400 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  sendBtn: { padding: '6px 14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '6px 14px', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 12, color: '#888', cursor: 'pointer' },
  sentBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f0f0ee', color: '#888' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #e8e8e5', borderRadius: 8, padding: '9px 12px', background: '#fff' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1a1a1a', background: 'transparent' },
  selectedTick: { color: '#1D9E75', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  dropdown: { position: 'absolute', left: 0, right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto', marginTop: 4 },
  dropEmpty: { padding: '14px 16px', color: '#aaa', fontSize: 13, textAlign: 'center' },
  dropItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f3', transition: 'background 0.1s' },
  dropName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  dropMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  inp: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1a1a1a' },
  typeCard: { border: '1.5px solid #e8e8e5', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s' },
  typeCardActive: { borderColor: '#1D9E75', background: '#E1F5EE' },
  submitBtn: { width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
};
