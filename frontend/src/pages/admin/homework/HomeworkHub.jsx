import { useNavigate } from 'react-router-dom';
import { Send, FileBarChart, NotebookPen } from 'lucide-react';

export default function HomeworkHub() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Send Homework',
      desc: 'Create homework and send class-wise or to selected students',
      icon: Send,
      color: '#0f766e',
      bg: '#ccfbf1',
      to: '/admin/homework/send',
    },
    {
      title: 'Sent Report',
      desc: 'View all sent homework with class/student filters',
      icon: FileBarChart,
      color: '#c45c26',
      bg: '#fef3ee',
      to: '/admin/homework/report',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotebookPen size={22} style={{ color: 'var(--brand)' }} />
          Homework
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Assign homework to classes or individual students
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
