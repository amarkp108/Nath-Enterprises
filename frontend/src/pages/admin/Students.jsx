import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Eye, IndianRupee } from 'lucide-react';
import api, { assetUrl } from '../../api';
import { formatCurrency, formatDate } from '../../utils';
import AddStudentModal from '../../components/AddStudentModal';
import CollectFeeModal from '../../components/CollectFeeModal';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [pending, setPending] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [feeStudent, setFeeStudent] = useState(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (course !== 'all') q.set('course', course);
      if (pending) q.set('pending', 'true');
      const { data } = await api.get(`/admin/students?${q}`);
      setStudents(data.data);
      setCourses(data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get('pending') === 'true') setPending(true);
  }, [params]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 250);
    return () => clearTimeout(t);
  }, [search, course, pending]);

  return (
    <>
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="form-control"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button className={`chip ${course === 'all' && !pending ? 'active' : ''}`} onClick={() => { setCourse('all'); setPending(false); }}>
            All
          </button>
          <button className={`chip ${pending ? 'active' : ''}`} onClick={() => setPending(!pending)}>
            Pending Fee
          </button>
          {courses.map((c) => (
            <button
              key={c}
              className={`chip ${course === c && !pending ? 'active' : ''}`}
              onClick={() => { setCourse(c); setPending(false); }}
            >
              {c}
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={16} />
          Add Student
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <Users size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
            Students ({students.length})
          </h3>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <p>No students found</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add First Student
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Course</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th>Admitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const pend = s.totalFee - s.paidFee;
                  return (
                    <tr key={s._id} className="clickable" onClick={() => navigate(`/admin/students/${s._id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {s.avatar ? (
                            <img src={assetUrl(s.avatar)} alt="" className="avatar" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                          ) : (
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                              {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td>{s.phone}</td>
                      <td>
                        <span className="badge badge-info">{s.course}</span>
                      </td>
                      <td>{formatCurrency(s.totalFee)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(s.paidFee)}</td>
                      <td style={{ color: pend > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        {formatCurrency(pend)}
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'Active' ? 'badge-success' : s.status === 'Completed' ? 'badge-info' : 'badge-muted'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>{formatDate(s.admissionDate)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn btn-sm btn-ghost" title="View" onClick={() => navigate(`/admin/students/${s._id}`)}>
                            <Eye size={16} />
                          </button>
                          {pend > 0 && (
                            <button
                              className="btn btn-sm btn-ghost"
                              title="Collect Fee"
                              onClick={() => setFeeStudent(s)}
                              style={{ color: 'var(--brand)' }}
                            >
                              <IndianRupee size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            fetchStudents();
          }}
        />
      )}

      {feeStudent && (
        <CollectFeeModal
          student={feeStudent}
          onClose={() => setFeeStudent(null)}
          onSuccess={() => {
            setFeeStudent(null);
            fetchStudents();
          }}
        />
      )}
    </>
  );
}
