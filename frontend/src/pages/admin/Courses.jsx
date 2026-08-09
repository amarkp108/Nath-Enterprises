import { useEffect, useState } from 'react';
import { BookOpen, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '../../api';
import { formatCurrency } from '../../utils';
import { useToast } from '../../components/Toast';

const emptyShift = () => ({ name: '', startTime: '', endTime: '', isActive: true });
const emptyForm = { name: '', description: '', defaultFee: '', duration: '', isActive: true, shifts: [] };

const formatShift = (s) => {
  const time = s.startTime || s.endTime ? `${s.startTime || '?'}-${s.endTime || '?'}` : '';
  return time ? `${s.name} (${time})` : s.name;
};

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api
      .get('/admin/courses')
      .then((res) => setCourses(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, shifts: [emptyShift()] });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      description: c.description || '',
      defaultFee: c.defaultFee ?? '',
      duration: c.duration || '',
      isActive: c.isActive !== false,
      shifts: (c.shifts || []).map((s) => ({
        _id: s._id,
        name: s.name || '',
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        isActive: s.isActive !== false,
      })),
    });
    setShowModal(true);
  };

  const setShift = (idx, key, value) => {
    setForm((f) => {
      const shifts = [...f.shifts];
      shifts[idx] = { ...shifts[idx], [key]: value };
      return { ...f, shifts };
    });
  };

  const addShift = () => setForm((f) => ({ ...f, shifts: [...f.shifts, emptyShift()] }));

  const removeShift = (idx) => {
    setForm((f) => ({ ...f, shifts: f.shifts.filter((_, i) => i !== idx) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Course name is required');
      return;
    }
    const shifts = form.shifts.filter((s) => s.name.trim());
    for (const s of shifts) {
      if (!s.name.trim()) {
        toast.warning('Shift name is required');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        defaultFee: Number(form.defaultFee) || 0,
        duration: form.duration,
        isActive: form.isActive,
        shifts,
      };
      if (editing) {
        await api.put(`/admin/courses/${editing._id}`, payload);
        toast.success('Course updated successfully');
      } else {
        await api.post('/admin/courses', payload);
        toast.success('Course added successfully');
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete course "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/courses/${c._id}`);
      toast.success(`"${c.name}" deleted`);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Course Master</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', marginTop: 2 }}>
            Courses, fees, and shift / batch timings
          </p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
          <Plus size={16} /> Add Course
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : courses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BookOpen size={40} />
            <p>No courses yet</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openAdd}>
              <Plus size={16} /> Add First Course
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Shifts / Batches</th>
                  <th>Duration</th>
                  <th>Default Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const shifts = (c.shifts || []).filter((s) => s.isActive !== false);
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            className="stat-icon"
                            style={{ width: 34, height: 34, marginBottom: 0, background: 'var(--brand-subtle)', color: 'var(--brand)' }}
                          >
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <strong>{c.name}</strong>
                            {c.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', maxWidth: 200 }}>{c.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {shifts.length === 0 ? (
                          <span style={{ color: 'var(--ink-muted)' }}>No shifts</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {shifts.map((s) => (
                              <span key={s._id} className="badge badge-info">
                                {formatShift(s)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{c.duration || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(c.defaultFee)}</td>
                      <td>
                        <span className={`badge ${c.isActive !== false ? 'badge-success' : 'badge-muted'}`}>
                          {c.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn btn-sm btn-ghost" title="Edit" onClick={() => openEdit(c)}>
                            <Pencil size={16} />
                          </button>
                          <button className="btn btn-sm btn-ghost" title="Delete" onClick={() => handleDelete(c)} style={{ color: 'var(--danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Course' : 'Add Course'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Course Name <span className="req">*</span>
                  </label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Default Fee (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={form.defaultFee}
                      onChange={(e) => setForm({ ...form, defaultFee: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <input
                      className="form-control"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 1 Year"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Shifts / Batches</label>
                    <button type="button" className="btn btn-sm btn-outline" onClick={addShift}>
                      <Plus size={14} /> Add Shift
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
                    e.g. PGDCA Morning 9–11, Afternoon 2–4, Evening 5–7
                  </p>
                  {form.shifts.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>No shifts — attendance will be course-wide.</p>
                  ) : (
                    form.shifts.map((s, idx) => (
                      <div
                        key={s._id || idx}
                        className="form-row-3"
                        style={{
                          marginBottom: '0.65rem',
                          padding: '0.65rem',
                          background: 'var(--bg-muted)',
                          borderRadius: 'var(--radius-xs)',
                          alignItems: 'end',
                        }}
                      >
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>
                            Name <span className="req">*</span>
                          </label>
                          <input
                            className="form-control"
                            value={s.name}
                            onChange={(e) => setShift(idx, 'name', e.target.value)}
                            placeholder="Morning"
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Start</label>
                          <input
                            className="form-control"
                            type="time"
                            value={s.startTime}
                            onChange={(e) => setShift(idx, 'startTime', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', gap: 8, alignItems: 'end' }}>
                          <div style={{ flex: 1 }}>
                            <label>End</label>
                            <input
                              className="form-control"
                              type="time"
                              value={s.endTime}
                              onChange={(e) => setShift(idx, 'endTime', e.target.value)}
                            />
                          </div>
                          <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)', marginBottom: 2 }} onClick={() => removeShift(idx)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {editing && (
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={form.isActive ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="spin" />}
                  {editing ? 'Save Changes' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
