import { useState, useEffect, useCallback, useRef } from 'react';
import { api, useAuthStore } from '../lib/api';
import { broadcastQueueUpdate, playPing } from '../lib/notify';
import { printRx } from '../lib/printRx';

// ── Dose picker component ─────────────────────────────────────────────────────
const SLOTS = [
  { key: 'M', label: 'M', title: 'Morning' },
  { key: 'A', label: 'A', title: 'Afternoon' },
  { key: 'E', label: 'E', title: 'Evening' },
  { key: 'N', label: 'N', title: 'Night' },
];

function DosePicker({ value, onChange }) {
  // Parse "1-0-1" or "M-E-N" style or manual string
  // We store as array of 4 booleans [M, A, E, N]
  const [slots, setSlots] = useState(() => parseDose(value));
  const [manual, setManual] = useState(false);
  const [manualVal, setManualVal] = useState(value || '');

  function parseDose(val) {
    if (!val) return [false, false, false, false];
    // Handle "1-0-0-1" or "1-0-1" patterns
    const parts = val.split('-');
    if (parts.length >= 3) {
      return [
        parts[0] === '1',
        parts.length === 4 ? parts[1] === '1' : false,
        parts.length === 4 ? parts[2] === '1' : parts[1] === '1',
        parts.length === 4 ? parts[3] === '1' : parts[2] === '1',
      ];
    }
    return [false, false, false, false];
  }

  function slotsToDose(s) {
    // Output as M-A-E-N → "1-0-1-0"
    return s.map(v => v ? '1' : '0').join('-');
  }

  function toggle(i) {
    const next = slots.map((v, idx) => idx === i ? !v : v);
    setSlots(next);
    const dose = slotsToDose(next);
    setManualVal(dose);
    onChange(dose);
  }

  function handleManual(e) {
    setManualVal(e.target.value);
    onChange(e.target.value);
    // Try to parse back
    const parsed = parseDose(e.target.value);
    setSlots(parsed);
  }

  const activeCount = slots.filter(Boolean).length;

  return (
    <div style={DP.wrap}>
      <div style={DP.pills}>
        {SLOTS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            title={s.title}
            style={{ ...DP.pill, ...(slots[i] ? DP.pillActive : {}) }}
            onClick={() => toggle(i)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          title="Type custom dose"
          style={{ ...DP.pill, ...DP.pillEdit, ...(manual ? DP.pillActive : {}) }}
          onClick={() => setManual(m => !m)}
        >
          ✎
        </button>
      </div>
      {manual && (
        <input
          style={DP.manualInp}
          placeholder="e.g. 1-0-1 or SOS"
          value={manualVal}
          onChange={handleManual}
          autoFocus
        />
      )}
      {!manual && activeCount > 0 && (
        <div style={DP.preview}>
          {slots[0] && <span style={DP.dot}>Morning</span>}
          {slots[1] && <span style={DP.dot}>Afternoon</span>}
          {slots[2] && <span style={DP.dot}>Evening</span>}
          {slots[3] && <span style={DP.dot}>Night</span>}
        </div>
      )}
    </div>
  );
}

const DP = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  pills: { display: 'flex', gap: 4 },
  pill: { width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8e8e5', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#aaa', transition: 'all 0.12s', flexShrink: 0 },
  pillActive: { background: '#1D9E75', borderColor: '#1D9E75', color: '#fff' },
  pillEdit: { fontSize: 12, color: '#888' },
  manualInp: { padding: '5px 8px', border: '1.5px solid #1D9E75', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%' },
  preview: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  dot: { fontSize: 10, color: '#085041', background: '#E1F5EE', padding: '1px 6px', borderRadius: 20 },
};

// ── Main Doctor component ─────────────────────────────────────────────────────
export default function Doctor() {
  const { clinic,user } = useAuthStore();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendSlip, setSendSlip] = useState(true); // WhatsApp slip toggle
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [clinicSettings, setClinicSettings] = useState({});

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dose: '', duration: '' }]);
  const [tests, setTests] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('10:00');
  const [apptNote, setApptNote] = useState('');
  const [focusLastMed, setFocusLastMed] = useState(false);
  const medRefs = useRef([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/consultations/today');
      setPatients(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    api.get('/api/settings').then(r => setClinicSettings(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (focusLastMed) {
      const last = medRefs.current[medicines.length - 1];
      if (last) last.focus();
      setFocusLastMed(false);
    }
  }, [medicines, focusLastMed]);

  useEffect(() => {
  if (patients.length === 0) return;

  // Always find the current consulting patient
  const consulting = patients.find(p => p.status === 'consulting');

  if (!selected) {
    // First load — pick consulting patient, or first active, or first in list
    const firstActive = patients.find(p => !['done', 'cancelled'].includes(p.status));
    selectPatient(consulting || firstActive || patients[0]);
    return;
  }

  // On refresh — if selected patient is done and there's a new consulting patient, switch to them
  const updatedSelected = patients.find(p => p.id === selected.id);
  if (updatedSelected) {
    setSelected(updatedSelected); // Keep selected but update its data
    // Auto-switch to consulting patient if selected is now done
    if (updatedSelected.status === 'done' && consulting) {
      selectPatient(consulting);
    }
  } else if (consulting) {
    selectPatient(consulting);
  }
}, [patients]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }

  function selectPatient(pt) {
    setSelected(pt);
    const today = pt.todayConsultation;
    if (today) {
      setSymptoms(today.symptoms || '');
      setDiagnosis(today.diagnosis || '');
      setMedicines(today.medicines?.length > 0
        ? today.medicines.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        : [{ name: '', dose: '', duration: '' }]);
      setTests(today.tests_ordered?.map(t => t.name) || []);
      setApptDate(today.next_appointment_date || '');
      setApptTime(today.next_appointment_time || '10:00');
      setApptNote(today.next_appointment_note || '');
    } else {
      clearForm();
    }
  }

  function clearForm() {
    setSymptoms(''); setDiagnosis('');
    setMedicines([{ name: '', dose: '', duration: '' }]);
    setTests([]); setTestInput('');
    setApptDate(''); setApptTime('10:00'); setApptNote('');
  }

  function addMedRow() { setMedicines(m => [...m, { name: '', dose: '', duration: '' }]); setFocusLastMed(true); }
  function updateMed(i, field, val) { setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: val } : med)); }
  function removeMed(i) { setMedicines(m => m.filter((_, idx) => idx !== i)); }

  function handleMedKeyDown(e, i, field) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (field === 'name') {
      // Focus duration (skip dose — it's a picker now)
      const dur = document.querySelector(`[data-med-dur="${i}"]`);
      if (dur) dur.focus();
    } else if (field === 'duration') {
      setMedicines(m => [...m, { name: '', dose: '', duration: '' }]);
      setFocusLastMed(true);
    }
  }

  function addTest() { const v = testInput.trim(); if (!v) return; setTests(t => [...t, v]); setTestInput(''); }
  function removeTest(i) { setTests(t => t.filter((_, idx) => idx !== i)); }

  const hasPhone = !!(selected?.patients?.phone && selected.patients.phone.trim());

  async function handleSave(andNext = false) {
    if (!selected) return;
    setSaving(true);
    try {
      const { data: result } = await api.post('/api/consultations', {
        patient_id: selected.patients?.id,
        token_id: selected.id,
        symptoms, diagnosis,
        medicines: medicines.filter(m => m.name.trim()),
        tests: tests.map(name => ({ name })),
        next_appointment_date: apptDate || null,
        next_appointment_time: apptTime || null,
        next_appointment_note: apptNote || null,
        send_whatsapp_slip: sendSlip && hasPhone,
      });

      let toastMsg = 'Consultation saved';
      if (apptDate) toastMsg += ' · Follow-up scheduled';
      if (result?.whatsappSlipSent) toastMsg += ' · Prescription sent on WhatsApp ✓';
      showToast(toastMsg);

      if (andNext) {
        try {
          const { data } = await api.patch(`/api/queue/${selected.id}/next`);
          const nextPatient = data.nextPatient;
          broadcastQueueUpdate({
            action: 'NEXT_PATIENT',
            calledToken: selected.token_number,
            calledName: selected.patients?.name,
            nextToken: nextPatient?.token_number || null,
            nextName: nextPatient?.patients?.name || null,
          });
          playPing();
          if (nextPatient) showToast(`Called #${nextPatient.token_number}`);
          else showToast('All patients done for today!');
        } catch (e) { console.warn('Queue advance error:', e); }
      }

      await load();

      if (andNext) {
        const currentIdx = patients.findIndex(p => p.id === selected.id);
        const nextPt = patients.find((p, i) => i > currentIdx && !['done', 'cancelled'].includes(p.status));
        if (nextPt) selectPatient(nextPt);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  }

  function handlePrint() {
    if (!selected) return;
    const consultationData = {
      symptoms, diagnosis,
      medicines: medicines.filter(m => m.name.trim()).map((m, i) => ({ ...m, sort_order: i })),
      tests_ordered: tests.map((name, i) => ({ name, sort_order: i })),
      next_appointment_date: apptDate || null,
      next_appointment_time: apptTime || null,
      next_appointment_note: apptNote || null,
    };
    const settings = {
      doctor_name: clinicSettings.doctor_name || clinic?.doctor_name || '',
      doctor_qualification: clinicSettings.doctor_qualification || '',
      doctor_registration: clinicSettings.doctor_registration || '',
      phone: clinicSettings.phone || '',
      clinic_address: clinicSettings.clinic_address || '',
      clinic_timings: clinicSettings.clinic_timings || '',
      rx_template: clinicSettings.rx_template || 'classic',
      rx_color: clinicSettings.rx_color || '#1D9E75',
      rx_footer_note: clinicSettings.rx_footer_note || '',
    };
    printRx(consultationData, { name: selected.patients?.name || '', phone: selected.patients?.phone || '', visit_count: selected.patients?.visit_count || 1 }, settings);
  }

  const activePts = patients.filter(p => !['done', 'cancelled'].includes(p.status));
  const donePts = patients.filter(p => p.status === 'done');
  const prev = selected?.previousConsultation;

  return (
    <div style={S.page}>
      {toast.msg && <div style={{ ...S.toast, background: toast.type === 'error' ? '#A32D2D' : '#1a1a1a' }}>{toast.msg}</div>}

      <div style={S.header}>
        <div>
          <h1 style={S.title}>Doctor view</h1>
          <p style={S.sub}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}{user?.name ? ` · ${user.name}` : ''}</p>
        </div>
        <div style={S.headerStats}>
          <div style={S.hstat}><span style={{ color: '#1D9E75', fontWeight: 700 }}>{activePts.length}</span> waiting</div>
          <div style={S.hstat}><span style={{ color: '#888', fontWeight: 700 }}>{donePts.length}</span> done</div>
        </div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>
        : patients.length === 0 ? (
          <div style={S.emptyFull}><p style={{ color: '#888' }}>No patients today.</p><p style={{ color: '#aaa', fontSize: 13, marginTop: 6 }}>Add from Queue tab.</p></div>
        ) : (
          <div style={S.layout}>
            <div style={S.sidebar}>
              <div style={S.sidebarHead}>Today's patients</div>
              {activePts.map(pt => {
                const isSel = selected?.id === pt.id;
                const isCons = pt.status === 'consulting';
                return (
                  <div key={pt.id} style={{ ...S.ptItem, ...(isSel ? S.ptItemActive : {}), ...(isCons ? S.ptItemConsulting : {}) }} onClick={() => selectPatient(pt)}>
                    <div style={{ ...S.ptNum, background: isCons ? '#1D9E75' : '#E1F5EE', color: isCons ? '#fff' : '#085041' }}>{pt.token_number}</div>
                    <div style={S.ptInfo}>
                      <div style={S.ptName}>{pt.patients?.name}</div>
                      <div style={S.ptMeta}>{pt.reason || 'General'}{pt.patients?.visit_count > 1 && ` · ${pt.patients.visit_count}v`}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      {isCons && <span style={S.nowBadge}>Now</span>}
                      {pt.todayConsultation && <span style={S.savedDot}>✓</span>}
                    </div>
                  </div>
                );
              })}
              {donePts.length > 0 && <div style={S.doneDivider}>Done ({donePts.length})</div>}
              {donePts.map(pt => (
                <div key={pt.id} style={{ ...S.ptItem, opacity: 0.5 }} onClick={() => selectPatient(pt)}>
                  <div style={{ ...S.ptNum, background: '#f0f0ee', color: '#888' }}>✓</div>
                  <div style={S.ptInfo}><div style={S.ptName}>{pt.patients?.name}</div><div style={S.ptMeta}>{pt.reason || 'General'}</div></div>
                </div>
              ))}
            </div>

            {selected ? (
              <div style={S.main}>
                <div style={S.mainHead}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={S.avatar}>{selected.patients?.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                    <div>
                      <div style={S.ptNameBig}>{selected.patients?.name}</div>
                      <div style={S.ptDetailSub}>
                        {selected.patients?.phone && selected.patients.phone !== '' && `${selected.patients.phone} · `}
                        {selected.patients?.visit_count} visit{selected.patients?.visit_count !== 1 ? 's' : ''}
                        {selected.reason && ` · ${selected.reason}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {prev && <div style={S.prevBadge}>Last: {new Date(prev.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                    {hasPhone && (
                      <div style={S.slipToggle} onClick={() => setSendSlip(s => !s)} title="Send prescription to patient's WhatsApp on save">
                        <div style={{ ...S.slipDot, background: sendSlip ? '#1D9E75' : '#ddd' }} />
                        <span style={{ fontSize: 11, color: sendSlip ? '#085041' : '#aaa', fontWeight: 500 }}>
                          {sendSlip ? 'Slip on WhatsApp ✓' : 'Slip off'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={S.formBody}>
                  {prev && (
                    <div style={S.sectionCard}>
                      <div style={S.sectionHead}><ClockIcon /> Last visit — {new Date(prev.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div style={S.sectionBody}>
                        {prev.diagnosis && (<><div style={S.prevLabel}>Diagnosis</div><div style={S.prevRecord}>{prev.diagnosis}</div></>)}
                        {prev.medicines?.length > 0 && (<><div style={{ ...S.prevLabel, marginTop: 10 }}>Medicines</div><div style={S.prevRecord}>{prev.medicines.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(m => `${m.name}${m.dose ? ` — ${m.dose}` : ''}${m.duration ? ` (${m.duration})` : ''}`).join(' · ')}</div></>)}
                        {prev.tests_ordered?.length > 0 && (<><div style={{ ...S.prevLabel, marginTop: 10 }}>Tests</div><div style={S.prevRecord}>{prev.tests_ordered.map(t => t.name).join(' · ')}</div></>)}
                      </div>
                    </div>
                  )}

                  <div style={S.sectionCard}>
                    <div style={S.sectionHead}><PlusIcon /> Symptoms &amp; diagnosis</div>
                    <div style={S.sectionBody}>
                      <label style={S.fieldLabel}>Symptoms</label>
                      <textarea style={{ ...S.inp, marginBottom: 10 }} rows={2} placeholder="Patient complaints..." value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                      <label style={S.fieldLabel}>Diagnosis / notes</label>
                      <textarea style={S.inp} rows={2} placeholder="Diagnosis, BP reading, findings..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                    </div>
                  </div>

                  {/* ── Medicines with dose picker ── */}
                  <div style={S.sectionCard}>
                    <div style={S.sectionHead}><PillIcon /> Medicines prescribed</div>
                    <div style={S.sectionBody}>
                      <div style={S.medHeader}>
                        <span style={{ flex: 2, ...S.colLabel }}>Medicine</span>
                        <span style={{ flex: 1, ...S.colLabel }}>Dose (M·A·E·N)</span>
                        <span style={{ flex: 1, ...S.colLabel }}>Duration</span>
                        <span style={{ width: 28 }} />
                      </div>
                      {medicines.map((med, i) => (
                        <div key={i} style={S.medRow}>
                          <input
                            ref={el => { medRefs.current[i] = el; }}
                            style={{ ...S.medInp, flex: 2 }}
                            placeholder="Medicine name"
                            value={med.name}
                            onChange={e => updateMed(i, 'name', e.target.value)}
                            onKeyDown={e => handleMedKeyDown(e, i, 'name')}
                          />
                          <div style={{ flex: 1 }}>
                            <DosePicker
                              value={med.dose}
                              onChange={val => updateMed(i, 'dose', val)}
                            />
                          </div>
                          <input
                            style={S.medInp}
                            placeholder="30 days"
                            value={med.duration}
                            onChange={e => updateMed(i, 'duration', e.target.value)}
                            onKeyDown={e => handleMedKeyDown(e, i, 'duration')}
                            data-med-dur={i}
                          />
                          {medicines.length > 1 && (
                            <button style={S.removeBtn} onClick={() => removeMed(i)} tabIndex={-1}>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <div style={S.medHint}>M = Morning · A = Afternoon · E = Evening · N = Night · Press ✎ to type custom</div>
                      <button style={S.addRowBtn} onClick={addMedRow}>+ Add medicine</button>
                    </div>
                  </div>

                  <div style={S.sectionCard}>
                    <div style={S.sectionHead}><FlaskIcon /> Tests ordered</div>
                    <div style={S.sectionBody}>
                      {tests.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {tests.map((t, i) => (
                            <div key={i} style={S.testChip}>{t}<button style={S.chipRemove} onClick={() => removeTest(i)}>×</button></div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input style={{ ...S.medInp, flex: 1 }} placeholder="Type test name and press Enter..." value={testInput} onChange={e => setTestInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTest(); } }} />
                        <button style={S.addTestBtn} onClick={addTest}>Add</button>
                      </div>
                    </div>
                  </div>

                  <div style={S.sectionCard}>
                    <div style={S.sectionHead}><CalIcon /> Next appointment</div>
                    <div style={S.sectionBody}>
                      <div style={S.apptRow}>
                        <div style={{ flex: 1 }}><label style={S.fieldLabel}>Date</label><input style={S.medInp} type="date" value={apptDate} min={new Date().toISOString().split('T')[0]} onChange={e => setApptDate(e.target.value)} /></div>
                        <div style={{ flex: 1 }}><label style={S.fieldLabel}>Time</label><input style={S.medInp} type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} /></div>
                        <div style={{ flex: 2 }}><label style={S.fieldLabel}>Note</label><input style={S.medInp} placeholder="e.g. Follow-up BP check" value={apptNote} onChange={e => setApptNote(e.target.value)} /></div>
                      </div>
                      {apptDate && <div style={S.apptHint}>WhatsApp reminder will be sent on {new Date(apptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at 9:00 AM</div>}
                    </div>
                  </div>
                </div>

                <div style={S.footer}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button style={S.btnClear} onClick={clearForm}>Clear</button>
                    <button style={S.btnPrint} onClick={handlePrint}><PrintIcon /> Print Rx</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={S.btnSave} onClick={() => handleSave(false)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    <button style={S.btnNext} onClick={() => handleSave(true)} disabled={saving}>Save &amp; call next →</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={S.emptyMain}>Select a patient</div>
            )}
          </div>
        )}
    </div>
  );
}

function ClockIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#888" strokeWidth="1.2"/><path d="M6.5 4v3l2 1" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function PillIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="4" width="9" height="5" rx="2.5" stroke="#888" strokeWidth="1.2" fill="none"/><path d="M6.5 4v5" stroke="#888" strokeWidth="1.2"/></svg>; }
function FlaskIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.5 2v4.5L2 10.5h9L8.5 6.5V2" stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M3.5 2h6" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function CalIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="2.5" width="10" height="9" rx="1.5" stroke="#888" strokeWidth="1.2" fill="none"/><path d="M1.5 5.5h10M4.5 1.5v2M8.5 1.5v2" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function PrintIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ marginRight: 4 }}><rect x="1.5" y="4.5" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M3.5 4.5V2.5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 10.5v-2h6v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }

const S = {
  page: { maxWidth: 1100 },
  toast: { position: 'fixed', top: 20, right: 20, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  headerStats: { display: 'flex', gap: 16 },
  hstat: { fontSize: 14, color: '#888' },
  emptyFull: { padding: '60px 0', textAlign: 'center' },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', minHeight: 600 },
  sidebar: { background: '#f8fffe', borderRight: '1px solid rgba(0,0,0,0.07)', overflowY: 'auto' },
  sidebarHead: { padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid rgba(0,0,0,0.07)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  ptItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  ptItemActive: { background: '#fff', borderLeft: '3px solid #1D9E75' },
  ptItemConsulting: { background: '#fff' },
  ptNum: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  ptInfo: { flex: 1, minWidth: 0 },
  ptName: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  ptMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  nowBadge: { fontSize: 10, background: '#1D9E75', color: '#fff', padding: '2px 6px', borderRadius: 20, fontWeight: 600 },
  savedDot: { fontSize: 11, color: '#1D9E75', fontWeight: 700 },
  doneDivider: { padding: '6px 16px', fontSize: 11, color: '#aaa', fontWeight: 600, background: '#f0f0ee', textTransform: 'uppercase' },
  main: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  mainHead: { padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  ptNameBig: { fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  ptDetailSub: { fontSize: 12, color: '#888', marginTop: 2 },
  prevBadge: { fontSize: 11, background: '#E1F5EE', color: '#085041', padding: '3px 10px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' },
  slipToggle: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', background: '#fff' },
  slipDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, transition: 'background 0.2s' },
  formBody: { flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  sectionCard: { border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' },
  sectionHead: { padding: '9px 14px', background: '#fafaf8', borderBottom: '1px solid rgba(0,0,0,0.07)', fontSize: 12, fontWeight: 600, color: '#555', display: 'flex', alignItems: 'center', gap: 6 },
  sectionBody: { padding: 14 },
  prevLabel: { fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 },
  prevRecord: { background: '#f8fffe', border: '1px solid #E1F5EE', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#333', lineHeight: 1.6 },
  fieldLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 },
  inp: { width: '100%', padding: '9px 11px', border: '1.5px solid #e8e8e5', borderRadius: 7, fontSize: 13, color: '#1a1a1a', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  medHeader: { display: 'flex', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f0f0ee' },
  colLabel: { fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' },
  medRow: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  medInp: { flex: 1, padding: '9px 10px', border: '1.5px solid #e8e8e5', borderRadius: 7, fontSize: 13, outline: 'none', color: '#1a1a1a', width: '100%' },
  medHint: { fontSize: 11, color: '#aaa', marginBottom: 8, lineHeight: 1.5 },
  removeBtn: { background: 'none', border: '1px solid #e8e8e5', borderRadius: 6, color: '#ccc', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  addRowBtn: { fontSize: 13, color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 0' },
  testChip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E1F5EE', color: '#085041', fontSize: 12, padding: '5px 10px', borderRadius: 20, fontWeight: 500 },
  chipRemove: { background: 'none', border: 'none', color: '#0F6E56', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 },
  addTestBtn: { padding: '8px 16px', background: '#fff', border: '1.5px solid #1D9E75', borderRadius: 7, color: '#1D9E75', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  apptRow: { display: 'flex', gap: 10 },
  apptHint: { marginTop: 10, fontSize: 12, color: '#1D9E75', background: '#E1F5EE', padding: '7px 12px', borderRadius: 7 },
  footer: { padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', flexShrink: 0 },
  btnClear: { padding: '8px 14px', background: '#fff', border: '1.5px solid #e8e8e5', borderRadius: 8, fontSize: 13, color: '#888', cursor: 'pointer' },
  btnPrint: { display: 'flex', alignItems: 'center', padding: '8px 14px', background: '#fff', border: '1.5px solid #1D9E75', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1D9E75', cursor: 'pointer' },
  btnSave: { padding: '9px 20px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnNext: { padding: '9px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  emptyMain: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#aaa', fontSize: 14 },
};
