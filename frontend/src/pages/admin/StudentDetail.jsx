import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, Pencil, Trash2, FileText } from 'lucide-react';
import api from '../../api';
import { formatCurrency, formatDate } from '../../utils';
import AddStudentModal from '../../components/AddStudentModal';
import CollectFeeModal from '../../components/CollectFeeModal';
import { useToast } from '../../components/Toast';

export default function StudentDetail() {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showFee, setShowFee] = useState(false);

  const fetch = () => {
    setLoading(true);
    api
      .get(`/admin/students/${id}`)
      .then((res) => setData(res.data.data))
      .catch(() => {
        toast.error('Student not found');
        navigate('/admin/students');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this student and all their fee records? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success('Student deleted successfully');
      navigate('/admin/students');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  if (loading) return <div className="spinner" />;
  if (!data) return null;

  const { student, payments } = data;
  const pending = student.totalFee - student.paidFee;
  const percent = student.totalFee > 0 ? Math.round((student.paidFee / student.totalFee) * 100) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/students')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }} />
        {pending > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowFee(true)}>
            <IndianRupee size={16} /> Collect Fee
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>
          <Pencil size={16} /> Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {student.avatar ? (
              <img src={student.avatar} alt="" className="avatar lg" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="avatar lg">
                {student.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{student.name}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span className="badge badge-info">{student.course}</span>
                <span className={`badge ${student.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>{student.status}</span>
                {student.batch && <span className="badge badge-muted">{student.batch}</span>}
              </div>
            </div>
          </div>

          <div className="fee-summary">
            <div className="fee-box">
              <div className="label">Total Fee</div>
              <div className="value">{formatCurrency(student.totalFee)}</div>
            </div>
            <div className="fee-box paid">
              <div className="label">Paid</div>
              <div className="value">{formatCurrency(student.paidFee)}</div>
            </div>
            <div className="fee-box pending">
              <div className="label">Pending</div>
              <div className="value">{formatCurrency(pending)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
            <span>Payment Progress</span>
            <span>{percent}%</span>
          </div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <div className="grid-2 equal" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Personal Details</h3>
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
                <label>Mother's Name</label>
                <p>{student.motherName || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Date of Birth</label>
                <p>{formatDate(student.dateOfBirth)}</p>
              </div>
              <div className="detail-item">
                <label>Gender</label>
                <p>{student.gender || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Admission Date</label>
                <p>{formatDate(student.admissionDate)}</p>
              </div>
              <div className="detail-item">
                <label>Login Password</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Set by admin (hashed)</p>
              </div>
            </div>
            {student.address && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <label>Address</label>
                <p>{student.address}</p>
              </div>
            )}
            {student.notes && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <label>Notes</label>
                <p>{student.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <FileText size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
              Documents
            </h3>
          </div>
          <div className="card-body">
            {student.documents?.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                No documents uploaded
              </div>
            ) : (
              <div className="doc-list">
                {student.documents.map((d) => (
                  <div key={d._id} className="doc-item">
                    <a href={d.url} target="_blank" rel="noreferrer">
                      {d.name}
                    </a>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{formatDate(d.uploadedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Payment History</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
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
                    No payments yet
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <code style={{ fontSize: '0.8rem' }}>{p.receiptNo}</code>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
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

      {showEdit && (
        <AddStudentModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            fetch();
          }}
        />
      )}
      {showFee && (
        <CollectFeeModal
          student={student}
          onClose={() => setShowFee(false)}
          onSuccess={() => {
            setShowFee(false);
            fetch();
          }}
        />
      )}
    </>
  );
}
