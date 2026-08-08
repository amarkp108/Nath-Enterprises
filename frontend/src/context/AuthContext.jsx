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
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setRole(data.role);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setUser(null);
    setRole(null);
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
