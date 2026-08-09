import { useState, useRef, useEffect, useMemo } from 'react';
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
  ClipboardCheck,
  Briefcase,
  NotebookPen,
  CalendarOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../constants/modules';
import { assetUrl } from '../api';

const staffLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, module: 'dashboard' },
  { to: '/admin/students', icon: Users, label: 'Students', module: 'students' },
  { to: '/admin/fees', icon: IndianRupee, label: 'Fee Collection', module: 'fees' },
  { to: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance', module: 'attendance' },
  { to: '/admin/leaves', icon: CalendarOff, label: 'Leaves', module: 'leaves' },
  { to: '/admin/homework', icon: NotebookPen, label: 'Homework', module: 'homework' },
  { to: '/admin/hrm', icon: Briefcase, label: 'HRM', adminOnly: true },
  { to: '/admin/courses', icon: BookOpen, label: 'Course Master', module: 'courses' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

const studentLinks = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/fees', icon: IndianRupee, label: 'My Fees' },
  { to: '/student/attendance', icon: ClipboardCheck, label: 'My Attendance' },
  { to: '/student/leave', icon: CalendarOff, label: 'Apply Leave' },
  { to: '/student/homework', icon: NotebookPen, label: 'My Homework' },
  { to: '/student/documents', icon: BookOpen, label: 'Documents' },
];

const titles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Student List',
  '/admin/fees': 'Fee Collection',
  '/admin/attendance': 'Attendance',
  '/admin/attendance/mark': 'Mark Attendance',
  '/admin/attendance/report': 'Attendance Report',
  '/admin/leaves': 'Leave Requests',
  '/admin/homework': 'Homework',
  '/admin/homework/send': 'Send Homework',
  '/admin/homework/report': 'Homework Sent Report',
  '/admin/hrm': 'HRM',
  '/admin/hrm/employees': 'Employees',
  '/admin/hrm/attendance/mark': 'Mark Employee Attendance',
  '/admin/hrm/attendance/report': 'Employee Attendance Report',
  '/admin/courses': 'Course Master',
  '/admin/settings': 'Settings',
  '/admin/settings/departments': 'Department Master',
  '/admin/settings/permissions': 'Employee Permissions',
  '/admin/profile': 'My Profile',
  '/student': 'My Dashboard',
  '/student/fees': 'Fee Details',
  '/student/attendance': 'My Attendance',
  '/student/leave': 'Apply Leave',
  '/student/homework': 'My Homework',
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

  const isStaff = role === 'admin' || role === 'employee';
  const basePath = isStaff ? '/admin' : '/student';

  const links = useMemo(() => {
    if (role === 'student') return studentLinks;
    return staffLinks.filter((l) => {
      if (l.adminOnly) return role === 'admin';
      if (role === 'admin') return true;
      return hasPermission(user, role, l.module, 'view');
    });
  }, [role, user]);

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
    (location.pathname.includes('/students/')
      ? 'Student Details'
      : location.pathname.includes('/settings')
        ? 'Settings'
        : location.pathname.includes('/homework')
          ? 'Homework'
          : location.pathname.includes('/hrm')
            ? 'HRM'
            : location.pathname.includes('/attendance')
              ? 'Attendance'
              : 'Dashboard');

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'employee' ? user?.department || 'Employee' : user?.course;

  return (
    <div className="app-shell">
      <div className={`overlay-sidebar ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-mark">N</div>
          <h1>Nath classes</h1>
          <p>{role === 'admin' ? 'Admin Panel' : role === 'employee' ? 'Staff Portal' : 'Student Portal'}</p>
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
                title="Settings"
                onClick={() => navigate('/admin/settings')}
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
                  <img src={assetUrl(user.avatar)} alt="" className="avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="avatar">{initials}</div>
                )}
                <div className="meta">
                  <strong>{user?.name}</strong>
                  <span>{roleLabel}</span>
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
                        navigate('/admin/settings');
                      }}
                    >
                      <Settings size={16} />
                      Settings
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
