const MODULES = [
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
  {
    key: 'results',
    label: 'Publish Results',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Publish' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
];

const emptyPermissions = () => {
  const perms = {};
  MODULES.forEach((m) => {
    perms[m.key] = {};
    m.actions.forEach((a) => {
      perms[m.key][a.key] = false;
    });
  });
  return perms;
};

module.exports = { MODULES, emptyPermissions };
