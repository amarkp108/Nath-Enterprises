import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Pencil, X, Loader2, List } from 'lucide-react';
import api from '../../../api';
import { formatDate } from '../../../utils';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission } from '../../../constants/modules';

export default function ResultsList() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canEdit = role === 'admin' || hasPermission(user, role, 'results', 'edit');
  const canDelete = role === 'admin' || hasPermission(user, role, 'results', 'delete');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      const { data } = await api.get(`/results/admin?${q}`);
      setList(data.data || []);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetch, 200);
    return () => clearTimeout(t);
  }, [search]);

  const openEdit = (r) => {
    setEditing(r);
    setEditForm({
      subject: r.subject,
      fullMarks: r.fullMarks,
      obtainedMarks: r.obtainedMarks,
      examDate: r.examDate ? r.examDate.slice(0, 10) : '',
      remark: r.remark || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/results/admin/${editing._id}`, {
        ...editForm,
        fullMarks: Number(editForm.fullMarks),
        obtainedMarks: Number(editForm.obtainedMarks),
      });
      toast.success('Result updated');
      setEditing(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete result for ${r.studentName} — ${r.subject}?`)) return;
    try {
      await api.delete(`/results/admin/${r._id}`);
      toast.success('Result deleted');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/results')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <List size={18} /> Published Results
        </h3>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/results/publish')}>
          Publish New
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="form-control"
            placeholder="Search name, phone, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : list.length === 0 ? (
          <div className="empty-state">No results published yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>%</th>
                  <th>Course / Batch</th>
                  <th>By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const pct = r.fullMarks ? Math.round((r.obtainedMarks / r.fullMarks) * 1000) / 10 : 0;
                  return (
                    <tr key={r._id}>
                      <td>{formatDate(r.examDate)}</td>
                      <td>
                        <strong>{r.studentName}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{r.phone}</div>
                      </td>
                      <td>
                        {r.subject}
                        {r.remark && <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{r.remark}</div>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {r.obtainedMarks} / {r.fullMarks}
                      </td>
                      <td>
                        <span className={`badge ${pct >= 40 ? 'badge-success' : 'badge-danger'}`}>{pct}%</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {r.course}
                        {r.batch ? ` · ${r.batch}` : ''}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{r.publishedByName || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-ghost" onClick={() => openEdit(r)}>
                              <Pencil size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(r)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Result — {editing.studentName}</h2>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    className="form-control"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Marks</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      value={editForm.fullMarks}
                      onChange={(e) => setEditForm({ ...editForm, fullMarks: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Obtained</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={editForm.obtainedMarks}
                      onChange={(e) => setEditForm({ ...editForm, obtainedMarks: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Exam Date</label>
                  <input
                    className="form-control"
                    type="date"
                    value={editForm.examDate}
                    onChange={(e) => setEditForm({ ...editForm, examDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Remark</label>
                  <input
                    className="form-control"
                    value={editForm.remark}
                    onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
