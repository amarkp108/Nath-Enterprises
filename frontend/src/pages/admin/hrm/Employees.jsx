import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Pencil, Trash2, X, Loader2, Users, ShieldCheck } from 'lucide-react';
import api from '../../../api';
import { formatCurrency, formatDate } from '../../../utils';
import { useToast } from '../../../components/Toast';

const empty = {
  name: '',
  phone: '',
  email: '',
  password: '',
  department: '',
  designation: '',
  salary: '',
  joinDate: new Date().toISOString().slice(0, 10),
  address: '',
  gender: '',
  dateOfBirth: '',
  notes: '',
  status: 'Active',
};

export default function Employees() {
  const toast = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const loadDeptOptions = async () => {
    try {
      const { data } = await api.get('/settings/departments?active=true');
      setDeptOptions((data.data || []).map((d) => d.name));
    } catch {
      /* ignore — filter chips still work from employee list */
    }
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (department !== 'all') q.set('department', department);
      const { data } = await api.get(`/hrm/employees?${q}`);
      setEmployees(data.data);
      setDepartments(data.departments || []);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeptOptions();
  }, []);

  useEffect(() => {
    const t = setTimeout(fetch, 200);
    return () => clearTimeout(t);
  }, [search, department]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...empty, department: deptOptions[0] || '' });
    setShowModal(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      name: e.name || '',
      phone: e.phone || '',
      email: e.email || '',
      password: '',
      department: e.department || '',
      designation: e.designation || '',
      salary: e.salary ?? '',
      joinDate: e.joinDate ? e.joinDate.slice(0, 10) : '',
      address: e.address || '',
      gender: e.gender || '',
      dateOfBirth: e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
      notes: e.notes || '',
      status: e.status || 'Active',
    });
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!form.name || !form.phone || !form.department) {
      toast.warning('Name, phone and department are required');
      return;
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      toast.warning('Login password is required (min 6 characters)');
      return;
    }
    if (editing && form.password && form.password.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await api.put(`/hrm/employees/${editing._id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/hrm/employees', payload);
        toast.success('Employee added — set module permissions from Settings');
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    if (!confirm(`Delete employee "${e.name}"? Attendance records will also be removed.`)) return;
    try {
      await api.delete(`/hrm/employees/${e._id}`);
      toast.success('Employee deleted');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const allDepts = [...new Set([...deptOptions, ...departments])].filter(Boolean).sort();

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/hrm')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Employees</h3>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/settings/permissions')}>
          <ShieldCheck size={16} /> Permissions
        </button>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input className="form-control" placeholder="Search name, phone, ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-chips">
          <button className={`chip ${department === 'all' ? 'active' : ''}`} onClick={() => setDepartment('all')}>
            All
          </button>
          {departments.map((d) => (
            <button key={d} className={`chip ${department === d ? 'active' : ''}`} onClick={() => setDepartment(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <Users size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
            Staff ({employees.length})
          </h3>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <p>No employees yet</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openAdd}>
              <Plus size={16} /> Add First Employee
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Salary</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <code style={{ fontSize: '0.8rem' }}>{e.employeeId}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                          {e.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <strong>{e.name}</strong>
                          {e.email && <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{e.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{e.phone}</td>
                    <td>
                      <span className="badge badge-info">{e.department}</span>
                    </td>
                    <td>{e.designation || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(e.salary)}</td>
                    <td>{formatDate(e.joinDate)}</td>
                    <td>
                      <span className={`badge ${e.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>{e.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-sm btn-ghost" title="Edit" onClick={() => openEdit(e)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Permissions"
                          onClick={() => navigate('/admin/settings/permissions')}
                          style={{ color: 'var(--brand)' }}
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(e)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Employee' : 'Add Employee'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Full Name <span className="req">*</span>
                    </label>
                    <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>
                      Phone (login ID) <span className="req">*</span>
                    </label>
                    <input className="form-control" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>
                      Login Password {!editing && <span className="req">*</span>}
                      {editing && <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}> (leave blank to keep)</span>}
                    </label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      required={!editing}
                      minLength={editing ? undefined : 6}
                      placeholder={editing ? '••••••' : 'Min 6 characters'}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Department <span className="req">*</span>
                    </label>
                    <select className="form-control" value={form.department} onChange={(e) => set('department', e.target.value)} required>
                      <option value="">Select department</option>
                      {allDepts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {allDepts.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                        Add departments in Settings → Department Master first
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Designation</label>
                    <input className="form-control" value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Teacher" />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Salary (₹)</label>
                    <input className="form-control" type="number" min="0" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Join Date</label>
                    <input className="form-control" type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
                  </div>
                  {editing && (
                    <div className="form-group">
                      <label>Status</label>
                      <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Resigned</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select className="form-control" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input className="form-control" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea className="form-control" value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-control" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="spin" />}
                  {editing ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
