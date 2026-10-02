import { useEffect, useState } from 'react';
import { X, Loader2, Lock } from 'lucide-react';
import api from '../api';
import { useToast } from './Toast';

const AVATAR_MAX = 50 * 1024;
const DOC_MAX = 100 * 1024;

const empty = {
  name: '',
  phone: '',
  password: '',
  course: '',
  totalFee: '',
  feeType: 'one_time',
  email: '',
  address: '',
  fatherName: '',
  motherName: '',
  dateOfBirth: '',
  gender: '',
  batch: '',
  batchId: '',
  notes: '',
  admissionDate: new Date().toISOString().slice(0, 10),
};

const digitsOnly = (v) => String(v || '').replace(/\D/g, '').slice(0, 10);

export default function AddStudentModal({ onClose, onSuccess, student }) {
  const toast = useToast();
  const isEdit = !!student;
  const [form, setForm] = useState(empty);
  const [courses, setCourses] = useState([]);
  const [files, setFiles] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState({ exists: false, count: 0, students: [], message: '' });
  const [checkingPhone, setCheckingPhone] = useState(false);

  useEffect(() => {
    api.get('/admin/courses').then((res) => setCourses(res.data.data.filter((c) => c.isActive !== false))).catch(console.error);
    if (student) {
      setForm({
        name: student.name || '',
        phone: student.phone || '',
        password: '',
        course: student.course || '',
        totalFee: student.feeType === 'monthly' ? (student.monthlyFee ?? student.totalFee ?? '') : (student.totalFee ?? ''),
        feeType: student.feeType === 'monthly' ? 'monthly' : 'one_time',
        email: student.email || '',
        address: student.address || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
        gender: student.gender || '',
        batch: student.batch || '',
        batchId: student.batchId ? String(student.batchId) : '',
        notes: student.notes || '',
        admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : '',
        status: student.status || 'Active',
      });
    }
  }, [student]);

  useEffect(() => {
    if (isEdit) return;
    const phone = digitsOnly(form.phone);
    if (phone.length !== 10) {
      setPhoneInfo({ exists: false, count: 0, students: [], message: '' });
      return;
    }
    let cancelled = false;
    setCheckingPhone(true);
    const t = setTimeout(() => {
      api
        .get(`/admin/students/check-phone?phone=${encodeURIComponent(phone)}`)
        .then((res) => {
          if (cancelled) return;
          const data = res.data.data || {};
          setPhoneInfo(data);
          if (data.exists) setForm((f) => ({ ...f, password: '', phone }));
        })
        .catch(() => {
          if (!cancelled) setPhoneInfo({ exists: false, count: 0, students: [], message: '' });
        })
        .finally(() => {
          if (!cancelled) setCheckingPhone(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.phone, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const passwordLocked = !isEdit && phoneInfo.exists;

  const selectedCourse = courses.find((c) => c.name === form.course);
  const courseShifts = (selectedCourse?.shifts || []).filter((s) => s.isActive !== false);

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Profile photo must be an image');
      return;
    }
    if (file.size > AVATAR_MAX) {
      toast.warning(`Profile photo must be 50 KB or less (selected: ${Math.round(file.size / 1024)} KB)`);
      return;
    }
    setAvatar(file);
  };

  const onDocsChange = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    const tooBig = selected.find((f) => f.size > DOC_MAX);
    if (tooBig) {
      toast.warning(`"${tooBig.name}" exceeds 100 KB limit (${Math.round(tooBig.size / 1024)} KB)`);
      return;
    }
    setFiles(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.course || form.totalFee === '') {
      toast.warning('Name, phone, course and fee are required');
      return;
    }
    if (courseShifts.length > 0 && !form.batchId) {
      toast.warning('Please select a batch/shift for this course');
      return;
    }
    if (!isEdit && !passwordLocked && !form.password) {
      toast.warning('Password is required for new students');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'password' && passwordLocked) return;
        if (v !== '' && v !== undefined) fd.append(k, v);
      });
      const feeType = form.feeType === 'monthly' || selectedCourse?.feeType === 'monthly' ? 'monthly' : 'one_time';
      fd.set('feeType', feeType);
      if (feeType === 'monthly') {
        fd.set('monthlyFee', form.totalFee);
      }
      files.forEach((f) => fd.append('documents', f));
      if (avatar) fd.append('avatar', avatar);

      if (isEdit) {
        await api.put(`/admin/students/${student._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Student updated successfully');
      } else {
        const { data } = await api.post('/admin/students', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(data.message || 'Student added successfully');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>
                  Phone <span className="req">*</span>
                </label>
                <input
                  className="form-control"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => set('phone', digitsOnly(e.target.value))}
                  required
                />
                {!isEdit && checkingPhone && digitsOnly(form.phone).length === 10 && (
                  <small style={{ color: 'var(--ink-muted)', display: 'block', marginTop: 4 }}>Checking phone…</small>
                )}
                {!isEdit && phoneInfo.exists && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '0.65rem 0.75rem',
                      background: 'var(--warning-soft)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid #fbbf24',
                      fontSize: '0.82rem',
                    }}
                  >
                    <strong>Already added</strong> — use previous password for the login.
                    <div style={{ marginTop: 4, color: 'var(--ink-muted)' }}>
                      {phoneInfo.count} student(s) on this number: {phoneInfo.students.map((s) => s.name).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Password {!isEdit && !passwordLocked && <span className="req">*</span>}
                  {isEdit && <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}> (leave blank to keep)</span>}
                  {passwordLocked && (
                    <span style={{ fontWeight: 400, color: 'var(--warning)', marginLeft: 6 }}>
                      <Lock size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Locked
                    </span>
                  )}
                </label>
                <input
                  className="form-control"
                  type="text"
                  value={passwordLocked ? '•••••••• (use previous password)' : form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required={!isEdit && !passwordLocked}
                  minLength={passwordLocked ? undefined : 6}
                  placeholder={isEdit ? '••••••' : passwordLocked ? 'Using previous password' : 'Min 6 characters'}
                  disabled={passwordLocked}
                  readOnly={passwordLocked}
                  style={passwordLocked ? { background: 'var(--bg-muted)', color: 'var(--ink-muted)' } : undefined}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>
                  Course <span className="req">*</span>
                </label>
                <select
                  className="form-control"
                  value={form.course}
                  onChange={(e) => {
                    const name = e.target.value;
                    const c = courses.find((x) => x.name === name);
                    setForm((f) => ({
                      ...f,
                      course: name,
                      batchId: '',
                      batch: '',
                      feeType: c?.feeType === 'monthly' ? 'monthly' : 'one_time',
                      totalFee: !isEdit && c ? c.defaultFee : f.totalFee,
                    }));
                  }}
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  {form.feeType === 'monthly' || selectedCourse?.feeType === 'monthly' ? 'Monthly Fee (₹)' : 'Total Fee (₹)'}{' '}
                  <span className="req">*</span>
                </label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  value={form.totalFee}
                  onChange={(e) => set('totalFee', e.target.value)}
                  required
                />
                {(form.feeType === 'monthly' || selectedCourse?.feeType === 'monthly') && (
                  <small style={{ color: 'var(--ink-muted)', display: 'block', marginTop: 4 }}>
                    Auto-adds every month on the day after admission date
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Batch / Shift {courseShifts.length > 0 && <span className="req">*</span>}
                </label>
                {courseShifts.length > 0 ? (
                  <select
                    className="form-control"
                    value={form.batchId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const shift = courseShifts.find((s) => String(s._id) === id);
                      setForm((f) => ({ ...f, batchId: id, batch: shift?.name || '' }));
                    }}
                    required
                  >
                    <option value="">Select batch</option>
                    {courseShifts.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                        {s.startTime || s.endTime ? ` (${s.startTime || '?'}-${s.endTime || '?'})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    value={form.batch}
                    onChange={(e) => set('batch', e.target.value)}
                    placeholder={form.course ? 'No shifts — add in Course Master' : 'Select course first'}
                    disabled={!form.course}
                  />
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Father's Name</label>
                <input className="form-control" value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mother's Name</label>
                <input className="form-control" value={form.motherName} onChange={(e) => set('motherName', e.target.value)} />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Date of Birth</label>
                <input className="form-control" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select className="form-control" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admission Date</label>
                <input className="form-control" type="date" value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} />
              </div>
            </div>

            {isEdit && (
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Completed</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Address</label>
              <textarea className="form-control" value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-control" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </div>

            <div className="form-group">
              <label>Profile Photo (max 50 KB)</label>
              <input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} />
              {avatar && (
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                  {avatar.name} ({Math.round(avatar.size / 1024)} KB)
                </p>
              )}
              {!avatar && student?.avatar && (
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 4 }}>Current photo kept unless you choose a new one</p>
              )}
            </div>

            <div className="form-group">
              <label>Documents (ID, marksheets — max 100 KB each)</label>
              <input
                className="form-control"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={onDocsChange}
              />
              {files.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                  {files.length} file(s) selected
                </p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} />}
              {isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
