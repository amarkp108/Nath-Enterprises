import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileBarChart, CalendarCheck } from 'lucide-react';

export default function AttendanceHub() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Mark Attendance',
      desc: 'Select class/course and mark Present (P) or Absent (A) for students',
      icon: ClipboardCheck,
      color: '#0f766e',
      bg: '#ccfbf1',
      to: '/admin/attendance/mark',
    },
    {
      title: 'Attendance Report',
      desc: 'View class-wise attendance history, summary and percentages',
      icon: FileBarChart,
      color: '#c45c26',
      bg: '#fef3ee',
      to: '/admin/attendance/report',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarCheck size={22} style={{ color: 'var(--brand)' }} />
          Attendance
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Choose an option to mark attendance or view reports
        </p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
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
            <div className="stat-value" style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
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
