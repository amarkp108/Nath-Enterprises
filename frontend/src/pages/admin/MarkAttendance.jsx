import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../components/Toast';

export default function MarkAttendance() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sheet, setSheet] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/courses').then((res) => {
      const list = (res.data.data || []).filter((c) => c.isActive !== false);
      setCourses(list);
    });
    api.get('/admin/students?limit=500').then((res) => {
      const fromStudents = [...new Set((res.data.data || []).map((s) => s.course).filter(Boolean))];
      setCourses((prev) => {
        const names = new Set(prev.map((c) => c.name));
        const merged = [...prev];
        fromStudents.forEach((n) => {
          if (!names.has(n)) merged.push({ _id: n, name: n, isActive: true });
        });
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });
    }).catch(() => {});
  }, []);

  const loadSheet = async () => {
    if (!course || !date) {
      toast.warning('Please select class/course and date');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/admin/sheet?course=${encodeURIComponent(course)}&date=${date}`);
      setSheet(
        data.data.sheet.map((r) => ({
          studentId: r.student._id,
          name: r.student.name,
          phone: r.student.phone,
          batch: r.student.batch,
          avatar: r.student.avatar,
          status: r.status || '',
          remark: r.remark || '',
        }))
      );
      setMeta(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
      setSheet([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (course && date) loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, date]);

  const setStatus = (studentId, status) => {
    setSheet((rows) => rows.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  };

  const markAll = (status) => {
    setSheet((rows) => rows.map((r) => ({ ...r, status })));
  };

  const handleSave = async () => {
    const records = sheet.filter((r) => r.status === 'P' || r.status === 'A');
    if (records.length === 0) {
      toast.warning('Mark at least one student as P or A');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/attendance/admin/mark', {
        course,
        date,
        records: records.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remark: r.remark,
        })),
      });
      toast.success(data.message || 'Attendance saved');
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = sheet.filter((r) => r.status === 'P').length;
  const absentCount = sheet.filter((r) => r.status === 'A').length;

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/attendance')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Mark Attendance</h3>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body">
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>
                Class / Course <span className="req">*</span>
              </label>
              <select className="form-control" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="">Select class</option>
                {courses.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>
                Date <span className="req">*</span>
              </label>
              <input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {!course ? (
        <div className="card">
          <div className="empty-state">Select a class/course to load students</div>
        </div>
      ) : loading ? (
        <div className="spinner" />
      ) : sheet.length === 0 ? (
        <div className="card">
          <div className="empty-state">No active students found in this class</div>
        </div>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
              {sheet.length} students · <span style={{ color: 'var(--success)', fontWeight: 600 }}>P {presentCount}</span>
              {' · '}
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>A {absentCount}</span>
              {meta?.unmarked != null && meta.unmarked > 0 && (
                <> · Unmarked {sheet.filter((r) => !r.status).length}</>
              )}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => markAll('P')}>
                Mark All P
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => markAll('A')}>
                Mark All A
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                Save Attendance
              </button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Student</th>
                    <th>Phone</th>
                    <th>Batch</th>
                    <th style={{ textAlign: 'center' }}>Present (P)</th>
                    <th style={{ textAlign: 'center' }}>Absent (A)</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.map((r, i) => (
                    <tr key={r.studentId}>
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {r.avatar ? (
                            <img src={r.avatar} alt="" className="avatar" style={{ width: 32, height: 32 }} />
                          ) : (
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                              {r.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                          )}
                          <strong>{r.name}</strong>
                        </div>
                      </td>
                      <td>{r.phone}</td>
                      <td>{r.batch || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`attn-btn ${r.status === 'P' ? 'attn-p active' : ''}`}
                          onClick={() => setStatus(r.studentId, 'P')}
                        >
                          P
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`attn-btn ${r.status === 'A' ? 'attn-a active' : ''}`}
                          onClick={() => setStatus(r.studentId, 'A')}
                        >
                          A
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
