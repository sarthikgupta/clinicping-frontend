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

const SAMPLE_CONSULTATION = {
  symptoms: 'Morning headaches, occasional dizziness',
  diagnosis: 'Hypertension Stage 1. BP: 142/90.',
  medicines: [
    { name: 'Amlodipine 5mg', dose: '1-0-0-0', duration: '30 days', sort_order: 0 },
    { name: 'Telma 40mg', dose: '0-0-0-1', duration: '30 days', sort_order: 1 },
  ],
  tests_ordered: [{ name: 'Lipid Profile', sort_order: 0 }, { name: 'ECG', sort_order: 1 }],
  next_appointment_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  next_appointment_note: 'Follow-up BP check',
};
const SAMPLE_PATIENT = { name: 'Gurpreet Kaur', phone: '9988776655', visit_count: 4 };

function generateUsername(name) {
  return name.toLowerCase()
    .replace(/^dr\.?\s*/i, 'dr.')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
}

export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';

  const allTabs = [
    { key: 'profile', label: 'My profile', roles: ['admin', 'doctor', 'receptionist'] },
    { key: 'password', label: 'Change password', roles: ['admin', 'doctor', 'receptionist'] },
    { key: 'clinic', label: 'Clinic & doctor', roles: ['admin'] },
    { key: 'rx', label: 'Prescription', roles: ['admin'] },
    { key: 'staff', label: 'Staff', roles: ['admin'] },
  ];
  const tabs = allTabs.filter(t => t.roles.includes(user?.role));
  const [tab, setTab] = useState('profile');

  const [clinicForm, setClinicForm] = useState({
    name: '', doctor_name: '', doctor_qualification: '', doctor_registration: '',
    phone: '', city: '', clinic_address: '', clinic_timings: '',
    rx_template: 'classic', rx_color: '#1D9E75', rx_footer_note: '',
  });

  const [profileForm, setProfileForm] = useState({
    name: '', username: '', qualification: '', registration_no: '', speciality: ''
  });

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');

  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', username: '', email: '', password: '', role: 'receptionist',
    qualification: '', registration_no: '', speciality: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  useEffect(() => {
    const loads = [
      api.get('/api/settings/profile').then(r => setProfileForm({
        name: r.data.name || '',
        username: r.data.username || '',
        qualification: r.data.qualification || '',
        registration_no: r.data.registration_no || '',
        speciality: r.data.speciality || '',
      }))
    ];
    if (isAdmin) {
      loads.push(api.get('/api/settings').then(r => setClinicForm(f => ({ ...f, ...r.data }))));
      loads.push(api.get('/api/auth/users').then(r => setUsers(r.data)));
    }
    Promise.all(loads).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }

  const setC = k => e => setClinicForm(f => ({ ...f, [k]: e.target.value }));

  async function saveClinic(e) {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/api/settings', clinicForm); showToast('Clinic settings saved'); }
    catch { showToast('Save failed', 'error'); } finally { setSaving(false); }
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch('/api/settings/profile', profileForm);
      showToast('Profile updated');
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  }

  async function changePassword(e) {
    e.preventDefault(); setPwError('');
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return; }
    if (pwForm.new_password.length < 6) { setPwError('Min 6 characters'); return; }
    setSaving(true);
    try {
      await api.post('/api/settings/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      showToast('Password changed');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  }

  async function addUser(e) {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await api.post('/api/auth/users', newUser);
      setUsers(u => [...u, data]);
      setNewUser({ name: '', username: '', email: '', password: '', role: 'receptionist', qualification: '', registration_no: '', speciality: '' });
      setShowAddUser(false);
      showToast(`${data.name} added as ${data.role}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally { setSaving(false); }
  }

  async function toggleActive(u) {
    try {
      const { data } = await api.patch(`/api/settings/users/${u.id}`, { is_active: !u.is_active });
      setUsers(us => us.map(u2 => u2.id === data.id ? data : u2));
      showToast(data.is_active ? `${data.name} activated` : `${data.name} deactivated`);
    } catch { showToast('Update failed', 'error'); }
  }

  function handleUserSave(data) {
    setUsers(us => us.map(u2 => u2.id === data.id ? data : u2));
  }

  function previewRx(template) {
    printRx(SAMPLE_CONSULTATION, SAMPLE_PATIENT, {
      ...clinicForm, rx_template: template,
      doctor_name: clinicForm.doctor_name || user?.name || 'Dr. Name',
    });
  }

  const doctors = users.filter(u => u.role === 'doctor');
  const receptionists = users.filter(u => u.role === 'receptionist');
  const admins = users.filter(u => u.role === 'admin');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;

  return (
    <div style={S.page}>
      {toast.msg && (
        <div style={{ ...S.toast, background: toast.type === 'error' ? '#A32D2D' : '#1a1a1a' }}>
          {toast.msg}
        </div>
      )}

      <div style={S.header}>
        <h1 style={S.title}>Settings</h1>
        <p style={S.sub}>{user?.name} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></p>
      </div>

      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t.key}
            style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
            onClick={() => setTab(t.key)}>
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
                <Field label="Display name *" placeholder="Your full name"
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  required />
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fieldLabel}>
                    Username
                    <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 6 }}>used to login</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={S.atSymbol}>@</span>
                    <input
                      style={{ ...S.input, paddingLeft: 26, fontFamily: 'monospace' }}
                      value={profileForm.username || ''}
                      onChange={e => setProfileForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                      placeholder="your.username"
                    />
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                    Lowercase letters, numbers, . and _ only
                  </div>
                </div>
              </div>

              {(isDoctor || isAdmin) && (
                <>
                  <div style={S.row2}>
                    <Field label="Qualification" placeholder="MBBS, MD..."
                      value={profileForm.qualification}
                      onChange={e => setProfileForm(f => ({ ...f, qualification: e.target.value }))} />
                    <Field label="Registration no." placeholder="PMC-XXXX"
                      value={profileForm.registration_no}
                      onChange={e => setProfileForm(f => ({ ...f, registration_no: e.target.value }))} />
                  </div>
                  <Field label="Speciality" placeholder="e.g. General Medicine"
                    value={profileForm.speciality}
                    onChange={e => setProfileForm(f => ({ ...f, speciality: e.target.value }))} />
                </>
              )}

              <div style={S.readonlyBlock}>
                <div style={S.readonlyLabel}>Email</div>
                <div style={S.readonlyVal}>{user?.email || '—'}</div>
              </div>
              <div style={{ ...S.readonlyBlock, marginBottom: 0 }}>
                <div style={S.readonlyLabel}>Role</div>
                <div style={{ ...S.readonlyVal, textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        </form>
      )}

      {/* ── CHANGE PASSWORD ── */}
      {tab === 'password' && (
        <form onSubmit={changePassword}>
          <div style={S.card}>
            <div style={S.cardHead}>Change password</div>
            <div style={S.cardBody}>
              {pwError && <div style={S.errorBox}>{pwError}</div>}
              <Field label="Current password *" type="password" placeholder="Your current password"
                value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
              <div style={S.pwDivider} />
              <div style={S.row2}>
                <Field label="New password *" type="password" placeholder="Min 6 characters"
                  value={pwForm.new_password}
                  onChange={e => { setPwForm(f => ({ ...f, new_password: e.target.value })); setPwError(''); }} required />
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fieldLabel}>Confirm new password *</label>
                  <input
                    style={{
                      ...S.input,
                      borderColor: pwForm.confirm_password
                        ? pwForm.new_password === pwForm.confirm_password ? '#1D9E75' : '#E24B4A'
                        : '#e8e8e5'
                    }}
                    type="password" placeholder="Repeat password"
                    value={pwForm.confirm_password}
                    onChange={e => { setPwForm(f => ({ ...f, confirm_password: e.target.value })); setPwError(''); }}
                    required
                  />
                  {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                    <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 4 }}>Passwords do not match</div>
                  )}
                </div>
              </div>
              <div style={S.pwHint}>After changing, you'll need to log in again with your new password.</div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Changing...' : 'Change password'}</button>
        </form>
      )}

      {/* ── CLINIC & DOCTOR ── */}
      {tab === 'clinic' && isAdmin && (
        <form onSubmit={saveClinic}>
          <div style={S.card}>
            <div style={S.cardHead}>Clinic details</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Clinic name *" placeholder="Dr. Bhalla Clinic" value={clinicForm.name} onChange={setC('name')} required />
                <Field label="City" placeholder="Nabha" value={clinicForm.city} onChange={setC('city')} />
              </div>
              <Field label="Clinic phone" placeholder="9988776655" value={clinicForm.phone} onChange={setC('phone')} />
              <Field label="Full address" placeholder="House No. 123, Civil Lines, Nabha" value={clinicForm.clinic_address} onChange={setC('clinic_address')} />
              <Field label="Clinic timings" placeholder="Mon–Sat: 9AM–1PM, 5PM–8PM" value={clinicForm.clinic_timings} onChange={setC('clinic_timings')} />
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardHead}>Primary doctor (shown on prescriptions)</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Doctor name" placeholder="Dr. Anumeha Bhalla" value={clinicForm.doctor_name} onChange={setC('doctor_name')} />
                <Field label="Qualification" placeholder="MBBS, MD (General Medicine)" value={clinicForm.doctor_qualification} onChange={setC('doctor_qualification')} />
              </div>
              <div style={S.row2}>
                <Field label="Registration number" placeholder="PMC-2019-XXXXX" value={clinicForm.doctor_registration} onChange={setC('doctor_registration')} />
                <Field label="Rx footer note" placeholder="e.g. Take medicines after food" value={clinicForm.rx_footer_note} onChange={setC('rx_footer_note')} />
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save clinic settings'}</button>
        </form>
      )}

      {/* ── PRESCRIPTION TEMPLATE ── */}
      {tab === 'rx' && isAdmin && (
        <form onSubmit={saveClinic}>
          <div style={S.card}>
            <div style={S.cardHead}>Choose template</div>
            <div style={S.cardBody}>
              <div style={S.tplGrid}>
                {TEMPLATES.map(t => (
                  <div key={t.key}>
                    <div
                      style={{ ...S.tplCard, ...(clinicForm.rx_template === t.key ? S.tplCardActive : {}) }}
                      onClick={() => setClinicForm(f => ({ ...f, rx_template: t.key }))}>
                      <TemplatePreview type={t.key} color={clinicForm.rx_color} />
                      <div style={S.tplFooter}>
                        <div>
                          <div style={S.tplLabel}>{t.label}</div>
                          <div style={S.tplDesc}>{t.desc}</div>
                        </div>
                        {clinicForm.rx_template === t.key && (
                          <div style={{ ...S.tplCheck, background: clinicForm.rx_color }}>
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="button" style={S.previewBtn} onClick={() => previewRx(t.key)}>
                      Preview →
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Header colour</div>
              <div style={S.colorRow}>
                {COLORS.map(c => (
                  <div key={c.hex} title={c.name}
                    style={{ ...S.colorSwatch, background: c.hex, ...(clinicForm.rx_color === c.hex ? S.colorSwatchActive : {}) }}
                    onClick={() => setClinicForm(f => ({ ...f, rx_color: c.hex }))} />
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
            <button style={S.addUserBtn} onClick={() => setShowAddUser(true)}>+ Add staff member</button>
          </div>

          {[
            { label: 'Doctors', list: doctors },
            { label: 'Receptionists', list: receptionists },
            { label: 'Admins', list: admins },
          ].filter(g => g.list.length > 0).map(({ label, list }) => (
            <div key={label} style={S.card}>
              <div style={S.cardHead}>{label} ({list.length})</div>
              {list.map(u => (
                <AdminUserRow
                  key={u.id}
                  u={u}
                  onSave={handleUserSave}
                  onToggle={toggleActive}
                />
              ))}
            </div>
          ))}

          {/* Add user modal */}
          {showAddUser && (
            <Modal title="Add staff member" onClose={() => setShowAddUser(false)}>
              <form onSubmit={addUser}>
                <div style={S.row2}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>Full name *</label>
                    <input style={S.input}
                      placeholder="Dr. Rajendra Singh"
                      value={newUser.name}
                      onChange={e => {
                        const name = e.target.value;
                        setNewUser(u => ({
                          ...u, name,
                          username: u.username === generateUsername(u.name) ? generateUsername(name) : u.username,
                        }));
                      }}
                      required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>
                      Username *
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 6 }}>for login</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={S.atSymbol}>@</span>
                      <input
                        style={{ ...S.input, paddingLeft: 26, fontFamily: 'monospace' }}
                        placeholder="dr.rajendra"
                        value={newUser.username}
                        onChange={e => setNewUser(u => ({ ...u, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                        required />
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Auto-suggested · you can change</div>
                  </div>
                </div>

                <div style={S.row2}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>Role *</label>
                    <select style={S.input} value={newUser.role}
                      onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} required>
                      <option value="receptionist">Receptionist</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>
                      Email
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                    </label>
                    <input style={S.input} type="email" placeholder="staff@clinic.com"
                      value={newUser.email}
                      onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
                  </div>
                </div>

                <Field label="Password *" type="password" placeholder="Min 6 characters"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required />

                {newUser.role === 'doctor' && (
                  <>
                    <div style={S.row2}>
                      <Field label="Qualification" placeholder="MBBS, MD"
                        value={newUser.qualification}
                        onChange={e => setNewUser(u => ({ ...u, qualification: e.target.value }))} />
                      <Field label="Registration no." placeholder="PMC-XXXX"
                        value={newUser.registration_no}
                        onChange={e => setNewUser(u => ({ ...u, registration_no: e.target.value }))} />
                    </div>
                    <Field label="Speciality" placeholder="General Medicine"
                      value={newUser.speciality}
                      onChange={e => setNewUser(u => ({ ...u, speciality: e.target.value }))} />
                  </>
                )}

                <button style={{ ...S.saveBtn, width: '100%', marginTop: 8 }} disabled={saving}>
                  {saving ? 'Adding...' : 'Add staff member'}
                </button>
              </form>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

// ── AdminUserRow ──────────────────────────────────────────────────────────────
function AdminUserRow({ u, onSave, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    name: u.name || '',
    username: u.username || '',
    qualification: u.qualification || '',
    registration_no: u.registration_no || '',
    speciality: u.speciality || '',
  });
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [rowToast, setRowToast] = useState('');

  function showRowToast(msg) { setRowToast(msg); setTimeout(() => setRowToast(''), 3000); }

  async function saveDetails(e) {
    e.preventDefault();
    if (editForm.username && !/^[a-z0-9_.]{3,20}$/.test(editForm.username)) {
      showRowToast('Username: 3-20 chars, lowercase/numbers/._  only');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch(`/api/settings/users/${u.id}`, editForm);
      onSave(data);
      showRowToast('Saved ✓');
    } catch (err) {
      showRowToast(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (newPw.length < 6) { showRowToast('Min 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.post(`/api/settings/users/${u.id}/reset-password`, { new_password: newPw });
      setNewPw('');
      showRowToast('Password reset ✓');
    } catch (err) {
      showRowToast(err.response?.data?.error || 'Failed');
    } finally { setPwSaving(false); }
  }

  const ROLE_COLOR = {
    admin: { bg: '#E1F5EE', color: '#085041' },
    doctor: { bg: '#E6F1FB', color: '#0C447C' },
    receptionist: { bg: '#FAEEDA', color: '#854F0B' },
  };
  const rc = ROLE_COLOR[u.role] || ROLE_COLOR.receptionist;

  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {u.name?.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {u.name}
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: rc.bg, color: rc.color }}>{u.role}</span>
            {!u.is_active && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20 }}>Inactive</span>}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            {u.username && (
              <span style={{ fontFamily: 'monospace', background: '#f5f5f3', padding: '1px 7px', borderRadius: 4, color: '#444' }}>
                @{u.username}
              </span>
            )}
            {u.email && <span>{u.email}</span>}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: '#aaa', flexShrink: 0 }}>
          <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', background: '#fafaf8' }}>
          {rowToast && (
            <div style={{ background: '#1a1a1a', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12, marginBottom: 10, marginTop: 10 }}>
              {rowToast}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 14, marginBottom: 10 }}>
            Profile details
          </div>
          <form onSubmit={saveDetails}>
            <div style={S.row2}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.fieldLabel}>Display name *</label>
                <input style={{ ...S.input }}
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.fieldLabel}>
                  Username
                  <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 6 }}>for login</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={S.atSymbol}>@</span>
                  <input
                    style={{ ...S.input, paddingLeft: 26, fontFamily: 'monospace' }}
                    value={editForm.username}
                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            {u.role === 'doctor' && (
              <>
                <div style={S.row2}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.fieldLabel}>Qualification</label>
                    <input style={S.input} value={editForm.qualification}
                      onChange={e => setEditForm(f => ({ ...f, qualification: e.target.value }))}
                      placeholder="MBBS, MD..." />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.fieldLabel}>Registration no.</label>
                    <input style={S.input} value={editForm.registration_no}
                      onChange={e => setEditForm(f => ({ ...f, registration_no: e.target.value }))}
                      placeholder="PMC-XXXX" />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.fieldLabel}>Speciality</label>
                  <input style={S.input} value={editForm.speciality}
                    onChange={e => setEditForm(f => ({ ...f, speciality: e.target.value }))}
                    placeholder="General Medicine" />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" style={S.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : 'Save details'}
              </button>
              <button type="button"
                style={{ ...S.saveBtn, background: u.is_active ? '#FCEBEB' : '#E1F5EE', color: u.is_active ? '#A32D2D' : '#085041' }}
                onClick={() => onToggle(u)}>
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </form>

          <div style={{ borderTop: '1px solid #f0f0ee', marginTop: 16, paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Reset password
            </div>
            <form onSubmit={resetPassword} style={{ display: 'flex', gap: 10 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                type="password" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min 6 chars)" />
              <button type="submit"
                style={{ padding: '10px 18px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                disabled={pwSaving}>
                {pwSaving ? '...' : 'Reset'}
              </button>
            </form>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
              Staff member logs in with @{u.username || 'username'} and this new password.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Field({ label, placeholder, value, onChange, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.fieldLabel}>{label}</label>
      <input style={S.input} type={type} placeholder={placeholder}
        value={value || ''} onChange={onChange} required={required} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <button style={{ background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TemplatePreview({ type, color }) {
  const c = color || '#1D9E75';
  if (type === 'classic') return (
    <div style={S.preview}>
      <div style={{ height: 28, background: c, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 2, width: '55%' }} />
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[90, 60, 80, 70, 55].map((w, i) => <div key={i} style={{ height: 4, background: i === 2 ? c + '33' : '#eee', borderRadius: 2, width: `${w}%` }} />)}
      </div>
    </div>
  );
  if (type === 'modern') return (
    <div style={S.preview}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 5, background: '#1a1a1a', borderRadius: 2, width: '50%' }} />
        <div style={{ height: 12, background: c + '18', borderRadius: 5, width: '100%' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <div style={{ height: 4, background: '#eee', borderRadius: 2, flex: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );
  if (type === 'minimal') return (
    <div style={S.preview}>
      <div style={{ borderBottom: '2.5px solid #1a1a1a', padding: '7px 10px' }}>
        <div style={{ height: 5, background: '#333', borderRadius: 2, width: '55%' }} />
        <div style={{ height: 3, background: '#ccc', borderRadius: 2, width: '80%', marginTop: 4 }} />
      </div>
      <div style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 3, background: '#ddd', borderRadius: 2, width: '100%' }} />
        <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>℞</div>
        {[75, 60, 55].map((w, i) => <div key={i} style={{ height: 3, background: '#ddd', borderRadius: 2, width: `${w}%` }} />)}
      </div>
    </div>
  );
  return null;
}

const S = {
  page: { maxWidth: 720 },
  toast: { position: 'fixed', top: 20, right: 20, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000, fontWeight: 500 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  tabs: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#666' },
  tabActive: { background: '#1D9E75', color: '#fff', border: '1px solid #1D9E75' },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  cardHead: { padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fafaf8' },
  cardBody: { padding: '16px 16px 4px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 13, color: '#1a1a1a', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
  atSymbol: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13, pointerEvents: 'none' },
  saveBtn: { padding: '10px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 },
  readonlyBlock: { background: '#fafaf8', border: '1px solid #e8e8e5', borderRadius: 8, padding: '10px 14px', marginBottom: 14 },
  readonlyLabel: { fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 },
  readonlyVal: { fontSize: 14, color: '#555' },
  pwDivider: { height: 1, background: '#f0f0ee', margin: '4px 0 16px' },
  pwHint: { fontSize: 12, color: '#aaa', marginBottom: 14, lineHeight: 1.5 },
  errorBox: { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  tplGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  tplCard: { border: '2px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 10, cursor: 'pointer', transition: 'border-color 0.15s' },
  tplCardActive: { borderColor: '#1D9E75' },
  preview: { height: 120, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7, overflow: 'hidden', background: '#fff', marginBottom: 8 },
  tplFooter: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  tplLabel: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  tplDesc: { fontSize: 11, color: '#aaa', marginTop: 2, lineHeight: 1.4 },
  tplCheck: { width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  previewBtn: { width: '100%', marginTop: 6, padding: '7px', background: '#fff', border: '1px solid #1D9E75', borderRadius: 7, color: '#1D9E75', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  colorRow: { display: 'flex', gap: 10, marginBottom: 12 },
  colorSwatch: { width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s' },
  colorSwatchActive: { border: '3px solid #1a1a1a', transform: 'scale(1.15)' },
  addUserBtn: { padding: '10px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
};
