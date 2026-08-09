import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import api from '../../../api';
import { formatDate, formatTime } from '../../../utils';
import { useToast } from '../../../components/Toast';

export default function EmpAttendanceReport() {
  const toast = useToast();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('all');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState('summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/hrm/employees').then((res) => setDepartments(res.data.departments || [])).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (department) q.set('department', department);
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const { data: res } = await api.get(`/hrm/attendance/report?${q}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, from, to]);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/hrm')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileBarChart size={18} /> Employee Attendance Report
        </h3>
      </div>

      <div className="toolbar">
        <select className="form-control" style={{ maxWidth: 200 }} value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input className="form-control" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <input className="form-control" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 160 }} />
      </div>

      {data && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
            <div className="stat-label">Total Records</div>
            <div className="stat-value">{data.totals.total}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
            <div className="stat-label">Present</div>
            <div className="stat-value">{data.totals.present}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
            <div className="stat-label">Absent</div>
            <div className="stat-value">{data.totals.absent}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
            <div className="stat-label">Employees</div>
            <div className="stat-value">{data.summary.length}</div>
          </div>
        </div>
      )}

      <div className="role-tabs" style={{ maxWidth: 320, marginBottom: '1rem' }}>
        <button type="button" className={`role-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          Employee Summary
        </button>
        <button type="button" className={`role-tab ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>
          Day-wise Detail
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : !data ? (
        <div className="empty-state">Failed to load report</div>
      ) : (
        <div className="card">
          {tab === 'summary' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        No attendance records in this range
                      </td>
                    </tr>
                  ) : (
                    data.summary.map((s) => (
                      <tr key={s.employee._id}>
                        <td>
                          <strong>{s.employee.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                            {s.employee.employeeId} · {s.employee.phone}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info">{s.employee.department}</span>
                        </td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{s.present}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.absent}</td>
                        <td>{s.total}</td>
                        <td>
                          <span className={`badge ${s.percent >= 75 ? 'badge-success' : s.percent >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                            {s.percent}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        No records found
                      </td>
                    </tr>
                  ) : (
                    data.records.map((r) => (
                      <tr key={r._id}>
                        <td>{formatDate(r.date)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatTime(r.markedAt)}</td>
                        <td>
                          <strong>{r.employee?.name || '—'}</strong>
                        </td>
                        <td>
                          <span className="badge badge-info">{r.department}</span>
                        </td>
                        <td>
                          <span className={`badge ${r.status === 'P' ? 'badge-success' : 'badge-danger'}`}>
                            {r.status === 'P' ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td>{r.markedBy?.name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
