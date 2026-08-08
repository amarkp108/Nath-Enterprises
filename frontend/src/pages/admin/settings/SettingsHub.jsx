import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Settings } from 'lucide-react';

export default function SettingsHub() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Department Master',
      desc: 'Add, edit and manage employee departments',
      icon: Building2,
      color: '#0f766e',
      bg: '#ccfbf1',
      to: '/admin/settings/departments',
    },
    {
      title: 'Employee Permissions',
      desc: 'Assign module-wise access for each employee',
      icon: ShieldCheck,
      color: '#0284c7',
      bg: '#e0f2fe',
      to: '/admin/settings/permissions',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={22} style={{ color: 'var(--brand)' }} />
          Settings
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Department master and employee module permissions
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
