import { useEffect, useState } from 'react';
import { NotebookPen, Paperclip, Calendar } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';
import { useToast } from '../../components/Toast';

export default function StudentHomework() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/homework/student/my')
      .then((res) => setList(res.data.data || []))
      .catch(() => toast.error('Failed to load homework'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = list.filter((h) => h.dueDate && new Date(h.dueDate) >= new Date().setHours(0, 0, 0, 0));
  const overdue = list.filter((h) => h.dueDate && new Date(h.dueDate) < new Date().setHours(0, 0, 0, 0));

  return (
    <>
      <div className="toolbar">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotebookPen size={18} style={{ color: 'var(--brand)' }} />
            My Homework
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 2 }}>Homework assigned to you</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
          <div className="stat-label">Total</div>
          <div className="stat-value">{list.length}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
          <div className="stat-label">Upcoming Due</div>
          <div className="stat-value">{upcoming.length}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{overdue.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : list.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <NotebookPen size={40} />
            <p>No homework assigned yet</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {list.map((h) => {
            const isOverdue = h.dueDate && new Date(h.dueDate) < new Date().setHours(0, 0, 0, 0);
            return (
              <button
                key={h._id}
                type="button"
                className="card"
                onClick={() => setSelected(selected?._id === h._id ? null : h)}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: selected?._id === h._id ? '1px solid var(--brand)' : '1px solid var(--border)',
                  width: '100%',
                  padding: 0,
                }}
              >
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        {h.subject && <span className="badge badge-info">{h.subject}</span>}
                        <span className={`badge ${h.sendType === 'class' ? 'badge-muted' : 'badge-warning'}`}>
                          {h.sendType === 'class' ? 'Class' : 'Personal'}
                        </span>
                        {isOverdue && <span className="badge badge-danger">Overdue</span>}
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{h.title}</h4>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textAlign: 'right' }}>
                      <div>Sent {formatDate(h.sentAt)}</div>
                      {h.dueDate && (
                        <div style={{ marginTop: 4, color: isOverdue ? 'var(--danger)' : 'var(--ink-soft)', fontWeight: 500 }}>
                          <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                          Due {formatDate(h.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {selected?._id === h._id && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                      {h.description ? (
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--ink-soft)' }}>
                          {h.description}
                        </p>
                      ) : (
                        <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem' }}>No additional instructions</p>
                      )}
                      {h.attachment?.url && (
                        <a
                          href={h.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: '0.85rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Paperclip size={14} /> {h.attachment.name || 'Open attachment'}
                        </a>
                      )}
                      <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.75rem' }}>
                        From: {h.sentBy?.name || 'Admin'}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
