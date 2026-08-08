import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Loader2, Building2 } from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';

export default function Departments() {
  const toast = useToast();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/departments');
      setList(data.data);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || '', isActive: d.isActive !== false });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Department name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/settings/departments/${editing._id}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/settings/departments', form);
        toast.success('Department added');
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    try {
      await api.delete(`/settings/departments/${d._id}`);
      toast.success('Department deleted');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/settings')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Department Master</h3>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Building2 size={40} />
            <p>No departments yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <strong>{d.name}</strong>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>{d.description || '—'}</td>
                    <td>
                      <span className={`badge ${d.isActive !== false ? 'badge-success' : 'badge-muted'}`}>
                        {d.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(d)}>
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(d)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Department' : 'Add Department'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Name <span className="req">*</span>
                  </label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
                  {editing ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
