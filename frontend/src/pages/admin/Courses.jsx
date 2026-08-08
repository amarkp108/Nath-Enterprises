import { useEffect, useState } from 'react';
import { BookOpen, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '../../api';
import { formatCurrency } from '../../utils';
import { useToast } from '../../components/Toast';

const emptyForm = { name: '', description: '', defaultFee: '', duration: '', isActive: true };

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
    setForm(emptyForm);
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
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Course name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        defaultFee: Number(form.defaultFee) || 0,
        duration: form.duration,
        isActive: form.isActive,
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
            Add, edit, or remove courses offered at your institute
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
                  <th>Duration</th>
                  <th>Default Fee</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="stat-icon" style={{ width: 34, height: 34, marginBottom: 0, background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
                          <BookOpen size={16} />
                        </div>
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td>{c.duration || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.defaultFee)}</td>
                    <td style={{ maxWidth: 240, color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
                      {c.description || '—'}
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
