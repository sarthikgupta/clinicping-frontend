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
  consultation: {
    symptoms: 'Morning headaches',
    diagnosis: 'Hypertension Stage 1. BP: 142/90.',
    medicines: [{ name: 'Amlodipine 5mg', dose: '1-0-0-0', duration: '30 days', sort_order: 0 }],
    tests_ordered: [{ name: 'Lipid Profile', sort_order: 0 }, { name: 'ECG', sort_order: 1 }],
    next_appointment_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    next_appointment_note: 'Follow-up BP check',
  },
  patient: { name: 'Gurpreet Kaur', phone: '9988776655', visit_count: 4 },
};

const ROLE_COLORS = {
  admin: { background: '#E1F5EE', color: '#085041' },
  doctor: { background: '#E6F1FB', color: '#0C447C' },
  receptionist: { background: '#FAEEDA', color: '#854F0B' },
};

const ROLE_DESC = {
  admin: { title: 'Admin — full access', desc: 'Manage queue, patients, follow-ups, doctor view, analytics, settings, and all staff.' },
  doctor: { title: 'Doctor — clinical access', desc: 'Manage queue, patients, follow-ups, doctor view, and analytics.' },
  receptionist: { title: 'Receptionist — front desk', desc: 'Manage queue, patients, and follow-ups. No access to doctor view, analytics, or settings.' },
};

export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');

  // Clinic form (admin)
  const [clinicForm, setClinicForm] = useState({
    name: '', doctor_name: '', doctor_qualification: '', doctor_registration: '',
    phone: '', city: '', clinic_address: '', clinic_timings: '',
    rx_template: 'classic', rx_color: '#1D9E75', rx_footer_note: '',
  });

  // Staff (admin)
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'receptionist', qualification: '', registration_no: '', speciality: '' });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    const loads = [api.get('/api/settings')];
    if (isAdmin) loads.push(api.get('/api/auth/users'));
    Promise.all(loads).then(([s, u]) => {
      setClinicForm(f => ({ ...f, ...s.data }));
      if (u) setUsers(u.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }

  // Save profile name
  async function saveProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    setSaving('profile');
    try {
      await api.patch(`/api/auth/users/${user.id}`, { name: profileForm.name.trim() });
      const stored = JSON.parse(localStorage.getItem('cp_user') || '{}');
      stored.name = profileForm.name.trim();
      localStorage.setItem('cp_user', JSON.stringify(stored));
      showToast('Name updated — refresh to see it everywhere');
    } catch (err) {
      showToast(err.response?.data?.error || 'Update failed', 'error');
    } finally { setSaving(''); }
  }

  // Change password
  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.new_password.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return; }
    setSaving('password');
    try {
      await api.post('/api/settings/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Password changed successfully');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Password change failed');
    } finally { setSaving(''); }
  }

  // Save clinic settings
  async function saveClinic(e) {
    e.preventDefault();
    setSaving('clinic');
    try {
      await api.patch('/api/settings', clinicForm);
      showToast('Settings saved');
    } catch { showToast('Save failed', 'error'); }
    finally { setSaving(''); }
  }

  // Add user
  async function handleAddUser(e) {
    e.preventDefault();
    setAddingUser(true);
    try {
      const { data } = await api.post('/api/auth/users', newUser);
      setUsers(u => [...u, data]);
      setNewUser({ name: '', email: '', password: '', role: 'receptionist', qualification: '', registration_no: '', speciality: '' });
      setShowAddUser(false);
      showToast(`${data.name} added`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally { setAddingUser(false); }
  }

  // Save user edit
  async function saveUserEdit(e) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving('edituser');
    try {
      const { data } = await api.patch(`/api/auth/users/${editingUser.id}`, {
        name: editingUser.name,
        qualification: editingUser.qualification,
        registration_no: editingUser.registration_no,
        speciality: editingUser.speciality,
      });
      setUsers(u => u.map(u2 => u2.id === data.id ? data : u2));
      setEditingUser(null);
      showToast('Updated');
    } catch { showToast('Update failed', 'error'); }
    finally { setSaving(''); }
  }

  async function toggleActive(u) {
    try {
      const { data } = await api.patch(`/api/auth/users/${u.id}`, { is_active: !u.is_active });
      setUsers(us => us.map(u2 => u2.id === data.id ? data : u2));
      showToast(data.is_active ? `${data.name} activated` : `${data.name} deactivated`);
    } catch { showToast('Failed', 'error'); }
  }

  const TABS = [
    { key: 'profile', label: 'My profile' },
    ...(isAdmin ? [
      { key: 'clinic', label: 'Clinic & doctor' },
      { key: 'rx', label: 'Prescription' },
      { key: 'staff', label: `Staff (${users.length})` },
    ] : []),
  ];

  const doctors = users.filter(u => u.role === 'doctor');
  const receptionists = users.filter(u => u.role === 'receptionist');
  const admins = users.filter(u => u.role === 'admin');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;

  return (
    <div style={S.page}>
      {toast.msg && <div style={{ ...S.toast, background: toast.type === 'error' ? '#A32D2D' : '#1a1a1a' }}>{toast.msg}</div>}

      <div style={S.header}>
        <h1 style={S.title}>Settings</h1>
        <p style={S.sub}>{user?.name} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></p>
      </div>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── MY PROFILE ── */}
      {tab === 'profile' && (
        <div>
          <div style={S.card}>
            <div style={S.cardHead}>Display name</div>
            <div style={S.cardBody}>
              <form onSubmit={saveProfile}>
                <div style={S.row2}>
                  <Field label="Your name" placeholder="Full name" value={profileForm.name} onChange={e => setProfileForm({ name: e.target.value })} required />
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>Email</label>
                    <input style={{ ...S.input, background: '#f8f8f6', color: '#999' }} value={user?.email || ''} disabled />
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Email cannot be changed</div>
                  </div>
                </div>
                <button style={S.saveBtn} disabled={saving === 'profile'}>{saving === 'profile' ? 'Saving...' : 'Update name'}</button>
              </form>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHead}>Change password</div>
            <div style={S.cardBody}>
              <form onSubmit={changePassword}>
                <Field label="Current password" type="password" placeholder="Your current password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
                <div style={S.row2}>
                  <Field label="New password" type="password" placeholder="Min 6 characters" value={pwForm.new_password} onChange={e => { setPwForm(f => ({ ...f, new_password: e.target.value })); setPwError(''); }} required />
                  <Field label="Confirm new password" type="password" placeholder="Repeat new password" value={pwForm.confirm_password} onChange={e => { setPwForm(f => ({ ...f, confirm_password: e.target.value })); setPwError(''); }} required />
                </div>
                {pwError && <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 12, marginTop: -4 }}>{pwError}</div>}
                <button style={S.saveBtn} disabled={saving === 'password'}>{saving === 'password' ? 'Changing...' : 'Change password'}</button>
              </form>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHead}>Your role & access</div>
            <div style={S.cardBody}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <span style={{ ...ROLE_COLORS[user?.role], padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, flexShrink: 0, textTransform: 'capitalize' }}>{user?.role}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{ROLE_DESC[user?.role]?.title}</div>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{ROLE_DESC[user?.role]?.desc}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLINIC & DOCTOR (admin) ── */}
      {tab === 'clinic' && isAdmin && (
        <form onSubmit={saveClinic}>
          <div style={S.card}>
            <div style={S.cardHead}>Clinic details</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Clinic name *" placeholder="Dr. Bhalla Clinic" value={clinicForm.name} onChange={e => setClinicForm(f => ({ ...f, name: e.target.value }))} required />
                <Field label="City" placeholder="Nabha" value={clinicForm.city} onChange={e => setClinicForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <Field label="Clinic phone" placeholder="9988776655" value={clinicForm.phone} onChange={e => setClinicForm(f => ({ ...f, phone: e.target.value }))} />
              <Field label="Full address" placeholder="House No. 123, Civil Lines, Nabha" value={clinicForm.clinic_address} onChange={e => setClinicForm(f => ({ ...f, clinic_address: e.target.value }))} />
              <Field label="Clinic timings" placeholder="Mon–Sat: 9AM–1PM, 5PM–8PM" value={clinicForm.clinic_timings} onChange={e => setClinicForm(f => ({ ...f, clinic_timings: e.target.value }))} />
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardHead}>Primary doctor details (for prescriptions)</div>
            <div style={S.cardBody}>
              <div style={S.row2}>
                <Field label="Doctor name *" placeholder="Dr. Anumeha Bhalla" value={clinicForm.doctor_name} onChange={e => setClinicForm(f => ({ ...f, doctor_name: e.target.value }))} required />
                <Field label="Qualification" placeholder="MBBS, MD" value={clinicForm.doctor_qualification} onChange={e => setClinicForm(f => ({ ...f, doctor_qualification: e.target.value }))} />
              </div>
              <div style={S.row2}>
                <Field label="Registration no." placeholder="PMC-2019-XXXXX" value={clinicForm.doctor_registration} onChange={e => setClinicForm(f => ({ ...f, doctor_registration: e.target.value }))} />
                <Field label="Rx footer note" placeholder="e.g. Take medicines after food" value={clinicForm.rx_footer_note} onChange={e => setClinicForm(f => ({ ...f, rx_footer_note: e.target.value }))} />
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving === 'clinic'}>{saving === 'clinic' ? 'Saving...' : 'Save settings'}</button>
        </form>
      )}

      {/* ── PRESCRIPTION (admin) ── */}
      {tab === 'rx' && isAdmin && (
        <form onSubmit={saveClinic}>
          <div style={S.card}>
            <div style={S.cardHead}>Choose template</div>
            <div style={S.cardBody}>
              <div style={S.tplGrid}>
                {TEMPLATES.map(t => (
                  <div key={t.key}>
                    <div style={{ ...S.tplCard, ...(clinicForm.rx_template === t.key ? S.tplCardActive : {}) }}
                      onClick={() => setClinicForm(f => ({ ...f, rx_template: t.key }))}>
                      <TemplatePreview type={t.key} color={clinicForm.rx_color} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={S.tplLabel}>{t.label}</div>
                          <div style={S.tplDesc}>{t.desc}</div>
                        </div>
                        {clinicForm.rx_template === t.key && (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: clinicForm.rx_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="button" style={S.previewBtn}
                      onClick={() => printRx(SAMPLE.consultation, SAMPLE.patient, { ...clinicForm, rx_template: t.key, doctor_name: clinicForm.doctor_name || user?.name || 'Dr. Name' })}>
                      Preview {t.label} →
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Header colour</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {COLORS.map(c => (
                  <div key={c.hex} title={c.name}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: c.hex, cursor: 'pointer', border: clinicForm.rx_color === c.hex ? '3px solid #1a1a1a' : '2px solid transparent', transform: clinicForm.rx_color === c.hex ? 'scale(1.15)' : 'none', transition: 'all 0.15s' }}
                    onClick={() => setClinicForm(f => ({ ...f, rx_color: c.hex }))} />
                ))}
              </div>
            </div>
          </div>
          <button style={S.saveBtn} disabled={saving === 'clinic'}>{saving === 'clinic' ? 'Saving...' : 'Save template'}</button>
        </form>
      )}

      {/* ── STAFF (admin) ── */}
      {tab === 'staff' && isAdmin && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button style={S.addBtn} onClick={() => setShowAddUser(true)}>+ Add staff member</button>
          </div>

          {[{ label: 'Doctors', list: doctors }, { label: 'Receptionists', list: receptionists }, { label: 'Admins', list: admins }]
            .filter(g => g.list.length > 0)
            .map(({ label, list }) => (
              <div key={label} style={S.card}>
                <div style={S.cardHead}>{label} ({list.length})</div>
                {list.map(u => (
                  <AdminUserRow
                    key={u.id}
                    u={u}
                    onSave={data => setUsers(us => us.map(u2 => u2.id === data.id ? data : u2))}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            ))}

          {showAddUser && (
            <Modal title="Add staff member" onClose={() => setShowAddUser(false)}>
              <form onSubmit={handleAddUser}>
                <div style={S.row2}>
                  <Field label="Full name *" placeholder="Dr. Rajinder Singh" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} required />
                  <div style={{ marginBottom: 14 }}>
                    <label style={S.fieldLabel}>Role *</label>
                    <select style={S.input} value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                      <option value="receptionist">Receptionist</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <Field label="Email *" type="email" placeholder="staff@clinic.com" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} required />
                <Field label="Password *" type="password" placeholder="Min 6 characters" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required />
                {newUser.role === 'doctor' && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: '8px 0 12px' }}>Doctor details</div>
                    <Field label="Qualification" placeholder="MBBS, MD" value={newUser.qualification} onChange={e => setNewUser(u => ({ ...u, qualification: e.target.value }))} />
                    <div style={S.row2}>
                      <Field label="Registration no." placeholder="PMC-XXXX" value={newUser.registration_no} onChange={e => setNewUser(u => ({ ...u, registration_no: e.target.value }))} />
                      <Field label="Speciality" placeholder="General Medicine" value={newUser.speciality} onChange={e => setNewUser(u => ({ ...u, speciality: e.target.value }))} />
                    </div>
                  </>
                )}
                <button style={{ ...S.saveBtn, width: '100%', marginTop: 8 }} disabled={addingUser}>{addingUser ? 'Adding...' : 'Add staff member'}</button>
              </form>
            </Modal>
          )}

          {editingUser && (
            <Modal title={`Edit — ${editingUser.name}`} onClose={() => setEditingUser(null)}>
              <form onSubmit={saveUserEdit}>
                <Field label="Display name *" value={editingUser.name} onChange={e => setEditingUser(u => ({ ...u, name: e.target.value }))} required />
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fieldLabel}>Email</label>
                  <input style={{ ...S.input, background: '#f8f8f6', color: '#999' }} value={editingUser.email} disabled />
                </div>
                {editingUser.role === 'doctor' && (
                  <>
                    <Field label="Qualification" placeholder="MBBS, MD" value={editingUser.qualification || ''} onChange={e => setEditingUser(u => ({ ...u, qualification: e.target.value }))} />
                    <div style={S.row2}>
                      <Field label="Registration no." placeholder="PMC-XXXX" value={editingUser.registration_no || ''} onChange={e => setEditingUser(u => ({ ...u, registration_no: e.target.value }))} />
                      <Field label="Speciality" placeholder="General Medicine" value={editingUser.speciality || ''} onChange={e => setEditingUser(u => ({ ...u, speciality: e.target.value }))} />
                    </div>
                  </>
                )}
                <div style={{ fontSize: 12, color: '#888', background: '#f8f8f6', padding: '10px 12px', borderRadius: 8, marginBottom: 14, lineHeight: 1.5 }}>
                  Password can only be changed by the user themselves from their own Settings page.
                </div>
                <button style={{ ...S.saveBtn, width: '100%' }} disabled={saving === 'edituser'}>{saving === 'edituser' ? 'Saving...' : 'Save changes'}</button>
              </form>
            </Modal>
          )}
        </div>
      )}
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

function Field({ label, placeholder, value, onChange, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.fieldLabel}>{label}</label>
      <input style={S.input} type={type} placeholder={placeholder} value={value || ''} onChange={onChange} required={required} />
    </div>
  );
}

function TemplatePreview({ type, color }) {
  const c = color || '#1D9E75';
  if (type === 'classic') return (
    <div style={S.preview}>
      <div style={{ height: 26, background: c, borderRadius: '4px 4px 0 0' }} />
      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 4, background: '#eee', borderRadius: 2, width: '80%' }} />
        <div style={{ fontSize: 13, color: c, fontFamily: 'serif', fontWeight: 700 }}>℞</div>
        {[80, 70, 60].map((w, i) => <div key={i} style={{ height: 3, background: '#eee', borderRadius: 2, width: `${w}%` }} />)}
        <div style={{ height: 8, background: c + '22', borderRadius: 4 }} />
      </div>
    </div>
  );
  if (type === 'modern') return (
    <div style={S.preview}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 4, background: '#222', borderRadius: 2, width: '45%' }} />
        <div style={{ height: 10, background: c + '18', borderRadius: 5 }} />
        {[1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: c }} /><div style={{ height: 3, background: '#eee', borderRadius: 2, flex: 1 }} /></div>)}
      </div>
    </div>
  );
  return (
    <div style={S.preview}>
      <div style={{ borderBottom: '2px solid #1a1a1a', padding: '5px 10px' }}>
        <div style={{ height: 4, background: '#333', borderRadius: 2, width: '50%' }} />
      </div>
      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1a1a1a' }}>℞</div>
        {[70, 55, 60].map((w, i) => <div key={i} style={{ height: 3, background: '#ddd', borderRadius: 2, width: `${w}%` }} />)}
      </div>
    </div>
  );
}

const S = {
  page: { maxWidth: 760 },
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
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 13, color: '#1a1a1a', background: '#fff' },
  saveBtn: { padding: '11px 28px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 20 },
  tplGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  tplCard: { border: '2px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 10, cursor: 'pointer', transition: 'border-color 0.15s' },
  tplCardActive: { borderColor: '#1D9E75' },
  preview: { height: 110, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7, overflow: 'hidden', background: '#fff', marginBottom: 8 },
  tplLabel: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  tplDesc: { fontSize: 11, color: '#aaa', marginTop: 2 },
  previewBtn: { width: '100%', marginTop: 6, padding: '7px', background: '#fff', border: '1px solid #1D9E75', borderRadius: 7, color: '#1D9E75', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  addBtn: { padding: '10px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  editBtn: { fontSize: 12, padding: '5px 12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#444', fontWeight: 500 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  };
// Replace the staff tab user rendering in Settings.jsx
// This is a drop-in component — add it at the bottom of Settings.jsx
// and use <AdminUserRow> instead of the inline user row

function AdminUserRow({ u, onSave, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    name: u.name || '',
    qualification: u.qualification || '',
    registration_no: u.registration_no || '',
    speciality: u.speciality || '',
  });
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showRowToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function saveDetails(e) {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/api/settings/users/${u.id}`, editForm);
      onSave(data);
      showRowToast('Saved');
    } catch (err) {
      showRowToast(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (newPw.length < 6) { showRowToast('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.post(`/api/settings/users/${u.id}/reset-password`, { new_password: newPw });
      setNewPw('');
      showRowToast('Password reset successfully');
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
      {/* Main row */}
      <div style={URS.row} onClick={() => setExpanded(e => !e)}>
        <div style={URS.avatar}>{u.name?.charAt(0)}</div>
        <div style={URS.info}>
          <div style={URS.name}>
            {u.name}
            <span style={{ ...URS.badge, background: rc.bg, color: rc.color }}>{u.role}</span>
            {!u.is_active && <span style={URS.inactiveBadge}>Inactive</span>}
          </div>
          <div style={URS.meta}>{u.email}{u.qualification ? ` · ${u.qualification}` : ''}</div>
        </div>
        <div style={URS.chevron}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: '#aaa' }}>
            <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div style={URS.panel}>
          {toast && <div style={URS.rowToast}>{toast}</div>}

          {/* Details form */}
          <div style={URS.section}>
            <div style={URS.sectionTitle}>Profile details</div>
            <form onSubmit={saveDetails}>
              <div style={URS.row2}>
                <div style={{ marginBottom: 12 }}>
                  <label style={URS.label}>Display name *</label>
                  <input style={URS.input} value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name" required />
                </div>
                {u.role === 'doctor' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={URS.label}>Qualification</label>
                    <input style={URS.input} value={editForm.qualification}
                      onChange={e => setEditForm(f => ({ ...f, qualification: e.target.value }))}
                      placeholder="MBBS, MD..." />
                  </div>
                )}
              </div>
              {u.role === 'doctor' && (
                <div style={URS.row2}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={URS.label}>Registration no.</label>
                    <input style={URS.input} value={editForm.registration_no}
                      onChange={e => setEditForm(f => ({ ...f, registration_no: e.target.value }))}
                      placeholder="PMC-XXXX" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={URS.label}>Speciality</label>
                    <input style={URS.input} value={editForm.speciality}
                      onChange={e => setEditForm(f => ({ ...f, speciality: e.target.value }))}
                      placeholder="General Medicine" />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={URS.saveBtn} disabled={saving}>
                  {saving ? 'Saving...' : 'Save details'}
                </button>
                <button type="button"
                  style={{ ...URS.saveBtn, background: u.is_active ? '#FCEBEB' : '#E1F5EE', color: u.is_active ? '#A32D2D' : '#085041' }}
                  onClick={() => onToggle(u)}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </form>
          </div>

          {/* Password reset */}
          <div style={{ ...URS.section, borderTop: '1px solid #f0f0ee', marginTop: 14, paddingTop: 14 }}>
            <div style={URS.sectionTitle}>Reset password</div>
            <form onSubmit={resetPassword} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={URS.label}>New password</label>
                <input style={URS.input} type="password" value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min 6 characters" />
              </div>
              <button type="submit" style={{ ...URS.saveBtn, flexShrink: 0 }} disabled={pwSaving}>
                {pwSaving ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
              User will need to use this password on their next login.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const URS = {
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', transition: 'background 0.1s' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: 14, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  inactiveBadge: { fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  meta: { fontSize: 12, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  chevron: { flexShrink: 0 },
  panel: { padding: '0 16px 16px', background: '#fafaf8' },
  section: {},
  sectionTitle: { fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, marginTop: 14 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e8e5', borderRadius: 8, outline: 'none', fontSize: 13, color: '#1a1a1a', background: '#fff' },
  saveBtn: { padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  rowToast: { background: '#1a1a1a', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12, marginBottom: 10, marginTop: 10 },
};  
