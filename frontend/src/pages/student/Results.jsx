import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import api from '../../api';
import { formatDate } from '../../utils';

export default function StudentResults() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/results/student/my')
      .then((res) => setList(res.data.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} style={{ color: 'var(--brand)' }} />
          My Results
        </h3>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', marginTop: 4 }}>Results published by your teachers</p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : list.length === 0 ? (
        <div className="card">
          <div className="empty-state">No results published yet</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Obtained</th>
                  <th>Full</th>
                  <th>%</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const pct = r.fullMarks ? Math.round((r.obtainedMarks / r.fullMarks) * 1000) / 10 : 0;
                  return (
                    <tr key={r._id}>
                      <td>{formatDate(r.examDate)}</td>
                      <td>
                        <strong>{r.subject}</strong>
                        {(r.course || r.batch) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                            {[r.course, r.batch].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.obtainedMarks}</td>
                      <td>{r.fullMarks}</td>
                      <td>
                        <span className={`badge ${pct >= 40 ? 'badge-success' : 'badge-danger'}`}>{pct}%</span>
                      </td>
                      <td style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{r.remark || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
