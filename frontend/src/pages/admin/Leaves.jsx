import { useEffect, useState } from 'react';
import { CalendarOff, Check, X, Loader2 } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';
import { useToast } from '../../components/Toast';

export default function AdminLeaves() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Pending');
  const [course, setCourse] = useState('all');
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [remark, setRemark] = useState('');
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (status !== 'all') q.set('status', status);
      if (course !== 'all') q.set('course', course);
      if (search) q.set('search', search);
      const { data } = await api.get(`/leave/admin?${q}`);
      setLeaves(data.data);
      setStats(data.stats);
    } catch {
      toast.error('Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/admin/courses').then((res) => setCourses(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetch, 200);
    return () => clearTimeout(t);
  }, [status, course, search]);

  const openReview = (leave, nextStatus) => {
    setReviewing(leave);
    setAction(nextStatus);
    setRemark('');
  };

  const submitReview = async () => {
    if (!reviewing || !action) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/leave/admin/${reviewing._id}/review`, {
        status: action,
        adminRemark: remark,
      });
      toast.success(data.message);
      setReviewing(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s) => {
    if (s === 'Accepted') return 'badge-success';
    if (s === 'Rejected') return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOff size={18} style={{ color: 'var(--brand)' }} />
            Leave Requests
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 2 }}>Accept or reject student leave applications</p>
        </div>
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

      <div className="toolbar">
        <div className="filter-chips">
          {['Pending', 'Accepted', 'Rejected', 'all'].map((s) => (
            <button key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <select className="form-control" style={{ maxWidth: 160 }} value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="all">All classes</option>
          {courses.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="form-control"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : leaves.length === 0 ? (
          <div className="empty-state">No leave applications found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <strong>{l.student?.name || '—'}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{l.student?.phone}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{l.student?.course}</span>
                    </td>
                    <td>
                      <span className="badge badge-muted">{l.leaveType}</span>
                    </td>
                    <td>{formatDate(l.fromDate)}</td>
                    <td>{formatDate(l.toDate)}</td>
                    <td style={{ maxWidth: 180, fontSize: '0.88rem' }}>{l.reason}</td>
                    <td>
                      <span className={`badge ${statusBadge(l.status)}`}>{l.status}</span>
                      {l.adminRemark && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 2 }}>{l.adminRemark}</div>
                      )}
                    </td>
                    <td>{formatDate(l.createdAt)}</td>
                    <td>
                      {l.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn btn-sm btn-primary" title="Accept" onClick={() => openReview(l, 'Accepted')}>
                            <Check size={14} /> Accept
                          </button>
                          <button className="btn btn-sm btn-danger" title="Reject" onClick={() => openReview(l, 'Rejected')}>
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                          by {l.reviewedBy?.name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewing && (
        <div className="modal-overlay" onClick={() => setReviewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{action === 'Accepted' ? 'Accept Leave' : 'Reject Leave'}</h2>
              <button className="btn btn-ghost" onClick={() => setReviewing(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-xs)', marginBottom: '1rem' }}>
                <strong>{reviewing.student?.name}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                  {formatDate(reviewing.fromDate)} → {formatDate(reviewing.toDate)} · {reviewing.leaveType}
                </div>
                <p style={{ marginTop: '0.65rem', fontSize: '0.9rem' }}>{reviewing.reason}</p>
              </div>
              <div className="form-group">
                <label>Remark (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add a note for the student..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setReviewing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${action === 'Accepted' ? 'btn-primary' : 'btn-danger'}`}
                onClick={submitReview}
                disabled={saving}
              >
                {saving && <Loader2 size={16} className="spin" />}
                {action === 'Accepted' ? 'Accept Leave' : 'Reject Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
