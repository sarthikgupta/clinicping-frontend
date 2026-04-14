import { useState, useEffect, useCallback, useRef } from 'react';
import { api, useAuthStore } from '../lib/api';
import { onQueueUpdate, playPing, unlockAudio } from '../lib/notify';

export default function Queue() {
  const { user } = useAuthStore();
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', reason: '', doctor_id: '' });
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [advancing, setAdvancing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [showDone, setShowDone] = useState(false);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);

  const isReceptionist = user?.role === 'receptionist';
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';
  const canSelectDoctor = isReceptionist || isAdmin;
  const isMultiDoctor = doctors.length > 1;

  const load = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([
        api.get('/api/queue/today'),
        api.get('/api/queue/stats'),
      ]);
      setQueue(q.data);
      setStats(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Unlock audio on first user interaction (mobile requirement)
  useEffect(() => {
    function unlock() {
      unlockAudio();
    }
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  useEffect(() => {
    if (canSelectDoctor) {
      api.get('/api/queue/doctors').then(r => {
        setDoctors(r.data || []);
        if (r.data?.length > 0) setForm(f => ({ ...f, doctor_id: r.data[0].id }));
      }).catch(console.error);
    }
  }, [canSelectDoctor]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const unsub = onQueueUpdate((data) => {
      if (data.action === 'NEXT_PATIENT') {
        load();
        playPing();
        const msg = data.nextName
          ? `#${data.nextToken} ${data.nextName} — please come in`
          : 'Queue advanced by doctor';
        showNotification(msg);
      }
    });
    return unsub;
  }, [load]);

  function showNotification(msg) {
    setNotification(msg);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 6000);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }

  function validateForm() {
    const e = {};
    if (!form.name.trim()) e.name = 'Patient name is required';
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid 10-digit number';
    if (canSelectDoctor && doctors.length > 0 && !form.doctor_id)
      e.doctor = 'Please select a doctor';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePhoneInput(val) {
    const numeric = val.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, phone: numeric }));
    if (errors.phone) setErrors(e => ({ ...e, phone: '' }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setAdding(true);
    try {
      const payload = { name: form.name, phone: form.phone || '', reason: form.reason };
      if (canSelectDoctor && form.doctor_id) payload.doctor_id = form.doctor_id;
      const { data } = await api.post('/api/queue/add', payload);
      const doctorName = doctors.find(d => d.id === form.doctor_id)?.name || '';
      showToast(`Token #${data.token.token_number} assigned${doctorName ? ` → ${doctorName}` : ''}${data.whatsappSent ? ' · WhatsApp ✓' : ''}`);
      setForm(f => ({ ...f, name: '', phone: '', reason: '' }));
      setErrors({});
      setAddOpen(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally { setAdding(false); }
  }

  async function handleAdvance(doctorId, doctorName) {
    setAdvancing(doctorId);
    try {
      const doctorQueue = queue.filter(t =>
        !['done', 'cancelled'].includes(t.status) && t.doctor_id === doctorId
      );
      const consulting = doctorQueue.find(t => t.status === 'consulting')
        || doctorQueue.find(t => t.status === 'next')
        || doctorQueue.find(t => t.status === 'waiting');

      if (!consulting) { showToast(`No patients for ${doctorName}`, 'error'); return; }

      const { data } = await api.patch(`/api/queue/${consulting.id}/next`);
      if (data.nextPatient) {
        showToast(`Called #${data.nextPatient.token_number} for ${doctorName}${data.whatsappSent ? ' · WhatsApp ✓' : ''}`);
        playPing();
      } else {
        showToast(`${doctorName}'s queue complete for today!`);
      }
      load();
    } catch { showToast('Error advancing queue', 'error'); }
    finally { setAdvancing(null); }
  }

  async function handleCancel(id) {
    if (!window.confirm('Remove this patient from queue?')) return;
    await api.delete(`/api/queue/${id}`);
    showToast('Patient removed');
    load();
  }

  const activeQueue = queue.filter(t => !['done', 'cancelled'].includes(t.status));
  const doneQueue = queue.filter(t => t.status === 'done');
  const cancelledCount = stats.cancelled || 0;

  // Group by doctor
  const queueByDoctor = {};
  activeQueue.forEach(token => {
    const drId = token.doctor_id || 'unassigned';
    if (!queueByDoctor[drId]) queueByDoctor[drId] = [];
    queueByDoctor[drId].push(token);
  });

  function getDoctorName(drId) {
    if (drId === 'unassigned') return 'Unassigned';
    const dr = doctors.find(d => d.id === drId);
    if (dr) return dr.name;
    const token = queue.find(t => t.doctor_id === drId);
    return token?.clinic_users?.name || 'Doctor';
  }

  return (
    <div style={S.page}>
      {toast.msg && (
        <div style={{ ...S.toast, background: toast.type === 'error' ? '#A32D2D' : '#1a1a1a' }}>
          {toast.msg}
        </div>
      )}

      {notification && (
        <div style={S.notifBanner}>
          <div style={S.notifDot} />
          <div style={S.notifContent}>
            <div style={S.notifTitle}>Next patient called by doctor</div>
            <div style={S.notifMsg}>{notification}</div>
          </div>
          <button style={S.notifClose} onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div style={S.header}>
        <div>
          <h1 style={S.title}>Today's queue</h1>
          <p style={S.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button style={S.addBtn} onClick={() => { setAddOpen(true); setErrors({}); }}>
          + Add patient
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: 'Waiting', val: (stats.waiting || 0) + (stats.next || 0), color: '#854F0B', bg: '#FAEEDA' },
          { label: 'Consulting', val: stats.consulting || 0, color: '#085041', bg: '#E1F5EE' },
          { label: 'Done today', val: stats.done || 0, color: '#444', bg: '#f0f0ee' },
          { label: 'Cancelled', val: cancelledCount, color: '#A32D2D', bg: '#FCEBEB' },
          { label: 'Total seen', val: (stats.done || 0) + (stats.consulting || 0), color: '#1D9E75', bg: '#fff' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{ ...S.statCard, background: bg }}>
            <div style={{ ...S.statVal, color }}>{val}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Queue grouped by doctor */}
      {loading ? (
        <div style={{ ...S.card, ...S.emptyState }}>
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
      ) : activeQueue.length === 0 ? (
        <div style={{ ...S.card, ...S.emptyState }}>
          <p style={{ color: '#888', fontSize: 14 }}>No patients in queue</p>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>Tap "+ Add patient" to get started</p>
        </div>
      ) : (
        Object.entries(queueByDoctor).map(([drId, tokens]) => {
          const drName = getDoctorName(drId);
          const consulting = tokens.find(t => t.status === 'consulting');
          const isAdvancing = advancing === drId;

          let advLabel = isAdvancing ? 'Processing...' : '';
          if (!isAdvancing) {
            if (!consulting && tokens.length > 0) advLabel = `Call first patient → ${drName}`;
            else if (consulting) advLabel = `Done with #${consulting.token_number} · ${consulting.patients?.name?.split(' ')[0]} → Call next`;
          }

          return (
            <div key={drId} style={S.doctorSection}>
              {isMultiDoctor && (
                <div style={S.doctorHeader}>
                  <div style={S.doctorAvatar}>{drName.charAt(0).toUpperCase()}</div>
                  <div style={S.doctorInfo}>
                    <span style={S.doctorName}>{drName}</span>
                    <span style={S.doctorCount}>{tokens.length} patient{tokens.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['consulting', 'waiting'].map(s => {
                      const count = tokens.filter(t => t.status === s || (s === 'waiting' && t.status === 'next')).length;
                      if (!count) return null;
                      const color = s === 'consulting' ? '#1D9E75' : '#854F0B';
                      const bg = s === 'consulting' ? '#E1F5EE' : '#FAEEDA';
                      return <span key={s} style={{ ...S.statusDot, background: bg, color }}>{count} {s}</span>;
                    })}
                  </div>
                </div>
              )}

              <button
                style={{ ...S.advanceBtn, opacity: tokens.length > 0 ? 1 : 0.45 }}
                onClick={() => handleAdvance(drId, drName)}
                disabled={isAdvancing || tokens.length === 0}
              >
                {advLabel}
              </button>

              <div style={S.card}>
                <div style={S.cardHead}>
                  <span>{isMultiDoctor ? `${drName}'s patients` : 'Active patients'} ({tokens.length})</span>
                  <span style={{ fontSize: 11, color: '#888' }}>Auto-refreshes every 20s</span>
                </div>
                {tokens.map((token, i) => {
                  const isConsulting = token.status === 'consulting';
                  const waitingAhead = tokens.filter(t =>
                    ['waiting', 'next'].includes(t.status) && t.token_number < token.token_number
                  ).length;

                  return (
                    <div key={token.id} style={{
                      ...S.row,
                      borderBottom: i < tokens.length - 1 ? '1px solid #f0f0ee' : 'none',
                      background: isConsulting ? '#f8fffe' : 'transparent',
                    }}>
                      {isConsulting && <div style={S.consultingBar} />}
                      <div style={{ ...S.tokenCircle, background: isConsulting ? '#1D9E75' : '#E1F5EE', color: isConsulting ? '#fff' : '#085041' }}>
                        {token.token_number}
                      </div>
                      <div style={S.patientInfo}>
                        <div style={S.patientName}>
                          {token.patients?.name}
                          {isConsulting && <span style={S.consultingPill}>In consultation</span>}
                        </div>
                        <div style={S.patientMeta}>
                          {token.patients?.phone && token.patients.phone !== '' && `${token.patients.phone}`}
                          {token.reason && (token.patients?.phone ? ` · ${token.reason}` : token.reason)}
                          {token.status === 'waiting' && <span style={{ color: '#854F0B' }}> · ~{(waitingAhead + 1) * 10} min</span>}
                        </div>
                      </div>
                      {!isConsulting && (
                        <button style={S.cancelBtn} onClick={() => handleCancel(token.id)}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Done patients */}
      {doneQueue.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button style={S.doneToggle} onClick={() => setShowDone(s => !s)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: showDone ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
              <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {showDone ? 'Hide' : 'Show'} done patients ({doneQueue.length})
          </button>
          {showDone && (
            <div style={{ ...S.card, marginTop: 8 }}>
              {doneQueue.map((token, i) => (
                <div key={token.id} style={{ ...S.row, opacity: 0.55, borderBottom: i < doneQueue.length - 1 ? '1px solid #f0f0ee' : 'none' }}>
                  <div style={{ ...S.tokenCircle, background: '#f0f0ee', color: '#888', fontSize: 12 }}>✓</div>
                  <div style={S.patientInfo}>
                    <div style={S.patientName}>{token.patients?.name}</div>
                    <div style={S.patientMeta}>{token.reason || 'General'}{token.clinic_users?.name && ` · ${token.clinic_users.name}`}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#aaa' }}>Done</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add patient modal */}
      {addOpen && (
        <div style={S.overlay} onClick={() => setAddOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Add patient</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Token assigned automatically</div>
              </div>
              <button style={S.closeBtn} onClick={() => setAddOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd}>
              {canSelectDoctor && doctors.length > 0 && (
                <div style={S.fieldGroup}>
                  <label style={S.label}>Assign to doctor <span style={{ color: '#E24B4A' }}>*</span></label>
                  {doctors.length === 1 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#E1F5EE', borderRadius: 10 }}>
                      <div style={{ ...S.drAvatar }}>{doctors[0].name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{doctors[0].name}</div>
                        {doctors[0].speciality && <div style={{ fontSize: 12, color: '#888' }}>{doctors[0].speciality}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {doctors.map(dr => (
                        <div key={dr.id}
                          style={{ ...S.drCard, ...(form.doctor_id === dr.id ? S.drCardActive : {}) }}
                          onClick={() => setForm(f => ({ ...f, doctor_id: dr.id }))}>
                          <div style={{ ...S.drAvatar, width: 28, height: 28, fontSize: 12, background: form.doctor_id === dr.id ? '#1D9E75' : '#E1F5EE', color: form.doctor_id === dr.id ? '#fff' : '#085041' }}>
                            {dr.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: form.doctor_id === dr.id ? '#085041' : '#1a1a1a' }}>{dr.name}</div>
                            {dr.speciality && <div style={{ fontSize: 11, color: '#aaa' }}>{dr.speciality}</div>}
                          </div>
                          {form.doctor_id === dr.id && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" fill="#1D9E75"/>
                              <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.doctor && <div style={S.errorMsg}>{errors.doctor}</div>}
                </div>
              )}

              <div style={S.fieldGroup}>
                <label style={S.label}>Patient name <span style={{ color: '#E24B4A' }}>*</span></label>
                <input style={{ ...S.input, ...(errors.name ? S.inputError : {}) }}
                  placeholder="e.g. Gurpreet Kaur" value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (errors.name) setErrors(er => ({ ...er, name: '' })); }}
                  autoFocus />
                {errors.name && <div style={S.errorMsg}>{errors.name}</div>}
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Mobile number <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(optional)</span></label>
                <div style={S.phoneWrap}>
                  <span style={S.phonePrefix}>+91</span>
                  <input style={{ ...S.input, ...S.phoneInput, ...(errors.phone ? S.inputError : {}) }}
                    placeholder="98765 43210" value={form.phone}
                    onChange={e => handlePhoneInput(e.target.value)} inputMode="numeric" maxLength={10} />
                </div>
                {errors.phone && <div style={S.errorMsg}>{errors.phone}</div>}
                {!errors.phone && form.phone.length > 0 && form.phone.length < 10 && (
                  <div style={{ ...S.errorMsg, color: '#888' }}>{10 - form.phone.length} more digits needed</div>
                )}
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Reason <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(optional)</span></label>
                <input style={S.input} placeholder="e.g. Fever, BP checkup..."
                  value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>

              <button style={{ ...S.submitBtn, marginTop: 20 }} disabled={adding}>
                {adding ? 'Adding...' : 'Add to queue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { maxWidth: 900 },
  toast: { position: 'fixed', top: 20, right: 20, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  notifBanner: { display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a1a', color: '#fff', padding: '14px 18px', borderRadius: 10, marginBottom: 18 },
  notifDot: { width: 10, height: 10, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 11, color: '#9FE1CB', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 },
  notifMsg: { fontSize: 14, fontWeight: 500 },
  notifClose: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 4 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  date: { fontSize: 13, color: '#888', marginTop: 3 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 },
  statCard: { borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.06)' },
  statVal: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 3, fontWeight: 500 },
  doctorSection: { marginBottom: 20 },
  doctorHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  doctorAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  doctorInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: 10 },
  doctorName: { fontSize: 15, fontWeight: 700, color: '#1a1a1a' },
  doctorCount: { fontSize: 12, color: '#888' },
  statusDot: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  advanceBtn: { width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, marginBottom: 10, cursor: 'pointer', transition: 'opacity 0.15s' },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0ee', fontSize: 13, fontWeight: 500, color: '#444' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', position: 'relative' },
  consultingBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#1D9E75' },
  tokenCircle: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  patientInfo: { flex: 1 },
  patientName: { fontWeight: 600, fontSize: 14, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 },
  consultingPill: { fontSize: 11, background: '#1D9E75', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  patientMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  cancelBtn: { background: 'none', border: '1px solid #e8e8e5', borderRadius: 6, color: '#bbb', padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 },
  doneToggle: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: '4px 0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  closeBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 4 },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 14, color: '#1a1a1a', boxSizing: 'border-box' },
  inputError: { borderColor: '#E24B4A', background: '#fff8f8' },
  errorMsg: { fontSize: 12, color: '#E24B4A', marginTop: 5 },
  phoneWrap: { display: 'flex', alignItems: 'center', border: '1.5px solid #e8e8e5', borderRadius: 8, overflow: 'hidden', background: '#fff' },
  phonePrefix: { padding: '10px 10px 10px 12px', fontSize: 14, color: '#888', borderRight: '1px solid #e8e8e5', background: '#fafaf8', flexShrink: 0 },
  phoneInput: { border: 'none', borderRadius: 0, flex: 1 },
  submitBtn: { width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  drCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' },
  drCardActive: { borderColor: '#1D9E75', background: '#E1F5EE' },
  drAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
};
