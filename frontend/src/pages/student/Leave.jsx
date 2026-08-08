import { useEffect, useState } from 'react';
import { CalendarOff, Plus, X, Loader2, Trash2 } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';
import { useToast } from '../../components/Toast';

const empty = {
  fromDate: new Date().toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10),
  reason: '',
  leaveType: 'Personal',
};

export default function StudentLeave() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leave/student/my');
      setLeaves(data.data);
      setStats(data.stats);
    } catch {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.warning('Please enter a reason');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast.warning('To date cannot be before from date');
      return;
    }
    setSaving(true);
    try {
      await api.post('/leave/student', form);
      toast.success('Leave application submitted');
      setShowForm(false);
      setForm(empty);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave application?')) return;
    try {
      await api.delete(`/leave/student/${id}`);
      toast.success('Leave cancelled');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const statusBadge = (status) => {
    if (status === 'Accepted') return 'badge-success';
    if (status === 'Rejected') return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOff size={18} style={{ color: 'var(--brand)' }} />
            Leave Application
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 2 }}>Apply for leave and track status</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#d97706', '--icon-bg': '#fef3c7' }}>
            <div className="stat-label">Pending</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
            <div className="stat-label">Accepted</div>
            <div className="stat-value">{stats.accepted}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{stats.rejected}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>My Applications</h3>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : leaves.length === 0 ? (
          <div className="empty-state">
            <CalendarOff size={40} />
            <p>No leave applications yet</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Apply Leave
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Remark</th>
                  <th>Applied</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <span className="badge badge-muted">{l.leaveType}</span>
                    </td>
                    <td>{formatDate(l.fromDate)}</td>
                    <td>{formatDate(l.toDate)}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td>
                      <span className={`badge ${statusBadge(l.status)}`}>{l.status}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{l.adminRemark || '—'}</td>
                    <td>{formatDate(l.createdAt)}</td>
                    <td>
                      {l.status === 'Pending' && (
                        <button className="btn btn-sm btn-ghost" title="Cancel" onClick={() => handleCancel(l._id)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apply for Leave</h2>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Leave Type</label>
                  <select className="form-control" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                    <option>Sick</option>
                    <option>Personal</option>
                    <option>Family</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      From Date <span className="req">*</span>
                    </label>
                    <input
                      className="form-control"
                      type="date"
                      value={form.fromDate}
                      onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      To Date <span className="req">*</span>
                    </label>
                    <input
                      className="form-control"
                      type="date"
                      value={form.toDate}
                      onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Reason <span className="req">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Why do you need leave?"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
