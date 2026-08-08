import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Lock, Loader2, Camera } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const AVATAR_MAX = 50 * 1024;

export default function Profile() {
  const toast = useToast();
  const { user, role, updateUser } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'password' ? 'password' : 'profile');
  const [profile, setProfile] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (params.get('tab') === 'password') setTab('password');
  }, [params]);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        fatherName: user.fatherName || '',
        motherName: user.motherName || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Please select an image file (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > AVATAR_MAX) {
      toast.warning(`Profile photo must be 50 KB or less (yours is ${Math.round(file.size / 1024)} KB)`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.put('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data.user);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = role === 'student' ? '/student/profile' : '/auth/profile';
      const { data } = await api.put(endpoint, profile);
      updateUser(data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.warning('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="role-tabs" style={{ marginBottom: '1.25rem', maxWidth: 320 }}>
        <button type="button" className={`role-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <User size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          Profile
        </button>
        <button type="button" className={`role-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
          <Lock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          Password
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {tab === 'profile' ? (
            <form onSubmit={saveProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="avatar lg"
                      style={{ objectFit: 'cover', width: 72, height: 72, borderRadius: '50%' }}
                    />
                  ) : (
                    <div className="avatar lg">{initials}</div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    title="Upload photo (max 50 KB)"
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -4,
                      width: 32,
                      height: 32,
                      padding: 0,
                      borderRadius: '50%',
                    }}
                  >
                    {uploading ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleAvatar} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.65rem' }}>
                  Profile photo · JPG/PNG · max 50 KB
                </p>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input className="form-control" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </div>

              {role === 'admin' ? (
                <>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input className="form-control" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                </>
              ) : role === 'employee' ? (
                <>
                  <div className="form-group">
                    <label>Phone (login ID — contact admin to change)</label>
                    <input className="form-control" value={profile.phone} disabled />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea className="form-control" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                  </div>
                  {user?.department && (
                    <div className="form-group">
                      <label>Department</label>
                      <input className="form-control" value={user.department} disabled />
                    </div>
                  )}
                  {user?.designation && (
                    <div className="form-group">
                      <label>Designation</label>
                      <input className="form-control" value={user.designation} disabled />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Phone (login ID — contact admin to change)</label>
                    <input className="form-control" value={profile.phone} disabled />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Father's Name</label>
                      <input className="form-control" value={profile.fatherName} onChange={(e) => setProfile({ ...profile, fatherName: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Mother's Name</label>
                      <input className="form-control" value={profile.motherName} onChange={(e) => setProfile({ ...profile, motherName: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input className="form-control" type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select className="form-control" value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea className="form-control" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading && <Loader2 size={16} className="spin" />}
                Save Profile
              </button>
            </form>
          ) : (
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading && <Loader2 size={16} className="spin" />}
                Change Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
