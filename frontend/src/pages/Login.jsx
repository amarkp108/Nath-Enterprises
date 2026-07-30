import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const [loginRole, setLoginRole] = useState('admin');
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credentials =
        loginRole === 'admin'
          ? { email: form.email, password: form.password }
          : { phone: form.phone, password: form.password };
      await login(credentials, loginRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-content">
          <div className="brand-mark">N</div>
          <h1>Nath Enterprises</h1>
          <p className="tagline">
            Manage admissions, fees, and students — all in one place. Built for modern coaching institutes.
          </p>
        </div>
        <div className="login-hero-footer">Student Management System</div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to continue to your dashboard</p>

          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${loginRole === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setLoginRole('admin');
                setError('');
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className={`role-tab ${loginRole === 'student' ? 'active' : ''}`}
              onClick={() => {
                setLoginRole('student');
                setError('');
              }}
            >
              Student
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {loginRole === 'admin' ? (
              <div className="form-group">
                <label>Email</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="admin@nathenterprises.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  className="form-control"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: '0.7rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-muted)',
                    display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {loginRole === 'admin' && (
            <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--ink-muted)', textAlign: 'center' }}>
              Default: admin@nathenterprises.com / Admin@123
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
