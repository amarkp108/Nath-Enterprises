import { useEffect, useState } from 'react';
import { IndianRupee, Plus, X, Loader2 } from 'lucide-react';
import api from '../../api';
import { formatCurrency, formatDate } from '../../utils';

export default function Fees() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showCollect, setShowCollect] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    paymentMode: 'Cash',
    remark: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStudents = () =>
    api.get('/admin/students?limit=200').then((res) => {
      setStudents(res.data.data.filter((s) => s.totalFee - s.paidFee > 0));
    });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const { data } = await api.get(`/admin/fees?${q}`);
      setPayments(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [from, to]);

  const selected = students.find((s) => s._id === form.studentId);
  const pending = selected ? selected.totalFee - selected.paidFee : 0;
  const total = payments.reduce((s, p) => s + p.amount, 0);

  const openCollect = () => {
    setForm({
      studentId: students[0]?._id || '',
      amount: students[0] ? students[0].totalFee - students[0].paidFee : '',
      paymentMode: 'Cash',
      remark: '',
      paymentDate: new Date().toISOString().slice(0, 10),
    });
    setError('');
    setShowCollect(true);
  };

  const handleStudentChange = (id) => {
    const s = students.find((x) => x._id === id);
    setForm((f) => ({
      ...f,
      studentId: id,
      amount: s ? s.totalFee - s.paidFee : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.studentId || !form.amount || form.amount <= 0) {
      setError('Select student and enter a valid amount');
      return;
    }
    if (Number(form.amount) > pending) {
      setError(`Amount exceeds pending fee (${formatCurrency(pending)})`);
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/fees', {
        studentId: form.studentId,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        remark: form.remark,
        paymentDate: form.paymentDate,
      });
      setShowCollect(false);
      fetchPayments();
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to collect fee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <input className="form-control" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <input className="form-control" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <strong style={{ color: 'var(--success)' }}>Total: {formatCurrency(total)}</strong>
          <button className="btn btn-primary" onClick={openCollect} disabled={students.length === 0}>
            <Plus size={16} /> Collect Fee
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <IndianRupee size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
            Fee Payments ({payments.length})
          </h3>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>{p.receiptNo}</code>
                      </td>
                      <td>
                        <strong>{p.student?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{p.student?.phone}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{p.student?.course}</span>
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
        )}
      </div>

      {showCollect && (
        <div className="modal-overlay" onClick={() => setShowCollect(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Collect Fee</h2>
              <button className="btn btn-ghost" onClick={() => setShowCollect(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label>
                    Student <span className="req">*</span>
                  </label>
                  <select className="form-control" value={form.studentId} onChange={(e) => handleStudentChange(e.target.value)} required>
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} — Pending {formatCurrency(s.totalFee - s.paidFee)}
                      </option>
                    ))}
                  </select>
                </div>
                {selected && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>
                    {selected.course} · Total {formatCurrency(selected.totalFee)} · Paid {formatCurrency(selected.paidFee)}
                  </p>
                )}
                <div className="form-group">
                  <label>
                    Amount (₹) <span className="req">*</span>
                  </label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max={pending || undefined}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Mode</label>
                    <select className="form-control" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                      {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      className="form-control"
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Remark</label>
                  <input className="form-control" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCollect(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} />}
                  Collect Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
