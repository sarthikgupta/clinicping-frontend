import { useState, useEffect } from 'react';
import { api, useAuthStore } from '../lib/api';
import { printRx } from '../lib/printRx';

const TEMPLATES = [
  { key: 'classic', label: 'Classic', desc: 'Green header, traditional layout' },
  { key: 'modern', label: 'Modern', desc: 'Clean, numbered medicines, chips' },
  { key: 'minimal', label: 'Minimal', desc: 'Compact, typewriter style' },
];
const COLORS = [
  { hex: '#1D9E75', name: 'Green' },
  { hex: '#185FA5', name: 'Blue' },
  { hex: '#712B13', name: 'Maroon' },
  { hex: '#3C3489', name: 'Purple' },
  { hex: '#444441', name: 'Charcoal' },
];
const SAMPLE = {
  symptoms: 'Headaches, dizziness',
  diagnosis: 'Hypertension Stage 1. BP: 142/90.',
  medicines: [
    { name: 'Amlodipine 5mg', dose: '1-0-0-0', duration: '30 days', sort_order: 0 },
    { name: 'Telma 40mg', dose: '0-0-0-1', duration: '30 days', sort_order: 1 },
  ],
  tests_ordered: [{ name: 'Lipid Profile', sort_order: 0 }, { name: 'ECG', sort_order: 1 }],
  next_appointment_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  next_appointment_note: 'Follow-up BP check',
};
const SAMPLE_PT = { name: 'Gurpreet Kaur', phone: '9988776655', visit_count: 4 };

function genUsername(name) {
  return name.toLowerCase().replace(/^dr\.?\s*/i, 'dr.').replace(/\s+/g, '.').replace(/[^a-z0-9_.]/g, '').slice(0, 20);
}

export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';

  const allTabs = [
    { key: 'profile', label: 'My profile', roles: ['admin', 'doctor', 'receptionist'] },
    { key: 'password', label: 'Password', roles: ['admin', 'doctor', 'receptionist'] },
    { key: 'clinic', label: 'Clinic', roles: ['admin'] },
    { key: 'rx', label: 'Prescription', roles: ['admin'] },
    { key: 'staff', label: 'Staff', roles: ['admin'] },
  ];
  const tabs = allTabs.filter(t => t.roles.includes(user?.role));
  const [tab, setTab] = useState('profile');

  const [clinicForm, setClinicForm] = useState({ name: '', doctor_name: '', doctor_qualification: '', doctor_registration: '', phone: '', city: '', clinic_address: '', clinic_timings: '', rx_template: 'classic', rx_color: '#1D9E75', rx_footer_note: '', clinic_code: '' });
  const [clinicCodeInput, setClinicCodeInput] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', username: '', qualification: '', registration_no: '', speciality: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', password: '', role: 'receptionist', qualification: '', registration_no: '', speciality: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  useEffect(() => {
    const loads = [
      api.get('/api/settings/profile').then(r => setProfileForm({ name: r.data.name || '', username: r.data.username || '', qualification: r.data.qualification || '', registration_no: r.data.registration_no || '', speciality: r.data.speciality || '' }))
    ];
    if (isAdmin) {
      loads.push(api.get('/api/settings').then(r => setClinicForm(f => ({ ...f, ...r.data }))));
      loads.push(api.get('/api/settings/users').then(r => setUsers(r.data)));
    }
    Promise.all(loads).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3500); }
  const setC = k => e => setClinicForm(f => ({ ...f, [k]: e.target.value }));

  async function saveClinic(e) {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/api/settings', clinicForm); showToast('Saved'); }
    catch { showToast('Save failed', 'error'); } finally { setSaving(false); }
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/api/settings/profile', profileForm); showToast('Profile updated'); }
    catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); } finally { setSaving(false); }
  }

  async function changePassword(e) {
    e.preventDefault(); setPwError('');
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return; }
    if (pwForm.new_password.length < 6) { setPwError('Min 6 characters'); return; }
    setSaving(true);
    try {
      await api.post('/api/settings/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      showToast('Password changed');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { setPwError(err.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  }

  async function updateClinicCode() {
    if (!clinicCodeInput || clinicCodeInput.length < 3) { showToast('Min 3 characters', 'error'); return; }
    try {
      const { data } = await api.patch('/api/settings', { clinic_code: clinicCodeInput });
      setClinicForm(f => ({ ...f, clinic_code: data.clinic_code }));
      setClinicCodeInput('');
      showToast('Clinic code updated ✓');
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  async function addUser(e) {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await api.post('/api/settings/users', newUser);
      setUsers(u => [...u, data]);
      setNewUser({ name: '', username: '', email: '', password: '', role: 'receptionist', qualification: '', registration_no: '', speciality: '' });
      setShowAddUser(false);
      showToast(`${data.name} added`);
      } catch (err) { 
    showToast(err.response?.data?.message || err.response?.data?.error || 'Failed', 'error'); 
  }
  }

  async function toggleActive(u) {
    try {
      const { data } = await api.patch(`/api/settings/users/${u.id}`, { is_active: !u.is_active });
      setUsers(us => us.map(u2 => u2.id === data.id ? data : u2));
      showToast(data.is_active ? `${data.name} activated` : `${data.name} deactivated`);
    } catch { showToast('Failed', 'error'); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;

  return (
    <div style={S.page}>
      {toast.msg && <div style={{ ...S.toast, background: toast.type === 'error' ? '#A32D2D' : '#1a1a1a' }}>{toast.msg}</div>}

      <h1 style={S.title}>Settings</h1>
      <p style={S.sub}>{user?.name} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></p>

      {/* Tabs — scrollable on mobile */}
      <div style={S.tabs} className='cp-settings-tabs'>
        {tabs.map(t => (
          <button key={t.key} style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MY PROFILE ── */}
      {tab === 'profile' && (
        <form onSubmit={saveProfile}>
          <div style={S.card}>
            <div style={S.cardHead}>My profile</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Display name *" placeholder="Your name" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fl}>Username <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>— for login</span></label>
                  <div style={{ position: 'relative' }}>
                    <span style={S.at}>@</span>
                    <input style={{ ...S.input, paddingLeft: 26, fontFamily: 'monospace' }} value={profileForm.username || ''} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))} placeholder="your.username" />
                  </div>
                </div>
              </div>
              {(isDoctor || isAdmin) && (
                <>
                  <div style={S.row2}>
                    <Field label="Qualification" placeholder="MBBS, MD" value={profileForm.qualification} onChange={e => setProfileForm(f => ({ ...f, qualification: e.target.value }))} />
                    <Field label="Registration no." placeholder="PMC-XXXX" value={profileForm.registration_no} onChange={e => setProfileForm(f => ({ ...f, registration_no: e.target.value }))} />
                  </div>
                  <Field label="Speciality" placeholder="General Medicine" value={profileForm.speciality} onChange={e => setProfileForm(f => ({ ...f, speciality: e.target.value }))} />
                </>
              )}
              <div style={S.ro}><div style={S.rl}>Email</div><div style={S.rv}>{user?.email || '—'}</div></div>
              <div style={{ ...S.ro, marginBottom: 0 }}><div style={S.rl}>Role</div><div style={{ ...S.rv, textTransform: 'capitalize' }}>{user?.role}</div></div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        </form>
      )}

      {/* ── PASSWORD ── */}
      {tab === 'password' && (
        <form onSubmit={changePassword}>
          <div style={S.card}>
            <div style={S.cardHead}>Change password</div>
            <div style={S.cardBody}>
              {pwError && <div style={S.errBox}>{pwError}</div>}
              <Field label="Current password *" type="password" placeholder="Current password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
              <div style={S.row2}>
                <Field label="New password *" type="password" placeholder="Min 6 chars" value={pwForm.new_password} onChange={e => { setPwForm(f => ({ ...f, new_password: e.target.value })); setPwError(''); }} required />
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fl}>Confirm new password *</label>
                  <input style={{ ...S.input, borderColor: pwForm.confirm_password ? pwForm.new_password === pwForm.confirm_password ? '#1D9E75' : '#E24B4A' : '#e8e8e5' }} type="password" placeholder="Repeat" value={pwForm.confirm_password} onChange={e => { setPwForm(f => ({ ...f, confirm_password: e.target.value })); setPwError(''); }} required />
                </div>
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Changing...' : 'Change password'}</button>
        </form>
      )}

      {/* ── CLINIC ── */}
      {tab === 'clinic' && isAdmin && (
        <form onSubmit={saveClinic}>
          {/* Clinic code card */}
          <div style={S.card}>
            <div style={S.cardHead}>Staff login code</div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.14em', color: '#1D9E75', background: '#E1F5EE', padding: '12px 20px', borderRadius: 10, fontFamily: 'monospace', border: '2px dashed #9FE1CB', flexShrink: 0 }}>
                  {clinicForm.clinic_code || '—'}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Share with your staff</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 10 }}>
                    Staff go to <strong>clinicping.space</strong> → enter this code + username + password
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      style={{ ...S.input, width: 130, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}
                      placeholder="Change code"
                      value={clinicCodeInput}
                      onChange={e => setClinicCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      maxLength={10}
                    />
                    <button type="button" style={{ padding: '10px 14px', background: '#fff', border: '1.5px solid #1D9E75', borderRadius: 8, color: '#1D9E75', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={updateClinicCode}>Update</button>
                    <button type="button" style={{ padding: '10px 14px', background: '#f5f5f3', border: 'none', borderRadius: 8, color: '#444', fontSize: 13, cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(clinicForm.clinic_code || ''); showToast('Copied!'); }}>Copy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHead}>Clinic details</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Clinic name *" placeholder="Dr. Bhalla Clinic" value={clinicForm.name} onChange={setC('name')} required />
                <Field label="City" placeholder="Nabha" value={clinicForm.city} onChange={setC('city')} />
              </div>
              <Field label="Phone" placeholder="9988776655" value={clinicForm.phone} onChange={setC('phone')} />
              <Field label="Full address" placeholder="House No. 123, Civil Lines, Nabha" value={clinicForm.clinic_address} onChange={setC('clinic_address')} />
              <Field label="Clinic timings" placeholder="Mon–Sat: 9AM–1PM, 5PM–8PM" value={clinicForm.clinic_timings} onChange={setC('clinic_timings')} />
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHead}>Primary doctor (for prescriptions)</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Doctor name" placeholder="Dr. Anumeha Bhalla" value={clinicForm.doctor_name} onChange={setC('doctor_name')} />
                <Field label="Qualification" placeholder="MBBS, MD" value={clinicForm.doctor_qualification} onChange={setC('doctor_qualification')} />
              </div>
              <div style={S.row2}>
                <Field label="Registration no." placeholder="PMC-2019-XXXXX" value={clinicForm.doctor_registration} onChange={setC('doctor_registration')} />
                <Field label="Rx footer note" placeholder="Take medicines after food" value={clinicForm.rx_footer_note} onChange={setC('rx_footer_note')} />
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save clinic settings'}</button>
        </form>
      )}

      {/* ── PRESCRIPTION ── */}
      {tab === 'rx' && isAdmin && (
        <form onSubmit={saveClinic}>
          <div style={S.card}>
            <div style={S.cardHead}>Choose template</div>
            <div style={S.cardBody}>
              <div style={S.tplGrid}>
                {TEMPLATES.map(t => (
                  <div key={t.key}>
                    <div style={{ ...S.tplCard, ...(clinicForm.rx_template === t.key ? { borderColor: '#1D9E75' } : {}) }} onClick={() => setClinicForm(f => ({ ...f, rx_template: t.key }))}>
                      <TplPreview type={t.key} color={clinicForm.rx_color} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.desc}</div>
                        </div>
                        {clinicForm.rx_template === t.key && <div style={{ width: 18, height: 18, borderRadius: '50%', background: clinicForm.rx_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                      </div>
                    </div>
                    <button type="button" style={S.previewBtn} onClick={() => printRx(SAMPLE, SAMPLE_PT, { ...clinicForm, rx_template: t.key, doctor_name: clinicForm.doctor_name || user?.name })}>Preview →</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Header colour</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {COLORS.map(c => (
                  <div key={c.hex} title={c.name} style={{ width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', background: c.hex, border: clinicForm.rx_color === c.hex ? '3px solid #1a1a1a' : '2px solid transparent', transform: clinicForm.rx_color === c.hex ? 'scale(1.15)' : 'none', transition: 'all 0.15s' }} onClick={() => setClinicForm(f => ({ ...f, rx_color: c.hex }))} />
                ))}
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save template'}</button>
        </form>
      )}

      {/* ── STAFF ── */}
      {tab === 'staff' && isAdmin && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button style={{ padding: '10px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowAddUser(true)}>+ Add staff</button>
          </div>

          {[
            { label: 'Doctors', list: users.filter(u => u.role === 'doctor') },
            { label: 'Receptionists', list: users.filter(u => u.role === 'receptionist') },
            { label: 'Admins', list: users.filter(u => u.role === 'admin') },
          ].filter(g => g.list.length > 0).map(({ label, list }) => (
            <div key={label} style={S.card}>
              <div style={S.cardHead}>{label} ({list.length})</div>
              {list.map(u => <UserRow key={u.id} u={u} onSave={d => setUsers(us => us.map(u2 => u2.id === d.id ? d : u2))} onToggle={toggleActive} showToast={showToast} />)}
            </div>
          ))}

          {showAddUser && (
            <Modal title="Add staff member" onClose={() => setShowAddUser(false)}>
              <form onSubmit={addUser}>
                <div style={S.row2}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fl}>Full name *</label>
                    <input style={S.input} placeholder="Dr. Rajendra Singh" value={newUser.name}
                      onChange={e => { const n = e.target.value; setNewUser(u => ({ ...u, name: n, username: u.username === genUsername(u.name) ? genUsername(n) : u.username })); }} required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fl}>Username * <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>for login</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={S.at}>@</span>
                      <input style={{ ...S.input, paddingLeft: 26, fontFamily: 'monospace' }} placeholder="dr.rajendra" value={newUser.username}
                        onChange={e => setNewUser(u => ({ ...u, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))} required />
                    </div>
                  </div>
                </div>
                <div style={S.row2}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fl}>Role *</label>
                    <select style={S.input} value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} required>
                      <option value="receptionist">Receptionist</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fl}>Email <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                    <input style={S.input} type="email" placeholder="optional" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
                  </div>
                </div>
                <Field label="Password *" type="password" placeholder="Min 6 characters" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required />
                {newUser.role === 'doctor' && (
                  <>
                    <div style={S.row2}>
                      <Field label="Qualification" placeholder="MBBS, MD" value={newUser.qualification} onChange={e => setNewUser(u => ({ ...u, qualification: e.target.value }))} />
                      <Field label="Reg. no." placeholder="PMC-XXXX" value={newUser.registration_no} onChange={e => setNewUser(u => ({ ...u, registration_no: e.target.value }))} />
                    </div>
                    <Field label="Speciality" placeholder="General Medicine" value={newUser.speciality} onChange={e => setNewUser(u => ({ ...u, speciality: e.target.value }))} />
                  </>
                )}
                <button style={{ ...S.saveBtn, width: '100%', marginTop: 8 }} disabled={saving}>{saving ? 'Adding...' : 'Add staff member'}</button>
              </form>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

// ── User row (expandable) ─────────────────────────────────────────────────────
function UserRow({ u, onSave, onToggle, showToast }) {
  const [open, setOpen] = useState(false);
  const [ef, setEf] = useState({ name: u.name || '', username: u.username || '', qualification: u.qualification || '', registration_no: u.registration_no || '', speciality: u.speciality || '' });
  const [pw, setPw] = useState('');
  const [sv, setSv] = useState(false);
  const [psv, setPsv] = useState(false);
  const [rt, setRt] = useState('');

  function rowToast(m) { setRt(m); setTimeout(() => setRt(''), 3000); }

  async function save(e) {
    e.preventDefault();
    if (ef.username && !/^[a-z0-9_.]{3,20}$/.test(ef.username)) { rowToast('Invalid username format'); return; }
    setSv(true);
    try {
      const { data } = await api.patch(`/api/settings/users/${u.id}`, ef);
      onSave(data); rowToast('Saved ✓');
    } catch (err) { rowToast(err.response?.data?.error || 'Failed'); } finally { setSv(false); }
  }

  async function resetPw(e) {
    e.preventDefault();
    if (pw.length < 6) { rowToast('Min 6 characters'); return; }
    setPsv(true);
    try {
      await api.post(`/api/settings/users/${u.id}/reset-password`, { new_password: pw });
      setPw(''); rowToast('Password reset ✓');
    } catch (err) { rowToast(err.response?.data?.error || 'Failed'); } finally { setPsv(false); }
  }

  const RC = { admin: { bg: '#E1F5EE', color: '#085041' }, doctor: { bg: '#E6F1FB', color: '#0C447C' }, receptionist: { bg: '#FAEEDA', color: '#854F0B' } };
  const rc = RC[u.role] || RC.receptionist;

  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{u.name?.charAt(0)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {u.name}
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: rc.bg, color: rc.color }}>{u.role}</span>
            {!u.is_active && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '2px 7px', borderRadius: 20 }}>Inactive</span>}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {u.username && <span style={{ fontFamily: 'monospace', background: '#f5f5f3', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>@{u.username}</span>}
            {u.email && <span>{u.email}</span>}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', color: '#ccc', flexShrink: 0 }}>
          <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', background: '#fafaf8' }}>
          {rt && <div style={{ background: '#1a1a1a', color: '#fff', padding: '7px 12px', borderRadius: 8, fontSize: 12, margin: '10px 0' }}>{rt}</div>}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 14, marginBottom: 10 }}>Profile</div>
          <form onSubmit={save}>
            <div style={US.row2}>
              <div style={{ marginBottom: 10 }}>
                <label style={US.label}>Name *</label>
                <input style={US.inp} value={ef.name} onChange={e => setEf(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={US.label}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}>@</span>
                  <input style={{ ...US.inp, paddingLeft: 22, fontFamily: 'monospace' }} value={ef.username} onChange={e => setEf(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))} placeholder="username" />
                </div>
              </div>
            </div>
            {u.role === 'doctor' && (
              <div style={US.row2}>
                <div style={{ marginBottom: 10 }}><label style={US.label}>Qualification</label><input style={US.inp} value={ef.qualification} onChange={e => setEf(f => ({ ...f, qualification: e.target.value }))} /></div>
                <div style={{ marginBottom: 10 }}><label style={US.label}>Reg. no.</label><input style={US.inp} value={ef.registration_no} onChange={e => setEf(f => ({ ...f, registration_no: e.target.value }))} /></div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={US.btn} disabled={sv}>{sv ? '...' : 'Save'}</button>
              <button type="button" style={{ ...US.btn, background: u.is_active ? '#FCEBEB' : '#E1F5EE', color: u.is_active ? '#A32D2D' : '#085041' }} onClick={() => onToggle(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
            </div>
          </form>
          <div style={{ borderTop: '1px solid #eee', marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Reset password</div>
            <form onSubmit={resetPw} style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...US.inp, flex: 1 }} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password (min 6)" />
              <button type="submit" style={{ ...US.btn, background: '#1a1a1a', color: '#fff', flexShrink: 0 }} disabled={psv}>{psv ? '...' : 'Reset'}</button>
            </form>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>Login: code <strong>{'{clinic code}'}</strong> + @{u.username || 'username'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const US = {
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 },
  inp: { width: '100%', padding: '8px 10px', border: '1.5px solid #e8e8e5', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' },
  btn: { padding: '8px 16px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};

function Field({ label, placeholder, value, onChange, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.fl}>{label}</label>
      <input style={S.input} type={type} placeholder={placeholder} value={value || ''} onChange={onChange} required={required} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <button style={{ background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TplPreview({ type, color }) {
  const c = color || '#1D9E75';
  if (type === 'classic') return <div style={{ height: 110, border: '1px solid #eee', borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}><div style={{ height: 26, background: c }} /><div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>{[90, 60, 80].map((w, i) => <div key={i} style={{ height: 4, background: i === 2 ? c + '33' : '#eee', borderRadius: 2, width: `${w}%` }} />)}</div></div>;
  if (type === 'modern') return <div style={{ height: 110, border: '1px solid #eee', borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}><div style={{ height: 4, background: c }} /><div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}><div style={{ height: 5, background: '#1a1a1a', borderRadius: 2, width: '50%' }} /><div style={{ height: 10, background: c + '18', borderRadius: 4 }} />{[1,2].map(i => <div key={i} style={{ display: 'flex', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} /><div style={{ height: 4, background: '#eee', borderRadius: 2, flex: 1, marginTop: 3 }} /></div>)}</div></div>;
  return <div style={{ height: 110, border: '1px solid #eee', borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}><div style={{ borderBottom: '2px solid #1a1a1a', padding: '7px 10px' }}><div style={{ height: 5, background: '#333', borderRadius: 2, width: '55%' }} /></div><div style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}><div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700 }}>℞</div>{[70, 55].map((w, i) => <div key={i} style={{ height: 3, background: '#ddd', borderRadius: 2, width: `${w}%` }} />)}</div></div>;
}

const S = {
  page: { maxWidth: 720 },
  toast: { position: 'fixed', top: 20, right: 20, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 20 },
  tabs: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4 },
  tab: { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#666', whiteSpace: 'nowrap' },
  tabActive: { background: '#1D9E75', color: '#fff', border: '1px solid #1D9E75' },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  cardHead: { padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fafaf8' },
  cardBody: { padding: '14px 16px 2px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  fl: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 13, color: '#1a1a1a', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
  at: { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13, pointerEvents: 'none' },
  saveBtn: { padding: '10px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 },
  ro: { background: '#fafaf8', border: '1px solid #e8e8e5', borderRadius: 8, padding: '9px 13px', marginBottom: 12 },
  rl: { fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 },
  rv: { fontSize: 13, color: '#555' },
  errBox: { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  tplGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  tplCard: { border: '2px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 10, cursor: 'pointer' },
  previewBtn: { width: '100%', marginTop: 6, padding: '7px', background: '#fff', border: '1px solid #1D9E75', borderRadius: 7, color: '#1D9E75', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
