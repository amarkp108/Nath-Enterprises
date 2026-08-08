import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';

export default function SendHomework() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    sendType: 'class',
    dueDate: '',
  });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    api.get('/admin/courses').then((res) => {
      setCourses((res.data.data || []).filter((c) => c.isActive !== false));
    });
    api.get('/admin/students?limit=500&status=Active').then((res) => {
      setStudents(res.data.data || []);
      const fromStudents = [...new Set((res.data.data || []).map((s) => s.course).filter(Boolean))];
      setCourses((prev) => {
        const names = new Set(prev.map((c) => c.name));
        const merged = [...prev];
        fromStudents.forEach((n) => {
          if (!names.has(n)) merged.push({ _id: n, name: n });
        });
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });
    }).catch(() => {});
  }, []);

  const toggleCourse = (name) => {
    setSelectedCourses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.course?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.warning('Title is required');
      return;
    }
    if (form.sendType === 'class' && selectedCourses.length === 0) {
      toast.warning('Select at least one class');
      return;
    }
    if (form.sendType === 'students' && selectedStudents.length === 0) {
      toast.warning('Select at least one student');
      return;
    }
    if (attachment && attachment.size > 100 * 1024) {
      toast.warning('Attachment must be 100 KB or less');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description);
      fd.append('subject', form.subject);
      fd.append('sendType', form.sendType);
      if (form.dueDate) fd.append('dueDate', form.dueDate);
      fd.append('courses', JSON.stringify(selectedCourses));
      fd.append('studentIds', JSON.stringify(selectedStudents));
      if (attachment) fd.append('attachment', attachment);

      const { data } = await api.post('/homework/admin', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.message || 'Homework sent');
      navigate('/admin/homework/report');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send homework');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/homework')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Send Homework</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-body">
            <div className="form-group">
              <label>
                Title <span className="req">*</span>
              </label>
              <input
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chapter 5 exercises"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Subject</label>
                <input
                  className="form-control"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Physics"
                />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description / Instructions</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Write homework details..."
              />
            </div>
            <div className="form-group">
              <label>Attachment (optional, max 100 KB)</label>
              <input
                className="form-control"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              {attachment && (
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                  {attachment.name} ({Math.round(attachment.size / 1024)} KB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <h3>Send To</h3>
          </div>
          <div className="card-body">
            <div className="role-tabs" style={{ maxWidth: 360, marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`role-tab ${form.sendType === 'class' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, sendType: 'class' })}
              >
                Class-wise
              </button>
              <button
                type="button"
                className={`role-tab ${form.sendType === 'students' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, sendType: 'students' })}
              >
                Student-wise
              </button>
            </div>

            {form.sendType === 'class' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
                  Select class(es) — all active students in those classes will receive this homework
                </p>
                <div className="filter-chips">
                  {courses.map((c) => (
                    <button
                      key={c._id || c.name}
                      type="button"
                      className={`chip ${selectedCourses.includes(c.name) ? 'active' : ''}`}
                      onClick={() => toggleCourse(c.name)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                {selectedCourses.length > 0 && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.85rem', color: 'var(--brand)', fontWeight: 600 }}>
                    {selectedCourses.length} class(es) selected · ~
                    {students.filter((s) => selectedCourses.includes(s.course) && s.status === 'Active').length} students
                  </p>
                )}
              </>
            ) : (
              <>
                <input
                  className="form-control"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ marginBottom: '0.85rem', maxWidth: 320 }}
                />
                <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)' }}>
                  {filteredStudents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '1.5rem' }}>
                      No students found
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 48 }}></th>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s._id} className="clickable" onClick={() => toggleStudent(s._id)}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(s._id)}
                                onChange={() => toggleStudent(s._id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td>
                              <strong>{s.name}</strong>
                            </td>
                            <td>
                              <span className="badge badge-info">{s.course}</span>
                            </td>
                            <td>{s.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.85rem', color: 'var(--brand)', fontWeight: 600 }}>
                    {selectedStudents.length} student(s) selected
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/homework')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Send Homework
          </button>
        </div>
      </form>
    </>
  );
}
