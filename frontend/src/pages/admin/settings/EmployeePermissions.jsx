import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, Save } from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';
import { MODULES, emptyPermissions } from '../../../constants/modules';

export default function EmployeePermissions() {
  const toast = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [permissions, setPermissions] = useState(emptyPermissions());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/hrm/employees')
      .then((res) => {
        const list = (res.data.data || []).filter((e) => e.status === 'Active');
        setEmployees(list);
        if (list[0]) setEmployeeId(list[0]._id);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    api
      .get(`/settings/permissions/${employeeId}`)
      .then((res) => {
        setPermissions({ ...emptyPermissions(), ...(res.data.data.permissions || {}) });
      })
      .catch(() => toast.error('Failed to load permissions'));
  }, [employeeId]);

  const toggle = (module, action) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [action]: !prev[module]?.[action],
      },
    }));
  };

  const toggleModuleAll = (module, checked) => {
    const mod = MODULES.find((m) => m.key === module);
    if (!mod) return;
    const next = {};
    mod.actions.forEach((a) => {
      next[a.key] = checked;
    });
    setPermissions((prev) => ({ ...prev, [module]: next }));
  };

  const handleSave = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await api.put(`/settings/permissions/${employeeId}`, { permissions });
      toast.success('Permissions saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const selected = employees.find((e) => e._id === employeeId);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/settings')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} /> Employee Permissions
        </h3>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSave} disabled={saving || !employeeId}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          Save Permissions
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : employees.length === 0 ? (
        <div className="card">
          <div className="empty-state">Add employees first from HRM → Employees</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0, maxWidth: 360 }}>
                <label>Select Employee</label>
                <select className="form-control" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({e.employeeId}) — {e.department}
                    </option>
                  ))}
                </select>
              </div>
              {selected && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  Login with phone <strong>{selected.phone}</strong> on Employee portal
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Module Access</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>All</th>
                    <th>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => {
                    const allOn = m.actions.every((a) => permissions[m.key]?.[a.key]);
                    return (
                      <tr key={m.key}>
                        <td>
                          <strong>{m.label}</strong>
                        </td>
                        <td>
                          <input type="checkbox" checked={allOn} onChange={(e) => toggleModuleAll(m.key, e.target.checked)} />
                        </td>
                        <td>
                          <div className="filter-chips">
                            {m.actions.map((a) => (
                              <button
                                key={a.key}
                                type="button"
                                className={`chip ${permissions[m.key]?.[a.key] ? 'active' : ''}`}
                                onClick={() => toggle(m.key, a.key)}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
