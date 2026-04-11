import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/api';

export default function Layout() {
  const { user, clinic, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'receptionist';

  const NAV = [
    { to: '/dashboard', label: 'Home', icon: HomeIcon, roles: ['admin', 'doctor', 'receptionist'] },
    { to: '/queue', label: 'Queue', icon: QueueIcon, roles: ['admin', 'doctor', 'receptionist'] },
    { to: '/patients', label: 'Patients', icon: PatientsIcon, roles: ['admin', 'doctor', 'receptionist'] },
    { to: '/followups', label: 'Follow-ups', icon: FollowupIcon, roles: ['admin', 'doctor', 'receptionist'] },
    { to: '/doctor', label: 'Doctor', icon: DoctorIcon, roles: ['admin', 'doctor'] },
    { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon, roles: ['admin', 'doctor'] },
    { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: ['admin', 'doctor', 'receptionist'] },
  ].filter(item => item.roles.includes(role));

  const ROLE_BADGE = {
    admin: { label: 'Admin', bg: '#1D9E75', color: '#fff' },
    doctor: { label: 'Doctor', bg: '#E1F5EE', color: '#085041' },
    receptionist: { label: 'Reception', bg: '#FAEEDA', color: '#854F0B' },
  };
  const badge = ROLE_BADGE[role] || ROLE_BADGE.receptionist;

  // Bottom nav — max 5 items including Home
  const bottomNav = NAV.slice(0, 5);
  const currentTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'ClinicPing';

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Desktop sidebar */}
      <aside className="cp-sidebar" style={S.sidebar}>
        <div style={S.logo}>
          Clinic<span style={{ color: '#1D9E75' }}>Ping</span>
        </div>
        <div style={S.userBlock}>
          <div style={S.clinicName}>{clinic?.name || 'Your Clinic'}</div>
          <div style={S.userRow}>
            <div style={S.userAvatar}>{user?.name?.charAt(0) || 'U'}</div>
            <div style={S.userInfo}>
              <div style={S.userName}>{user?.name}</div>
              <div style={{ ...S.roleBadge, background: badge.bg, color: badge.color }}>{badge.label}</div>
            </div>
          </div>
        </div>
        <nav style={S.nav}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({ ...S.navItem, ...(isActive ? S.navActive : {}) })}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} style={S.logoutBtn}>
          <LogoutIcon /> Logout
        </button>
      </aside>

      {/* Mobile header */}
      <div className="cp-mobile-header" style={S.mobileHeader}>
        <div>
          <div style={{ fontSize: 12, color: '#888' }}>{clinic?.name}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{currentTitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...S.roleBadge, background: badge.bg, color: badge.color, fontSize: 10 }}>{badge.label}</div>
          <div style={S.userAvatar}>{user?.name?.charAt(0) || 'U'}</div>
        </div>
      </div>

      {/* Main */}
      <main className="cp-main" style={S.main}>
        <Outlet />
        <div className="cp-bottom-pad" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="cp-bottom-nav" style={S.bottomNav}>
        {bottomNav.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink key={to} to={to} style={S.bottomNavItem}>
              <div style={{ color: isActive ? '#1D9E75' : '#aaa' }}><Icon /></div>
              <div style={{ fontSize: 10, marginTop: 2, color: isActive ? '#1D9E75' : '#aaa', fontWeight: isActive ? 700 : 400 }}>{label}</div>
            </NavLink>
          );
        })}
        <button style={{ ...S.bottomNavItem, background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleLogout}>
          <div style={{ color: '#aaa' }}><LogoutIcon /></div>
          <div style={{ fontSize: 10, marginTop: 2, color: '#aaa' }}>Logout</div>
        </button>
      </nav>
    </div>
  );
}

const S = {
  sidebar: { width: 224, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  logo: { fontSize: 20, fontWeight: 700, padding: '20px 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)' },
  userBlock: { padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)' },
  clinicName: { fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 },
  userRow: { display: 'flex', alignItems: 'center', gap: 8 },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  roleBadge: { display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, marginTop: 3 },
  nav: { flex: 1, padding: '12px 10px', overflowY: 'auto' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#888', fontWeight: 400, marginBottom: 2, textDecoration: 'none', fontSize: 14, transition: 'background 0.1s' },
  navActive: { background: '#E1F5EE', color: '#085041', fontWeight: 600 },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 10px 16px', padding: '9px 12px', background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, color: '#888', fontSize: 13, cursor: 'pointer' },
  mobileHeader: { display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 16px', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 },
  main: { flex: 1, padding: 28, overflowY: 'auto', background: '#f7f7f5', minWidth: 0 },
  bottomNav: { display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 50, justifyContent: 'space-around', alignItems: 'center' },
  bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 6px', textDecoration: 'none', flex: 1, minWidth: 0 },
};

function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 8L9 2l7 6v8a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/><path d="M6 17v-6h6v6" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>; }
function QueueIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor"/><rect x="2" y="7" width="8" height="2" rx="1" fill="currentColor"/><rect x="2" y="11" width="10" height="2" rx="1" fill="currentColor"/></svg>; }
function FollowupIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v8H2z" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M2 3l6 5 6-5" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>; }
function PatientsIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>; }
function AnalyticsIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor"/><rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor"/></svg>; }
function DoctorIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/><path d="M10 10v3M8.5 11.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function LogoutIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
