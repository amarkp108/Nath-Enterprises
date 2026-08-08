import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../api';
import { formatCurrency } from '../utils';
import { useToast } from './Toast';

export default function CollectFeeModal({ student, onClose, onSuccess }) {
  const toast = useToast();
  const pending = student.totalFee - student.paidFee;
  const [form, setForm] = useState({
    amount: pending,
    paymentMode: 'Cash',
    remark: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      toast.warning('Enter a valid amount');
      return;
    }
    if (Number(form.amount) > pending) {
      toast.warning(`Amount cannot exceed pending fee (${formatCurrency(pending)})`);
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/fees', {
        studentId: student._id,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        remark: form.remark,
        paymentDate: form.paymentDate,
      });
      toast.success('Fee collected successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to collect fee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Collect Fee</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
              <strong>{student.name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                {student.course} · Pending: <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(pending)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>
                Amount (₹) <span className="req">*</span>
              </label>
              <input
                className="form-control"
                type="number"
                min="1"
                max={pending}
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
              <input className="form-control" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="Optional note" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} />}
              Collect Fee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
