import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';

export default function AttendanceReport() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [course, setCourse] = useState('all');
  const [batchId, setBatchId] = useState('all');
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
    api
      .get('/attendance/admin/my-batches')
      .then((res) => setBatches(res.data.data || []))
      .catch(() => {});
  }, []);

  const courseNames = useMemo(() => [...new Set(batches.map((b) => b.course))], [batches]);

  const shiftsForCourse = useMemo(() => {
    if (course === 'all') return [];
    return batches.filter((b) => b.course === course && b.batchId);
  }, [batches, course]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (course) q.set('course', course);
      if (batchId && batchId !== 'all') q.set('batchId', batchId);
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const { data: res } = await api.get(`/attendance/admin/report?${q}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, batchId, from, to]);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/attendance')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileBarChart size={18} /> Attendance Report
        </h3>
      </div>

      <div className="toolbar">
        <select
          className="form-control"
          style={{ maxWidth: 200 }}
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setBatchId('all');
          }}
        >
          <option value="all">All Classes</option>
          {courseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ maxWidth: 220 }}
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={course === 'all' || shiftsForCourse.length === 0}
        >
          <option value="all">All Batches</option>
          {shiftsForCourse.map((b) => (
            <option key={String(b.batchId)} value={b.batchId}>
              {b.batchName}
              {b.startTime || b.endTime ? ` (${b.startTime || '?'}-${b.endTime || '?'})` : ''}
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
            <div className="stat-label">Students</div>
            <div className="stat-value">{data.summary.length}</div>
          </div>
        </div>
      )}

      <div className="role-tabs" style={{ maxWidth: 320, marginBottom: '1rem' }}>
        <button type="button" className={`role-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          Student Summary
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
                    <th>Student</th>
                    <th>Course</th>
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
                      <tr key={s.student._id}>
                        <td>
                          <strong>{s.student.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{s.student.phone}</div>
                        </td>
                        <td>
                          <span className="badge badge-info">{s.student.course}</span>
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
                    <th>Student</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        No records found
                      </td>
                    </tr>
                  ) : (
                    data.records.map((r) => (
                      <tr key={r._id}>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <strong>{r.student?.name || '—'}</strong>
                        </td>
                        <td>
                          <span className="badge badge-info">{r.course}</span>
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
