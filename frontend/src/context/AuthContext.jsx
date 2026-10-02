import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => localStorage.getItem('role'));
  const [siblings, setSiblings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('siblings')) || [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const persistSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('user', JSON.stringify(data.user));
    const sibs = data.siblings || [];
    localStorage.setItem('siblings', JSON.stringify(sibs));
    setUser(data.user);
    setRole(data.role);
    setSiblings(sibs);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api
        .get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
          setRole(res.data.role);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          localStorage.setItem('role', res.data.role);
          if (res.data.siblings) {
            setSiblings(res.data.siblings);
            localStorage.setItem('siblings', JSON.stringify(res.data.siblings));
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials, loginRole) => {
    const endpoint =
      loginRole === 'admin'
        ? '/auth/admin/login'
        : loginRole === 'employee'
          ? '/auth/employee/login'
          : '/auth/student/login';
    const { data } = await api.post(endpoint, credentials);

    // Multi-student phone → select child after credentials verified
    if (data.needsSelection) {
      return data;
    }

    persistSession(data);
    return data;
  };

  const selectStudent = async (selectionToken, studentId) => {
    const { data } = await api.post('/auth/student/select', { selectionToken, studentId });
    persistSession(data);
    return data;
  };

  const switchStudent = async (studentId) => {
    const { data } = await api.post('/auth/student/switch', { studentId });
    persistSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('siblings');
    setUser(null);
    setRole(null);
    setSiblings([]);
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        siblings,
        loading,
        login,
        selectStudent,
        switchStudent,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
