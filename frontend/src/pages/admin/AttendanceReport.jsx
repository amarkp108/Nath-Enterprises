import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart, Search } from 'lucide-react';
import api from '../../api';
import { formatDate, formatTime, localDateStr } from '../../utils';
import AttendancePersonProfile from '../../components/AttendancePersonProfile';

export default function AttendanceReport() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [course, setCourse] = useState('all');
  const [batchId, setBatchId] = useState('all');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return localDateStr(d);
  });
  const [to, setTo] = useState(localDateStr());
  const [tab, setTab] = useState('person');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [personId, setPersonId] = useState(null);
  const [personData, setPersonData] = useState(null);
  const [personYear, setPersonYear] = useState(new Date().getFullYear());
  const [personLoading, setPersonLoading] = useState(false);

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

  const loadPerson = async (id, year = personYear) => {
    setPersonId(id);
    setPersonLoading(true);
    try {
      const { data: res } = await api.get(`/attendance/admin/person/${id}?year=${year}`);
      setPersonData(res.data);
      setPersonYear(res.data.year);
    } catch (err) {
      console.error(err);
      setPersonData(null);
    } finally {
      setPersonLoading(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredSummary = useMemo(() => {
    const list = data?.summary || [];
    if (!q) return list;
    return list.filter(
      (s) =>
        s.student?.name?.toLowerCase().includes(q) ||
        s.student?.phone?.includes(q) ||
        s.student?.course?.toLowerCase().includes(q) ||
        s.student?.batch?.toLowerCase().includes(q)
    );
  }, [data, q]);

  const filteredRecords = useMemo(() => {
    const list = data?.records || [];
    if (!q) return list;
    return list.filter(
      (r) =>
        r.student?.name?.toLowerCase().includes(q) ||
        r.student?.phone?.includes(q) ||
        r.course?.toLowerCase().includes(q) ||
        (r.batch || '').toLowerCase().includes(q)
    );
  }, [data, q]);

  if (personId) {
    return (
      <AttendancePersonProfile
        data={personData}
        loading={personLoading || !personData}
        onBack={() => {
          setPersonId(null);
          setPersonData(null);
        }}
        onYearChange={(y) => {
          setPersonYear(y);
          loadPerson(personId, y);
        }}
      />
    );
  }

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

      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
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
          style={{ maxWidth: 240 }}
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
          <div className="stat-card" style={{ '--accent-color': '#d97706', '--icon-bg': '#fef3c7' }}>
            <div className="stat-label">Late</div>
            <div className="stat-value">{data.totals.late ?? 0}</div>
          </div>
        </div>
      )}

      <div className="role-tabs tabs-3" style={{ maxWidth: 420, marginBottom: '1rem' }}>
        <button type="button" className={`role-tab ${tab === 'person' ? 'active' : ''}`} onClick={() => setTab('person')}>
          Person-wise
        </button>
        <button type="button" className={`role-tab ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>
          Day-wise
        </button>
        <button type="button" className={`role-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          Summary
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : !data ? (
        <div className="empty-state">Failed to load report</div>
      ) : (
        <div className="card">
          <div className="toolbar" style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
              <input
                className="form-control"
                placeholder={tab === 'detail' ? 'Search in table…' : 'Search student…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            {q && (
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                {tab === 'detail' ? filteredRecords.length : filteredSummary.length} result
                {(tab === 'detail' ? filteredRecords.length : filteredSummary.length) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {tab === 'person' || tab === 'summary' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        {q ? 'No students match your search' : 'No attendance records in this range'}
                      </td>
                    </tr>
                  ) : (
                    filteredSummary.map((s) => (
                      <tr key={s.student._id} className="clickable" onClick={() => loadPerson(s.student._id)}>
                        <td>
                          <button type="button" className="attn-name-link" onClick={(e) => { e.stopPropagation(); loadPerson(s.student._id); }}>
                            <strong>{s.student.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{s.student.phone}</div>
                          </button>
                        </td>
                        <td>
                          <span className="badge badge-info">{s.student.course}</span>
                          {s.student.batch && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{s.student.batch}</div>
                          )}
                        </td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{s.present}</td>
                        <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{s.late || 0}</td>
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
                    <th>Student</th>
                    <th>Course</th>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                        {q ? 'No records match your search' : 'No records found'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const time = formatTime(r.markedAt);
                      const late = !!r.isLate;
                      return (
                        <tr key={r._id} style={late ? { background: 'rgba(220, 38, 38, 0.06)' } : undefined}>
                          <td>{formatDate(r.date)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ color: late ? 'var(--danger)' : undefined, fontWeight: late ? 700 : 400 }}>{time}</span>
                            {late && (
                              <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                                Late
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="attn-name-link"
                              onClick={() => r.student?._id && loadPerson(r.student._id)}
                            >
                              <strong>{r.student?.name || '—'}</strong>
                            </button>
                          </td>
                          <td>
                            <span className="badge badge-info">{r.course}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{r.batch || r.student?.batch || '—'}</td>
                          <td>
                            <span className={`badge ${r.status === 'P' ? (late ? 'badge-warning' : 'badge-success') : 'badge-danger'}`}>
                              {r.status === 'P' ? (late ? 'Late' : 'Present') : 'Absent'}
                            </span>
                          </td>
                          <td>{r.markedByName || '—'}</td>
                        </tr>
                      );
                    })
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
