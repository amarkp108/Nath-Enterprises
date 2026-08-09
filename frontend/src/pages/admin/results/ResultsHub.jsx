import { useNavigate } from 'react-router-dom';
import { Award, Plus, List } from 'lucide-react';

export default function ResultsHub() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Publish Result',
      desc: 'Enter subject, marks and student mobile to publish a result',
      icon: Plus,
      color: '#0f766e',
      bg: '#ccfbf1',
      to: '/admin/results/publish',
    },
    {
      title: 'Published Results',
      desc: 'View, edit or delete published results',
      icon: List,
      color: '#0284c7',
      bg: '#e0f2fe',
      to: '/admin/results/list',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={22} style={{ color: 'var(--brand)' }} />
          Results
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Publish exam results for your batch students
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
