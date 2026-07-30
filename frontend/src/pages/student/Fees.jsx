import { useEffect, useState } from 'react';
import { IndianRupee } from 'lucide-react';
import api from '../../api';
import { formatCurrency, formatDate } from '../../utils';

export default function StudentFees() {
  const [payments, setPayments] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/student/fees'), api.get('/student/dashboard')])
      .then(([fees, dash]) => {
        setPayments(fees.data.data);
        setStudent(dash.data.data.student);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const pending = student ? student.totalFee - student.paidFee : 0;

  return (
    <>
      <div className="fee-summary" style={{ marginBottom: '1.5rem' }}>
        <div className="fee-box">
          <div className="label">Total Fee</div>
          <div className="value">{formatCurrency(student?.totalFee)}</div>
        </div>
        <div className="fee-box paid">
          <div className="label">Paid</div>
          <div className="value">{formatCurrency(student?.paidFee)}</div>
        </div>
        <div className="fee-box pending">
          <div className="label">Pending</div>
          <div className="value">{formatCurrency(pending)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <IndianRupee size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
            Payment History
          </h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <code style={{ fontSize: '0.8rem' }}>{p.receiptNo}</code>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
                    <td>
                      <span className="badge badge-muted">{p.paymentMode}</span>
                    </td>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>{p.remark || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
