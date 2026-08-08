export const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [{ key: 'view', label: 'View' }],
  },
  {
    key: 'students',
    label: 'Students',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'fees',
    label: 'Fee Collection',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Collect' },
    ],
  },
  {
    key: 'attendance',
    label: 'Student Attendance',
    actions: [
      { key: 'view', label: 'View / Report' },
      { key: 'create', label: 'Mark' },
    ],
  },
  {
    key: 'leaves',
    label: 'Leave Requests',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Accept / Reject' },
    ],
  },
  {
    key: 'homework',
    label: 'Homework',
    actions: [
      { key: 'view', label: 'View / Report' },
      { key: 'create', label: 'Send' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'courses',
    label: 'Course Master',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
];

export const emptyPermissions = () => {
  const perms = {};
  MODULES.forEach((m) => {
    perms[m.key] = {};
    m.actions.forEach((a) => {
      perms[m.key][a.key] = false;
    });
  });
  return perms;
};

export const hasPermission = (user, role, module, action = 'view') => {
  if (role === 'admin') return true;
  if (role !== 'employee') return false;
  return !!user?.permissions?.[module]?.[action];
};

const STAFF_HOME_ORDER = [
  { path: '/admin', module: 'dashboard' },
  { path: '/admin/students', module: 'students' },
  { path: '/admin/fees', module: 'fees' },
  { path: '/admin/attendance', module: 'attendance' },
  { path: '/admin/leaves', module: 'leaves' },
  { path: '/admin/homework', module: 'homework' },
  { path: '/admin/courses', module: 'courses' },
];

/** First admin/staff path the user can open */
export const firstStaffPath = (user, role) => {
  if (role === 'admin') return '/admin';
  for (const item of STAFF_HOME_ORDER) {
    if (hasPermission(user, role, item.module, 'view')) return item.path;
  }
  return '/admin/profile';
};
