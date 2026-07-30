import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import StudentDetail from './pages/admin/StudentDetail';
import Fees from './pages/admin/Fees';
import Courses from './pages/admin/Courses';
import Profile from './pages/Profile';
import StudentDashboard from './pages/student/Dashboard';
import StudentFees from './pages/student/Fees';
import StudentDocuments from './pages/student/Documents';

function Protected({ children, allowedRole }) {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <Protected allowedRole="admin">
            <Layout />
          </Protected>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="fees" element={<Fees />} />
        <Route path="courses" element={<Courses />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route
        path="/student"
        element={
          <Protected allowedRole="student">
            <Layout />
          </Protected>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
