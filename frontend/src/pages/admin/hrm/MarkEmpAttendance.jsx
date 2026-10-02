import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';
import { formatTime, localDateStr, dateWithCurrentTime, shiftDateByDays, isPastDate } from '../../../utils';

export default function MarkEmpAttendance() {
  const toast = useToast();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [batches, setBatches] = useState([]);
  const [date, setDate] = useState(localDateStr());
  const [markTime, setMarkTime] = useState(() => dateWithCurrentTime(localDateStr()));
  const [sheet, setSheet] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/hrm/employees').then((res) => setDepartments(res.data.departments || [])).catch(() => {});
  }, []);

  const loadSheet = async () => {
    if (!date) {
      toast.warning('Please select a date');
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ date });
      if (department) q.set('department', department);
      if (batchFilter && batchFilter !== 'all') q.set('batchId', batchFilter);
      const { data } = await api.get(`/hrm/attendance/sheet?${q}`);
      setBatches(data.data.batches || []);
      setSheet(
        data.data.sheet.map((r) => ({
          employeeId: r.employee._id,
          name: r.employee.name,
          phone: r.employee.phone,
          department: r.employee.department,
          designation: r.employee.designation,
          empCode: r.employee.employeeId,
          status: r.status || '',
          remark: r.remark || '',
          markedAt: r.markedAt || null,
          batchId: r.batchId ? String(r.batchId) : '',
          assignedBatches: r.assignedBatches || [],
        }))
      );
      setMeta(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load employees');
      setSheet([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (date) loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, date, batchFilter]);

  const setStatus = (employeeId, status) => {
    setSheet((rows) => rows.map((r) => (r.employeeId === employeeId ? { ...r, status } : r)));
  };

  const setBatch = (employeeId, batchId) => {
    setSheet((rows) => rows.map((r) => (r.employeeId === employeeId ? { ...r, batchId } : r)));
  };

  const markAll = (status) => setSheet((rows) => rows.map((r) => ({ ...r, status })));

  const handleSave = async () => {
    const records = sheet.filter((r) => r.status === 'P' || r.status === 'A');
    if (records.length === 0) {
      toast.warning('Mark at least one employee as P or A');
      return;
    }
    for (const r of records) {
      if ((r.assignedBatches || []).length > 0 && !r.batchId) {
        toast.warning(`Select a batch for ${r.name}`);
        return;
      }
    }
    setSaving(true);
    try {
      const { data } = await api.post('/hrm/attendance/mark', {
        date,
        markedAt: markTime ? new Date(markTime).toISOString() : undefined,
        records: records.map((r) => ({
          employeeId: r.employeeId,
          status: r.status,
          remark: r.remark,
          batchId: r.batchId || undefined,
        })),
      });
      toast.success(
        data.markedAt
          ? `${data.message || 'Attendance saved'} at ${formatTime(data.markedAt)}`
          : data.message || 'Attendance saved'
      );
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = sheet.filter((r) => r.status === 'P').length;
  const absentCount = sheet.filter((r) => r.status === 'A').length;

  const batchOptions = useMemo(() => batches, [batches]);
  const backdated = isPastDate(date);
  const today = localDateStr();
  const yesterday = shiftDateByDays(today, -1);

  const setAttendanceDate = (nextDate) => {
    setDate(nextDate);
    setMarkTime(dateWithCurrentTime(nextDate));
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/hrm')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Mark Employee Attendance</h3>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body">
          <div className="form-row" style={{ marginBottom: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Department</label>
              <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Batch filter</label>
              <select className="form-control" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
                <option value="all">All Batches</option>
                {batchOptions.map((b) => (
                  <option key={String(b.batchId)} value={String(b.batchId)}>
                    {b.courseName}: {b.batchName}
                    {b.startTime ? ` (${b.startTime})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>
                Attendance Date <span className="req">*</span>
              </label>
              <input
                className="form-control"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <button type="button" className={`btn btn-sm ${date === today ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAttendanceDate(today)}>
                  Today
                </button>
                <button type="button" className={`btn btn-sm ${date === yesterday ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAttendanceDate(yesterday)}>
                  Yesterday
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>
                Marked At (date & time) <span className="req">*</span>
              </label>
              <input
                className="form-control"
                type="datetime-local"
                value={markTime}
                onChange={(e) => setMarkTime(e.target.value)}
              />
              <small style={{ color: 'var(--ink-muted)', display: 'block', marginTop: 4 }}>
                For backdated attendance, set the actual check-in time
              </small>
              {backdated && (
                <span className="badge badge-warning" style={{ marginTop: 8, display: 'inline-block' }}>
                  Backdated — saving for {date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : sheet.length === 0 ? (
        <div className="card">
          <div className="empty-state">No active employees found for this filter.</div>
        </div>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
              {sheet.length} employees · <span style={{ color: 'var(--success)', fontWeight: 600 }}>P {presentCount}</span>
              {' · '}
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>A {absentCount}</span>
              {meta && <> · Unmarked {sheet.filter((r) => !r.status).length}</>}
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
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Batch</th>
                    <th>Marked At</th>
                    <th style={{ textAlign: 'center' }}>Present (P)</th>
                    <th style={{ textAlign: 'center' }}>Absent (A)</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.map((r, i) => (
                    <tr key={r.employeeId}>
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                            {r.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <strong>{r.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                              {r.empCode} · {r.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{r.department}</span>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        {(r.assignedBatches || []).length === 0 ? (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>—</span>
                        ) : (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                            value={r.batchId}
                            onChange={(e) => setBatch(r.employeeId, e.target.value)}
                          >
                            <option value="">Select batch</option>
                            {r.assignedBatches.map((b) => (
                              <option key={String(b.batchId)} value={String(b.batchId)}>
                                {b.courseName}: {b.batchName}
                                {b.startTime ? ` (${b.startTime})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                        {r.markedAt ? formatTime(r.markedAt) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className={`attn-btn ${r.status === 'P' ? 'attn-p active' : ''}`} onClick={() => setStatus(r.employeeId, 'P')}>
                          P
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className={`attn-btn ${r.status === 'A' ? 'attn-a active' : ''}`} onClick={() => setStatus(r.employeeId, 'A')}>
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
