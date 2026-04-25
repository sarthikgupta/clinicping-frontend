import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuthStore } from '../lib/api';

const ALL_SHORTCUTS = [
  { key: 'queue', label: 'Queue', desc: 'Manage today\'s patients', icon: QueueIcon, to: '/queue', roles: ['admin', 'doctor', 'receptionist'] },
  { key: 'doctor', label: 'Doctor view', desc: 'Consultations & prescriptions', icon: DoctorIcon, to: '/doctor', roles: ['admin', 'doctor'] },
  { key: 'patients', label: 'Patients', desc: 'Patient history & records', icon: PatientsIcon, to: '/patients', roles: ['admin', 'doctor', 'receptionist'] },
  { key: 'followups', label: 'Follow-ups', desc: 'Schedule WhatsApp reminders', icon: FollowupIcon, to: '/followups', roles: ['admin', 'doctor', 'receptionist'] },
  { key: 'analytics', label: 'Analytics', desc: 'Performance & stats', icon: AnalyticsIcon, to: '/analytics', roles: ['admin', 'doctor'] },
  { key: 'settings', label: 'Settings', desc: 'Clinic, staff & templates', icon: SettingsIcon, to: '/settings', roles: ['admin', 'doctor', 'receptionist'] },
];

function getStoredFavs(userId, role) {
  try {
    const stored = localStorage.getItem(`cp_favs_${userId}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Defaults by role
  if (role === 'doctor') return ['doctor', 'patients', 'followups'];
  if (role === 'receptionist') return ['queue', 'patients', 'followups'];
  return ['queue', 'doctor', 'analytics'];
}

function storeFavs(userId, favs) {
  localStorage.setItem(`cp_favs_${userId}`, JSON.stringify(favs));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, clinic } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [favs, setFavs] = useState(() => getStoredFavs(user?.id, user?.role));

  const role = user?.role || 'receptionist';
  const available = ALL_SHORTCUTS.filter(s => s.roles.includes(role));

  useEffect(() => {
    Promise.all([
      api.get('/api/queue/stats'),
      api.get('/api/queue/today'),
    ]).then(([s, q]) => {
      setStats(s.data);
      setQueue(q.data.filter(t => !['done', 'cancelled'].includes(t.status)).slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function toggleFav(key) {
    setFavs(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      storeFavs(user?.id, next);
      return next;
    });
  }

  const pinnedShortcuts = available.filter(s => favs.includes(s.key));
  const unpinnedShortcuts = available.filter(s => !favs.includes(s.key));
  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={S.page}>
      {/* Greeting */}
      <div style={S.greetRow}>
        <div>
          <h1 style={S.greet}>{greeting()}, {user?.name} 👋</h1>
          <p style={S.date}>{todayDate} · {clinic?.name}</p>
        </div>
        <button style={S.editBtn} onClick={() => setEditing(e => !e)}>
          {editing ? 'Done' : '✎ Customise'}
        </button>
      </div>

      {/* Stats strip */}
      {!loading && stats && (
        <div style={S.statsRow}>
          {[
            { label: 'Waiting', val: (stats.waiting || 0) + (stats.next || 0), color: '#854F0B', bg: '#FAEEDA' },
            { label: 'Consulting', val: stats.consulting || 0, color: '#085041', bg: '#E1F5EE' },
            { label: 'Done today', val: stats.done || 0, color: '#185FA5', bg: '#E6F1FB' },
            { label: 'Total today', val: stats.total || 0, color: '#1a1a1a', bg: '#f5f5f3' },
            { label: 'Cancelled', val: stats.cancelled || 0, color: '#A32D2D', bg: '#FCEBEB' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} style={{ ...S.statCard, background: bg }}>
              <div style={{ ...S.statVal, color }}>{val}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pinned shortcuts */}
      <div style={S.sectionHead}>
        <span style={S.sectionTitle}>
          {editing ? 'Select your favourites' : 'Quick access'}
        </span>
        {editing && <span style={S.sectionSub}>Tap to pin or unpin</span>}
      </div>

      <div style={S.shortcutGrid}>
        {(editing ? available : pinnedShortcuts).map(s => {
          const pinned = favs.includes(s.key);
          return (
            <div
              key={s.key}
              style={{
                ...S.shortcutCard,
                ...(editing && !pinned ? S.shortcutUnpinned : {}),
                cursor: 'pointer',
              }}
              onClick={() => editing ? toggleFav(s.key) : navigate(s.to)}
            >
              {editing && (
                <div style={{ ...S.pinBadge, background: pinned ? '#1D9E75' : '#e8e8e5', color: pinned ? '#fff' : '#aaa' }}>
                  {pinned ? '★' : '☆'}
                </div>
              )}
              <div style={S.shortcutIcon}><s.icon /></div>
              <div style={S.shortcutLabel}>{s.label}</div>
              <div style={S.shortcutDesc}>{s.desc}</div>
              {!editing && (
                <div style={S.shortcutArrow}>→</div>
              )}
            </div>
          );
        })}

        {!editing && pinnedShortcuts.length === 0 && (
          <div style={S.emptyFavs} onClick={() => setEditing(true)}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>☆</div>
            <div style={{ fontSize: 13, color: '#888' }}>Tap "Customise" to pin shortcuts here</div>
          </div>
        )}
      </div>

      {/* Today's active queue */}
      {queue.length > 0 && (
        <>
          <div style={S.sectionHead}>
            <span style={S.sectionTitle}>Active queue</span>
            <button style={S.seeAllBtn} onClick={() => navigate('/queue')}>See all →</button>
          </div>
          <div style={S.card}>
            {queue.map((token, i) => {
              const isConsulting = token.status === 'consulting';
              return (
                <div key={token.id} style={{
                  ...S.qRow,
                  borderBottom: i < queue.length - 1 ? '1px solid #f0f0ee' : 'none',
                  background: isConsulting ? '#f8fffe' : 'transparent',
                }}>
                  {isConsulting && <div style={S.consultBar} />}
                  <div style={{ ...S.tokenBubble, background: isConsulting ? '#1D9E75' : '#E1F5EE', color: isConsulting ? '#fff' : '#085041' }}>
                    {token.token_number}
                  </div>
                  <div style={S.qInfo}>
                    <div style={S.qName}>{token.patients?.name}</div>
                    <div style={S.qMeta}>
                      {token.reason || 'General'}
                      {token.clinic_users?.name && ` · ${token.clinic_users.name}`}
                    </div>
                  </div>
                  {isConsulting && <span style={S.nowBadge}>Now</span>}
                  {token.status === 'waiting' && <span style={S.waitBadge}>Waiting</span>}
                </div>
              );
            })}
            <div style={S.qFooter} onClick={() => navigate('/queue')}>
              View full queue →
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && queue.length === 0 && stats?.total === 0 && (
        <div style={S.emptyState}>
          <div style={S.emptyIcon}>🏥</div>
          <div style={S.emptyTitle}>No patients today yet</div>
          <div style={S.emptySub}>Add patients from the Queue page to get started</div>
          <button style={S.emptyBtn} onClick={() => navigate('/queue')}>Go to Queue →</button>
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function QueueIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="3" rx="1.5" fill="currentColor"/><rect x="3" y="11" width="12" height="3" rx="1.5" fill="currentColor"/><rect x="3" y="17" width="15" height="3" rx="1.5" fill="currentColor"/></svg>; }
function DoctorIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M16 16v4M14 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function PatientsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M2 21c0-3.9 3.1-7 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M16 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M13 21c0-3.9 3.1-7 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>; }
function FollowupIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M3 9l9 6 9-6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>; }
function AnalyticsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor"/><rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor"/><rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor"/></svg>; }
function SettingsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { maxWidth: 800 },
  greetRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  greet: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  date: { fontSize: 13, color: '#888', marginTop: 4 },
  editBtn: { padding: '8px 16px', background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, color: '#444', cursor: 'pointer', fontWeight: 500, flexShrink: 0 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 },
  statCard: { borderRadius: 12, padding: '12px 10px', border: '1px solid rgba(0,0,0,0.05)' },
  statVal: { fontSize: 22, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 5, fontWeight: 500 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1a1a1a' },
  sectionSub: { fontSize: 12, color: '#aaa' },
  seeAllBtn: { background: 'none', border: 'none', fontSize: 13, color: '#1D9E75', cursor: 'pointer', fontWeight: 600 },
  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 },
  shortcutCard: { background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '18px 16px', position: 'relative', transition: 'all 0.15s' },
  shortcutUnpinned: { opacity: 0.5, background: '#fafaf8' },
  pinBadge: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  shortcutIcon: { color: '#1D9E75', marginBottom: 10 },
  shortcutLabel: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  shortcutDesc: { fontSize: 12, color: '#888', lineHeight: 1.4 },
  shortcutArrow: { position: 'absolute', bottom: 14, right: 16, fontSize: 16, color: '#ccc' },
  emptyFavs: { gridColumn: '1 / -1', textAlign: 'center', padding: '32px', background: '#fafaf8', borderRadius: 14, border: '1.5px dashed #e0e0e0', cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  qRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', position: 'relative' },
  consultBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#1D9E75' },
  tokenBubble: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  qInfo: { flex: 1 },
  qName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  qMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  nowBadge: { fontSize: 11, background: '#1D9E75', color: '#fff', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 },
  waitBadge: { fontSize: 11, background: '#FAEEDA', color: '#854F0B', padding: '3px 10px', borderRadius: 20, fontWeight: 500, flexShrink: 0 },
  qFooter: { padding: '12px 16px', fontSize: 13, color: '#1D9E75', fontWeight: 600, cursor: 'pointer', borderTop: '1px solid #f0f0ee', textAlign: 'center' },
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#888', marginBottom: 20 },
  emptyBtn: { padding: '12px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
