import {
  Bell,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  Code2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Medal,
  School,
  Trophy,
  UsersRound,
} from 'lucide-react';

const item = (id, href, label, Icon, extra = {}) => ({
  id,
  href,
  label,
  icon: <Icon aria-hidden="true" />,
  ...extra,
});

export const studentNavigation = {
  brandDetail: 'Student workspace',
  account: { id: 'profile', href: '/profile' },
  groups: [
    {
      label: 'Learn',
      items: [
        item('dashboard', '/dashboard', 'Dashboard', LayoutDashboard, { exact: true }),
        item('classes', '/classes', 'Classes', School),
        item('assignments', '/assignments', 'Assignments', ClipboardCheck, {
          match: (pathname) => /^\/courses\/[^/]+\/assignments$/.test(pathname),
        }),
        item('mcqs', '/mcqs', 'MCQs / Practice', ListChecks, {
          aliases: ['/mcq-tests', '/mcq-attempts'],
          match: (pathname) => /^\/courses\/[^/]+\/mcqs$/.test(pathname),
        }),
        item('coding', '/coding-practice', 'Coding Practice', Code2),
      ],
    },
    {
      label: 'Growth',
      items: [
        item('progress', '/progress', 'Progress', ChartNoAxesColumnIncreasing, {
          match: (pathname) => /^\/courses\/[^/]+\/progress$/.test(pathname),
        }),
        item('achievements', '/achievements', 'Achievements', Trophy),
        item('leaderboard', '/leaderboard', 'Leaderboard', Medal),
      ],
    },
    {
      label: 'Updates',
      items: [
        item('notifications', '/notifications', 'Notifications', Bell),
        item('announcements', '/student/announcements', 'Announcements', Megaphone),
      ],
    },
  ],
};

export const teacherNavigation = {
  brandDetail: 'Teacher workspace',
  account: { id: 'profile', href: '/teacher/profile' },
  groups: [
    {
      label: 'Teach',
      items: [
        item('dashboard', '/teacher', 'Dashboard', LayoutDashboard, {
          exact: true,
          aliases: ['/teacher/dashboard'],
        }),
        item('classes', '/teacher/classes', 'Classes', School),
        item('assignments', '/teacher/assignments', 'Assignments', ClipboardCheck),
        item('mcqs', '/teacher/mcqs', 'MCQs / Practice', ListChecks),
        item('coding', '/teacher/coding-practice', 'Coding Practice', Code2),
        item('submissions', '/teacher/submissions', 'Submissions', FileCheck2),
      ],
    },
    {
      label: 'Insights',
      items: [
        item('leaderboard', '/teacher/leaderboard', 'Leaderboard', ChartNoAxesColumnIncreasing),
        item('notifications', '/teacher/notifications', 'Notifications', Bell),
      ],
    },
  ],
};

export const adminNavigation = {
  brandDetail: 'Admin console',
  account: { href: '/admin' },
  groups: [
    {
      label: 'Manage',
      items: [
        item('dashboard', '/admin', 'Dashboard', LayoutDashboard, {
          exact: true,
          aliases: ['/admin/dashboard'],
        }),
        item('courses', '/admin/courses', 'Courses', BookOpen),
        item('students', '/admin/students', 'Students', GraduationCap),
        item('teachers', '/admin/teachers', 'Teachers', UsersRound),
        item('submissions', '/admin/submissions', 'Submissions', FileCheck2),
      ],
    },
    {
      label: 'Communication',
      items: [
        item('announcements', '/admin/announcements', 'Announcements', Megaphone),
        item('notifications', '/admin/notifications', 'Notifications', Bell),
      ],
    },
  ],
};

export const roleNavigation = {
  student: studentNavigation,
  teacher: teacherNavigation,
  admin: adminNavigation,
};

export const roleLabels = {
  student: { fallbackName: 'Student', detail: 'Student account', initials: 'S' },
  teacher: { fallbackName: 'Teacher', detail: 'Teacher account', initials: 'T' },
  admin: { fallbackName: 'Administrator', detail: 'Administrator', initials: 'A' },
};

function itemMatches(item, pathname) {
  if (item.exact) {
    if (pathname === item.href) return true;
  } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  if (item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`))) {
    return true;
  }

  return typeof item.match === 'function' && item.match(pathname);
}

export function resolveActiveId(pathname, groups) {
  for (const group of groups) {
    for (const entry of group.items) {
      if (itemMatches(entry, pathname)) return entry.id;
    }
  }
  return undefined;
}

export function getInitials(name, email, fallback = 'M') {
  const source = String(name || email || '').trim();
  if (!source) return fallback;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || fallback;
}
