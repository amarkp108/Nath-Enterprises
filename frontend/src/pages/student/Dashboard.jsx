import { useEffect, useState } from 'react';
import { IndianRupee, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api';
import { formatCurrency, formatDate } from '../../utils';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/student/dashboard')
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (!data) return <div className="empty-state">Failed to load</div>;

  const { student, payments, pendingFee, percentPaid } = data;

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, #0c1f1c 0%, #134e4a 50%, #0f766e 100%)',
          borderRadius: 'var(--radius)',
          padding: '1.75rem',
          color: 'white',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Welcome back,</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, marginBottom: '0.5rem' }}>
            {student.name}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '0.25rem 0.7rem',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {student.course}
            </span>
            {student.batch && (
              <span
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '0.25rem 0.7rem',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                }}
              >
                {student.batch}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
          <div className="stat-icon">
            <IndianRupee size={20} />
          </div>
          <div className="stat-label">Total Fee</div>
          <div className="stat-value">{formatCurrency(student.totalFee)}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-label">Paid</div>
          <div className="stat-value">{formatCurrency(student.paidFee)}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
          <div className="stat-icon">
            <AlertCircle size={20} />
          </div>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{formatCurrency(pendingFee)}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
          <div className="stat-icon">
            <BookOpen size={20} />
          </div>
          <div className="stat-label">Course</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {student.course}
          </div>
          <div className="stat-sub">Admitted {formatDate(student.admissionDate)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600 }}>Fee Progress</span>
            <span style={{ color: 'var(--ink-muted)' }}>{percentPaid}% paid</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className="fill" style={{ width: `${percentPaid}%` }} />
          </div>
          {pendingFee > 0 ? (
            <p style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'var(--danger)' }}>
              You have {formatCurrency(pendingFee)} pending. Please contact the office to clear dues.
            </p>
          ) : (
            <p style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'var(--success)' }}>All fees cleared. Great job!</p>
          )}
        </div>
      </div>

      <div className="grid-2 equal">
        <div className="card">
          <div className="card-header">
            <h3>My Details</h3>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <label>Phone</label>
                <p>{student.phone}</p>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <p>{student.email || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Father's Name</label>
                <p>{student.fatherName || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Address</label>
                <p>{student.address || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Payments</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      No payments yet
                    </td>
                  </tr>
                ) : (
                  payments.slice(0, 5).map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
                      <td>
                        <span className="badge badge-muted">{p.paymentMode}</span>
                      </td>
                      <td>{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
