import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import StudentDetail from './pages/admin/StudentDetail';
import Fees from './pages/admin/Fees';
import Courses from './pages/admin/Courses';
import AttendanceHub from './pages/admin/AttendanceHub';
import MarkAttendance from './pages/admin/MarkAttendance';
import AttendanceReport from './pages/admin/AttendanceReport';
import HrmHub from './pages/admin/hrm/HrmHub';
import Employees from './pages/admin/hrm/Employees';
import MarkEmpAttendance from './pages/admin/hrm/MarkEmpAttendance';
import EmpAttendanceReport from './pages/admin/hrm/EmpAttendanceReport';
import HomeworkHub from './pages/admin/homework/HomeworkHub';
import SendHomework from './pages/admin/homework/SendHomework';
import HomeworkReport from './pages/admin/homework/HomeworkReport';
import AdminLeaves from './pages/admin/Leaves';
import ResultsHub from './pages/admin/results/ResultsHub';
import PublishResult from './pages/admin/results/PublishResult';
import ResultsList from './pages/admin/results/ResultsList';
import SettingsHub from './pages/admin/settings/SettingsHub';
import Departments from './pages/admin/settings/Departments';
import EmployeePermissions from './pages/admin/settings/EmployeePermissions';
import Profile from './pages/Profile';
import StudentDashboard from './pages/student/Dashboard';
import StudentFees from './pages/student/Fees';
import StudentAttendance from './pages/student/Attendance';
import StudentHomework from './pages/student/Homework';
import StudentLeave from './pages/student/Leave';
import StudentDocuments from './pages/student/Documents';
import StudentResults from './pages/student/Results';
import { hasPermission, firstStaffPath } from './constants/modules';

const homeFor = (role, user) => {
  if (role === 'student') return '/student';
  if (role === 'employee') return firstStaffPath(user, role);
  return '/admin';
};

function Protected({ children, allowedRole }) {
  const { isAuthenticated, role, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const roles = Array.isArray(allowedRole) ? allowedRole : allowedRole ? [allowedRole] : null;
  if (roles && !roles.includes(role)) {
    return <Navigate to={homeFor(role, user)} replace />;
  }
  return children;
}

function AdminOnly({ children }) {
  const { role } = useAuth();
  if (role !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function RequirePerm({ module, children }) {
  const { user, role } = useAuth();
  if (role === 'admin' || hasPermission(user, role, module, 'view')) {
    return children;
  }
  return <Navigate to={firstStaffPath(user, role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <Protected allowedRole={['admin', 'employee']}>
            <Layout />
          </Protected>
        }
      >
        <Route
          index
          element={
            <RequirePerm module="dashboard">
              <AdminDashboard />
            </RequirePerm>
          }
        />
        <Route
          path="students"
          element={
            <RequirePerm module="students">
              <Students />
            </RequirePerm>
          }
        />
        <Route
          path="students/:id"
          element={
            <RequirePerm module="students">
              <StudentDetail />
            </RequirePerm>
          }
        />
        <Route
          path="fees"
          element={
            <RequirePerm module="fees">
              <Fees />
            </RequirePerm>
          }
        />
        <Route
          path="attendance"
          element={
            <RequirePerm module="attendance">
              <AttendanceHub />
            </RequirePerm>
          }
        />
        <Route
          path="attendance/mark"
          element={
            <RequirePerm module="attendance">
              <MarkAttendance />
            </RequirePerm>
          }
        />
        <Route
          path="attendance/report"
          element={
            <RequirePerm module="attendance">
              <AttendanceReport />
            </RequirePerm>
          }
        />
        <Route
          path="hrm"
          element={
            <AdminOnly>
              <HrmHub />
            </AdminOnly>
          }
        />
        <Route
          path="hrm/employees"
          element={
            <AdminOnly>
              <Employees />
            </AdminOnly>
          }
        />
        <Route
          path="hrm/attendance/mark"
          element={
            <AdminOnly>
              <MarkEmpAttendance />
            </AdminOnly>
          }
        />
        <Route
          path="hrm/attendance/report"
          element={
            <AdminOnly>
              <EmpAttendanceReport />
            </AdminOnly>
          }
        />
        <Route
          path="homework"
          element={
            <RequirePerm module="homework">
              <HomeworkHub />
            </RequirePerm>
          }
        />
        <Route
          path="homework/send"
          element={
            <RequirePerm module="homework">
              <SendHomework />
            </RequirePerm>
          }
        />
        <Route
          path="homework/report"
          element={
            <RequirePerm module="homework">
              <HomeworkReport />
            </RequirePerm>
          }
        />
        <Route
          path="leaves"
          element={
            <RequirePerm module="leaves">
              <AdminLeaves />
            </RequirePerm>
          }
        />
        <Route
          path="results"
          element={
            <RequirePerm module="results">
              <ResultsHub />
            </RequirePerm>
          }
        />
        <Route
          path="results/publish"
          element={
            <RequirePerm module="results">
              <PublishResult />
            </RequirePerm>
          }
        />
        <Route
          path="results/list"
          element={
            <RequirePerm module="results">
              <ResultsList />
            </RequirePerm>
          }
        />
        <Route
          path="courses"
          element={
            <RequirePerm module="courses">
              <Courses />
            </RequirePerm>
          }
        />
        <Route
          path="settings"
          element={
            <AdminOnly>
              <SettingsHub />
            </AdminOnly>
          }
        />
        <Route
          path="settings/departments"
          element={
            <AdminOnly>
              <Departments />
            </AdminOnly>
          }
        />
        <Route
          path="settings/permissions"
          element={
            <AdminOnly>
              <EmployeePermissions />
            </AdminOnly>
          }
        />
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
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="leave" element={<StudentLeave />} />
        <Route path="homework" element={<StudentHomework />} />
        <Route path="results" element={<StudentResults />} />
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
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
