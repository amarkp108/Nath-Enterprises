import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  BookOpen,
  User,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/fees', icon: IndianRupee, label: 'Fee Collection' },
  { to: '/admin/courses', icon: BookOpen, label: 'Course Master' },
];

const studentLinks = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/fees', icon: IndianRupee, label: 'My Fees' },
  { to: '/student/documents', icon: BookOpen, label: 'Documents' },
];

const titles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Student List',
  '/admin/fees': 'Fee Collection',
  '/admin/courses': 'Course Master',
  '/admin/profile': 'My Profile',
  '/student': 'My Dashboard',
  '/student/fees': 'Fee Details',
  '/student/documents': 'My Documents',
  '/student/profile': 'My Profile',
};

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const links = role === 'admin' ? adminLinks : studentLinks;
  const basePath = role === 'admin' ? '/admin' : '/student';

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle =
    titles[location.pathname] ||
    (location.pathname.includes('/students/') ? 'Student Details' : 'Dashboard');

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <div className={`overlay-sidebar ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-mark">N</div>
          <h1>Nath Enterprises</h1>
          <p>{role === 'admin' ? 'Admin Panel' : 'Student Portal'}</p>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h2 className="topbar-title">{pageTitle}</h2>
          </div>

          <div className="topbar-actions">
            {role === 'admin' && (
              <button
                className="btn btn-ghost settings-btn"
                title="Course Master"
                onClick={() => navigate('/admin/courses')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <Settings size={18} />
              </button>
            )}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button className="profile-btn" onClick={() => setMenuOpen(!menuOpen)}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="avatar">{initials}</div>
                )}
                <div className="meta">
                  <strong>{user?.name}</strong>
                  <span>{role === 'admin' ? 'Administrator' : user?.course}</span>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--ink-muted)', marginRight: 4 }} />
              </button>

              {menuOpen && (
                <div className="dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`${basePath}/profile`);
                    }}
                  >
                    <User size={16} />
                    My Profile
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`${basePath}/profile?tab=password`);
                    }}
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                  {role === 'admin' && (
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/courses');
                      }}
                    >
                      <Settings size={16} />
                      Course Master
                    </button>
                  )}
                  <button
                    className="dropdown-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
