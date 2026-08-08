import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';

export default function StudentAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/attendance/student/my?month=${month}`)
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <>
      <div className="toolbar">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={18} style={{ color: 'var(--brand)' }} />
            My Attendance
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 2 }}>View your present / absent record</p>
        </div>
        <input
          className="form-control"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ maxWidth: 180, marginLeft: 'auto' }}
        />
      </div>

      {loading ? (
        <div className="spinner" />
      ) : !data ? (
        <div className="empty-state">Failed to load attendance</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
              <div className="stat-label">Total Days</div>
              <div className="stat-value">{data.stats.total}</div>
            </div>
            <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
              <div className="stat-label">Present</div>
              <div className="stat-value">{data.stats.present}</div>
            </div>
            <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
              <div className="stat-label">Absent</div>
              <div className="stat-value">{data.stats.absent}</div>
            </div>
            <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
              <div className="stat-label">Attendance %</div>
              <div className="stat-value">{data.stats.percent}%</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>This month</span>
                <span style={{ color: 'var(--ink-muted)' }}>{data.stats.percent}%</span>
              </div>
              <div className="progress-bar" style={{ height: 12 }}>
                <div className="fill" style={{ width: `${data.stats.percent}%` }} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Day-wise Record</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        No attendance marked for this month yet
                      </td>
                    </tr>
                  ) : (
                    data.records.map((r) => (
                      <tr key={r._id}>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <span className="badge badge-info">{r.course}</span>
                        </td>
                        <td>
                          <span className={`badge ${r.status === 'P' ? 'badge-success' : 'badge-danger'}`}>
                            {r.status === 'P' ? 'Present (P)' : 'Absent (A)'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
