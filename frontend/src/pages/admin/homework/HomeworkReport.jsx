import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart, Trash2, Eye, X, Paperclip } from 'lucide-react';
import api from '../../../api';
import { formatDate } from '../../../utils';
import { useToast } from '../../../components/Toast';

export default function HomeworkReport() {
  const toast = useToast();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendType, setSendType] = useState('all');
  const [course, setCourse] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [detail, setDetail] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (sendType !== 'all') q.set('sendType', sendType);
      if (course !== 'all') q.set('course', course);
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (search) q.set('search', search);
      const { data } = await api.get(`/homework/admin?${q}`);
      setList(data.data);
      setStats(data.stats);
    } catch {
      toast.error('Failed to load report');
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
  }, [sendType, course, from, to, search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this homework record?')) return;
    try {
      await api.delete(`/homework/admin/${id}`);
      toast.success('Homework deleted');
      fetch();
      if (detail?._id === id) setDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/homework')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileBarChart size={18} /> Homework Sent Report
        </h3>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/homework/send')}>
          Send New
        </button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
            <div className="stat-label">Total Sent</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
            <div className="stat-label">Class-wise</div>
            <div className="stat-value">{stats.classWise}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#c45c26', '--icon-bg': '#fef3ee' }}>
            <div className="stat-label">Student-wise</div>
            <div className="stat-value">{stats.studentWise}</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
            <div className="stat-label">Total Recipients</div>
            <div className="stat-value">{stats.totalRecipients}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          className="form-control"
          placeholder="Search title, subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <select className="form-control" style={{ maxWidth: 160 }} value={sendType} onChange={(e) => setSendType(e.target.value)}>
          <option value="all">All types</option>
          <option value="class">Class-wise</option>
          <option value="students">Student-wise</option>
        </select>
        <select className="form-control" style={{ maxWidth: 160 }} value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="all">All classes</option>
          {courses.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input className="form-control" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 150 }} />
        <input className="form-control" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 150 }} />
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Recipients</th>
                  <th>Due</th>
                  <th>Sent</th>
                  <th>By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      No homework sent yet
                    </td>
                  </tr>
                ) : (
                  list.map((h) => (
                    <tr key={h._id}>
                      <td>
                        <strong>{h.title}</strong>
                        {h.attachment?.url && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--brand)', marginTop: 2 }}>
                            <Paperclip size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Attachment
                          </div>
                        )}
                      </td>
                      <td>{h.subject || '—'}</td>
                      <td>
                        <span className={`badge ${h.sendType === 'class' ? 'badge-info' : 'badge-warning'}`}>
                          {h.sendType === 'class' ? 'Class' : 'Students'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {h.sendType === 'class' ? h.courses?.join(', ') || '—' : `${h.recipients?.length || 0} selected`}
                      </td>
                      <td style={{ fontWeight: 600 }}>{h.recipients?.length || 0}</td>
                      <td>{h.dueDate ? formatDate(h.dueDate) : '—'}</td>
                      <td>{formatDate(h.sentAt)}</td>
                      <td>{h.sentBy?.name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn btn-sm btn-ghost" title="View" onClick={() => setDetail(h)}>
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-sm btn-ghost" title="Delete" onClick={() => handleDelete(h._id)} style={{ color: 'var(--danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detail.title}</h2>
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ marginBottom: '1rem' }}>
                <div className="detail-item">
                  <label>Subject</label>
                  <p>{detail.subject || '—'}</p>
                </div>
                <div className="detail-item">
                  <label>Type</label>
                  <p>{detail.sendType === 'class' ? 'Class-wise' : 'Student-wise'}</p>
                </div>
                <div className="detail-item">
                  <label>Due Date</label>
                  <p>{detail.dueDate ? formatDate(detail.dueDate) : '—'}</p>
                </div>
                <div className="detail-item">
                  <label>Sent On</label>
                  <p>{formatDate(detail.sentAt)}</p>
                </div>
              </div>
              {detail.sendType === 'class' && (
                <div className="detail-item" style={{ marginBottom: '1rem' }}>
                  <label>Classes</label>
                  <p>{detail.courses?.join(', ')}</p>
                </div>
              )}
              {detail.description && (
                <div className="detail-item" style={{ marginBottom: '1rem' }}>
                  <label>Description</label>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{detail.description}</p>
                </div>
              )}
              {detail.attachment?.url && (
                <div style={{ marginBottom: '1rem' }}>
                  <a href={detail.attachment.url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    <Paperclip size={14} /> {detail.attachment.name || 'Download attachment'}
                  </a>
                </div>
              )}
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.65rem' }}>
                Recipients ({detail.recipients?.length || 0})
              </h4>
              <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Course</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.recipients || []).map((s) => (
                      <tr key={s._id}>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
