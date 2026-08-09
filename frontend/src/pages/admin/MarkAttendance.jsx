import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api, { assetUrl } from '../../api';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function MarkAttendance() {
  const toast = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [course, setCourse] = useState('');
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sheet, setSheet] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/attendance/admin/my-batches')
      .then((res) => setBatches(res.data.data || []))
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoaded(true));
  }, []);

  const courseNames = useMemo(() => [...new Set(batches.map((b) => b.course))], [batches]);

  const shiftsForCourse = useMemo(
    () => batches.filter((b) => b.course === course && b.batchId),
    [batches, course]
  );

  const courseHasNoShifts = useMemo(() => {
    if (!course) return false;
    const rows = batches.filter((b) => b.course === course);
    return rows.length > 0 && rows.every((b) => b.noShifts || !b.batchId);
  }, [batches, course]);

  const loadSheet = async () => {
    if (!course || !date) return;
    if (shiftsForCourse.length > 0 && !batchId) {
      setSheet([]);
      setMeta(null);
      return;
    }
    if (role === 'employee' && !batchId && !courseHasNoShifts) {
      setSheet([]);
      setMeta(null);
      return;
    }

    setLoading(true);
    try {
      const q = new URLSearchParams({ course, date });
      if (batchId) q.set('batchId', batchId);
      const { data } = await api.get(`/attendance/admin/sheet?${q}`);
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
  }, [course, batchId, date]);

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
    if (shiftsForCourse.length > 0 && !batchId) {
      toast.warning('Please select a batch/shift');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        course,
        date,
        records: records.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remark: r.remark,
        })),
      };
      if (batchId) {
        payload.batchId = batchId;
        const shift = shiftsForCourse.find((s) => String(s.batchId) === String(batchId));
        if (shift) payload.batch = shift.batchName;
      }
      const { data } = await api.post('/attendance/admin/mark', payload);
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

  const needsBatch = shiftsForCourse.length > 0;
  const canLoad = course && (!needsBatch || batchId);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/attendance')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Mark Attendance</h3>
      </div>

      {loaded && role === 'employee' && batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">No batches assigned. Contact admin to assign course shifts.</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-body">
              <div className="form-row-3" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Class / Course <span className="req">*</span>
                  </label>
                  <select
                    className="form-control"
                    value={course}
                    onChange={(e) => {
                      setCourse(e.target.value);
                      setBatchId('');
                      setSheet([]);
                      setMeta(null);
                    }}
                  >
                    <option value="">Select class</option>
                    {courseNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Batch / Shift {needsBatch && <span className="req">*</span>}
                  </label>
                  <select
                    className="form-control"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    disabled={!course || courseHasNoShifts}
                  >
                    <option value="">{courseHasNoShifts ? 'No shifts (whole class)' : 'Select batch'}</option>
                    {shiftsForCourse.map((b) => (
                      <option key={String(b.batchId)} value={b.batchId}>
                        {b.batchName}
                        {b.startTime || b.endTime ? ` (${b.startTime || '?'}-${b.endTime || '?'})` : ''}
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

          {!canLoad ? (
            <div className="card">
              <div className="empty-state">
                {!course ? 'Select a class/course' : 'Select a batch/shift to load students'}
              </div>
            </div>
          ) : loading ? (
            <div className="spinner" />
          ) : sheet.length === 0 ? (
            <div className="card">
              <div className="empty-state">No active students found in this batch</div>
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
                                <img src={assetUrl(r.avatar)} alt="" className="avatar" style={{ width: 32, height: 32 }} />
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
      )}
    </>
  );
}
