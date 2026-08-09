import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Award } from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission } from '../../../constants/modules';

const empty = {
  phone: '',
  subject: '',
  fullMarks: '',
  obtainedMarks: '',
  examDate: new Date().toISOString().slice(0, 10),
  remark: '',
};

export default function PublishResult() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canPublish = role === 'admin' || hasPermission(user, role, 'results', 'create');

  const [form, setForm] = useState(empty);
  const [student, setStudent] = useState(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const lookup = async () => {
    if (!form.phone.trim()) {
      toast.warning('Enter student mobile number');
      return;
    }
    setLooking(true);
    setStudent(null);
    try {
      const { data } = await api.get(`/results/admin/lookup?phone=${encodeURIComponent(form.phone.trim())}`);
      setStudent(data.data);
      toast.success(`Found: ${data.data.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Student not found');
      setStudent(null);
    } finally {
      setLooking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error('You do not have permission to publish results');
      return;
    }
    if (!student) {
      toast.warning('Lookup student by mobile first');
      return;
    }
    if (!form.subject || form.fullMarks === '' || form.obtainedMarks === '' || !form.examDate) {
      toast.warning('Subject, full marks, obtained marks and date are required');
      return;
    }
    if (Number(form.obtainedMarks) > Number(form.fullMarks)) {
      toast.warning('Obtained marks cannot exceed full marks');
      return;
    }

    setSaving(true);
    try {
      await api.post('/results/admin', {
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        fullMarks: Number(form.fullMarks),
        obtainedMarks: Number(form.obtainedMarks),
        examDate: form.examDate,
        remark: form.remark,
      });
      toast.success('Result published — student can see it in My Results');
      setForm({ ...empty, phone: form.phone });
      // keep student so teacher can publish another subject for same student
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/results')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={18} /> Publish Result
        </h3>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                Student Mobile <span className="req">*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-control"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    set('phone', e.target.value);
                    setStudent(null);
                  }}
                  placeholder="Enter registered mobile"
                  required
                />
                <button type="button" className="btn btn-secondary" onClick={lookup} disabled={looking}>
                  {looking ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  Find
                </button>
              </div>
            </div>

            {student && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                <strong>{student.name}</strong>
                <div style={{ color: 'var(--ink-muted)', marginTop: 4 }}>
                  {student.course}
                  {student.batch ? ` · ${student.batch}` : ''} · {student.phone}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>
                Subject Name <span className="req">*</span>
              </label>
              <input
                className="form-control"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="e.g. Computer Fundamentals"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Full Marks <span className="req">*</span>
                </label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.fullMarks}
                  onChange={(e) => set('fullMarks', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Obtained Marks <span className="req">*</span>
                </label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.obtainedMarks}
                  onChange={(e) => set('obtainedMarks', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Exam Date <span className="req">*</span>
              </label>
              <input className="form-control" type="date" value={form.examDate} onChange={(e) => set('examDate', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Remark (optional)</label>
              <input className="form-control" value={form.remark} onChange={(e) => set('remark', e.target.value)} placeholder="e.g. Unit test 1" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving || !canPublish}>
              {saving && <Loader2 size={16} className="spin" />}
              Publish Result
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
