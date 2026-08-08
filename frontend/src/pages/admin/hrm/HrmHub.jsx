import { useNavigate } from 'react-router-dom';
import { Users, ClipboardCheck, FileBarChart, Briefcase } from 'lucide-react';

export default function HrmHub() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Employees',
      desc: 'Add, edit and manage staff members by department',
      icon: Users,
      color: '#0f766e',
      bg: '#ccfbf1',
      to: '/admin/hrm/employees',
    },
    {
      title: 'Mark Attendance',
      desc: 'Mark Present (P) or Absent (A) for employees',
      icon: ClipboardCheck,
      color: '#0284c7',
      bg: '#e0f2fe',
      to: '/admin/hrm/attendance/mark',
    },
    {
      title: 'Attendance Report',
      desc: 'Department-wise employee attendance summary & history',
      icon: FileBarChart,
      color: '#c45c26',
      bg: '#fef3ee',
      to: '/admin/hrm/attendance/report',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase size={22} style={{ color: 'var(--brand)' }} />
          HRM
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Human Resource Management — employees & attendance
        </p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {options.map((o) => (
          <button
            key={o.to}
            type="button"
            onClick={() => navigate(o.to)}
            className="stat-card"
            style={{
              '--accent-color': o.color,
              '--icon-bg': o.bg,
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              width: '100%',
            }}
          >
            <div className="stat-icon">
              <o.icon size={22} />
            </div>
            <div className="stat-value" style={{ fontSize: '1.15rem', marginTop: '0.5rem' }}>
              {o.title}
            </div>
            <div className="stat-sub" style={{ marginTop: 6, lineHeight: 1.45 }}>
              {o.desc}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
