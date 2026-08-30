export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superAdmin',
};

export const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
export const isTeacherRole = (role) => role === ROLES.TEACHER;
export const isStudentRole = (role) => role === ROLES.STUDENT;
