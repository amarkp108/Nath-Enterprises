import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  IndianRupee,
  CalendarDays,
  CalendarRange,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api';
import { formatCurrency } from '../../utils';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const stats = [
    {
      label: 'Total Students',
      value: data.totalStudents,
      sub: `${data.activeStudents} active`,
      icon: Users,
      color: '#0f766e',
      bg: '#ccfbf1',
    },
    {
      label: 'Admissions This Month',
      value: data.admissionsThisMonth,
      sub: 'New joins',
      icon: UserPlus,
      color: '#0284c7',
      bg: '#e0f2fe',
    },
    {
      label: "Today's Collection",
      value: formatCurrency(data.dailyFeeCollection),
      sub: `${data.dailyFeeCount} payments`,
      icon: CalendarDays,
      color: '#059669',
      bg: '#d1fae5',
    },
    {
      label: 'Weekly Collection',
      value: formatCurrency(data.weeklyFeeCollection),
      sub: `${data.weeklyFeeCount} payments`,
      icon: CalendarRange,
      color: '#7c3aed',
      bg: '#ede9fe',
    },
    {
      label: 'Monthly Collection',
      value: formatCurrency(data.monthlyFeeCollection),
      sub: `${data.monthlyFeeCount} payments`,
      icon: Calendar,
      color: '#c45c26',
      bg: '#fef3ee',
    },
    {
      label: 'Pending Total Fee',
      value: formatCurrency(data.totalPendingFee),
      sub: `${data.pendingStudentsCount} students`,
      icon: AlertCircle,
      color: '#dc2626',
      bg: '#fee2e2',
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ '--accent-color': s.color, '--icon-bg': s.bg }}>
            <div className="stat-icon">
              <s.icon size={20} />
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>
              <TrendingUp size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
              Fee Collection — Last 7 Days
            </h3>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8efed" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7f7a' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7f7a' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'Collected']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #d5e0dc', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Pending Fee Students</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/admin/students?pending=true')}>
              View all
            </button>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {data.pendingStudents.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                All fees cleared!
              </div>
            ) : (
              <ul className="pending-list">
                {data.pendingStudents.map((s) => (
                  <li key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s._id}`)}>
                    <div className="student-info">
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>
                        {s.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">{s.name}</div>
                        <div className="course">{s.course}</div>
                      </div>
                    </div>
                    <span className="pending-amount">{formatCurrency(s.pendingFee)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2 equal">
        <div className="card">
          <div className="card-header">
            <h3>Recent Payments</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/admin/fees')}>
              View all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      No payments yet
                    </td>
                  </tr>
                ) : (
                  data.recentPayments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <strong>{p.student?.name || '—'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{p.student?.course}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
                      <td>
                        <span className="badge badge-muted">{p.paymentMode}</span>
                      </td>
                      <td>{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Course-wise Students</h3>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {data.courseStats.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                No students yet
              </div>
            ) : (
              <ul className="pending-list">
                {data.courseStats.map((c) => (
                  <li key={c._id}>
                    <div className="student-info">
                      <div
                        className="avatar"
                        style={{ width: 34, height: 34, fontSize: '0.7rem', background: 'linear-gradient(135deg,#c45c26,#0f766e)' }}
                      >
                        {c._id?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="name">{c._id}</div>
                        <div className="course">Pending: {formatCurrency(c.pending)}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
