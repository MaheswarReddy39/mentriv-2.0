# Mentriv 2.0 — Redesign Handoff

Read this file first in every new session. It is the only shared context between
per-page sessions. Keep it updated at the end of each page.

---

## 1. Goal & session rules

- Redesign every page in the app to one consistent system. Admin pages are done.
  Student pages are half done. Teacher pages are mostly done (Dashboard,
  Classes, Coding Practice, Submissions, Assignments and MCQs are done).
- **Work in the primary worktree only** (`C:\Users\harsh\mentriv-2.0`). The old
  `C:\Users\harsh\mentriv-2.0-qa` worktree has been retired. Do not create or use
  a second worktree. Do not `git stash` a finished page to "clean" the tree for
  the next page; leave it uncommitted in place and keep going.
- **One page per session.** Each session: read this file, open the page + its CSS,
  redesign, QA, update this file. Do not redesign two pages in one session.
- Request budget is ~200/day. Avoid exploratory chatter, avoid re-reading files
  that are already summarised here, and never re-QA a page that this file marks
  done.
- Prior redesigns are committed as `70a9b86`, `e098b88` and `2173fc7`. Do not
  commit new page work without explicit approval from the user.
- **Never commit `client/src/constants/api.js`** (unrelated local proxy change).

## 2. Design language

Palette: warm coral accent + forest for "done"/positive. No generic indigo, teal,
or blue-violet UI chrome (`#4F46E5` still exists inside the Monaco theme only —
leave it). Greens are GitHub's contribution palette:
`--student-forest` = `#216e39` light / `#39d353` dark, and the streak heatmap
uses the full scale `#ebedf0 #9be9a8 #40c463 #30a14e #216e39` (light) /
`#161b22 #0e4429 #006d32 #26a641 #39d353` (dark) from `streak.css`.
Paper tokens live on the page root:

```
--student-paper / -paper-2 / -paper-border / -paper-ink / -paper-copy / -paper-rule
--student-accent (coral-dark) / --student-accent-text / --student-cta-bg / --student-cta-ink
--student-forest / --student-track
```

Rules that were applied on every finished page:

- No decorative icons or illustrations. One small arrow (14px SVG) on clickable
  rows is the only ornament.
- No filler copy. Subtitles like "Practice coding, build your skills…" get cut.
  A page is: title, optional scope switcher, real numbers, then content.
- Titles: `font-family: var(--font-heading)`, weight 800, `letter-spacing: -0.04em`,
  `clamp(2.05rem, 3.6vw, 2.75rem)`.
- Eyebrows / labels: 10–10.5px, weight 700, `letter-spacing: 0.13em`, uppercase,
  `--text-tertiary`.
- Panels: 1px `--border`, `--radius-panel`, `--surface`, `--shadow-xs`, padding
  `clamp(20px, 2.2vw, 26px)`.
- Rows inside panels bleed to the panel edges
  (`margin: 0 calc(padding * -1); padding: 13px padding`) with a 1px divider;
  last row loses the divider and bottom padding. Hover = 3.5% text tint; title
  turns `--student-accent-text`; arrow translates 2px.
- Row anatomy: title (13.5px/600) + meta (11.5px `--text-tertiary`)
  + right-aligned status/score (12px/600, `tabular-nums`) + arrow.
- Status semantics: pending = coral/red, submitted/done = forest green,
  idle = `--text-tertiary` at weight 500.
- Toasts: top-right, text only, no icons, sentence-length.
- Numbers always `font-variant-numeric: tabular-nums`.
- Dark mode is a token override on the same block; every new page adds itself to
  the shared `.student-home, .student-classes, …` token selector lists.
- Sidebar active state is brand coral for every role (student, teacher, admin):
  `.sidebar-link.active` and the active theme toggle option use
  `--coral-dark` / `--coral` on a 9%/13% coral tint. Never use `--indigo` in
  sidebar chrome.
- Breakpoints: 900px (masthead stacks), 700px (rows lose the arrow and index
  column), 640px (h1 shrinks, panel padding 20px, row bleed -20px).
- Course switcher idiom: visible `value + chevron` with an invisible native
  `<select>` absolutely covering it, `aria-label="Course"`, visible text
  `aria-hidden`. CSS is shared in one comma block (classes/assignments/practice).

## 3. Page recipe

1. Root: `<div className="student-<page> fade-in">`.
2. Masthead: `.student-<page>-masthead` = flex, `align-items: flex-end`,
   `space-between`, bottom border, `padding-bottom: var(--space-6)`.
   Left: h1 (+ scope switcher under it). Right: `.student-<page>-stat` with a
   10.5px uppercase label, a 1.5rem `tabular-nums` value, and a 3px forest bar
   (`--student-track` background).
3. Content: one or more `.student-<page>-panel`s, each with
   `.student-<page>-panel-head` (h2 1.1875rem/800 + `.student-<page>-panel-count`
   uppercase) and an `<ol class="student-<page>-list">` of row buttons.
4. Drill-down views are **in-page views**, not routes or modals, with a
   `.student-<page>-back` text button (`← Back to …`). Quiz-style pages keep a
   3px progress meter, `Question N of M`, and Previous/Next/Submit.
5. States: `.student-<page>-state` wrapper for `ErrorState`/`EmptyState`,
   a hand-written skeleton (`role="status"` + `.skeleton` bars) for loading,
   `—` instead of `0` when a dependent fetch failed.
6. Detail/instruction view: eyebrow (`Level · Topic`), h1, `<dl class="student-<page>-facts">`
   (uppercase dt, bold dd), 1–2 short notes, primary action + optional secondary.
7. Exceptions: `.student-assignment-meta`, `asg-head`, `admin-table` are legacy —
   do not use them on redesigned student pages.

## 4. CSS map (`client/src/styles/components.css`)

- Shared student token block: `.student-home, .student-classes, .student-assignments,
  .student-practice, .student-coding, .student-progress, .student-achievements,
  .student-leaderboard, .student-notifications, .student-profile, .student-courses,
  .student-learn, .teacher-dashboard,
  .teacher-classes, .teacher-coding, .teacher-submissions,
  .teacher-assignments, .teacher-mcqs, .teacher-leaderboard, .teacher-profile`
  (plus the
  `[data-theme='dark']` twin).
- Shared course-dropdown block: classes / assignments / practice / progress.
- Shared dropdown: `client/src/components/common/SelectMenu.jsx` backs the
  teacher scope switchers. It renders a `.select-menu-trigger` button plus a
  `role="listbox"` panel (keyboard: Space/Enter/Arrows/Escape, click-outside
  close, `aria-activedescendant`), and the `.select-menu*` rules sit near the
  top of the file. The trigger and caret stay neutral grey at rest; the brand
  orange border and ring appear only on focus/open. Panel borders stay neutral,
  selected option text stays the normal dark colour, and the check icon is
  neutral rather than coral. `SelectMenu` also takes an optional `disabled`
  prop. Native `<select>` is still used where an in-form field is expected
  (for example a question's level).
- Per-page sections (each self-contained, appended at the end of the file):
  `/* STUDENT HOME */`, `/* STUDENT CLASSES */`, `/* STUDENT ASSIGNMENTS */`,
  `/* STUDENT PRACTICE */`, `/* STUDENT CODING PRACTICE */`,
  `/* STUDENT PROGRESS */`, `/* STUDENT ACHIEVEMENTS */`,
  `/* STUDENT LEADERBOARD */` (its own `.student-leaderboard-switch` course +
  period dropdown pair, `.student-leaderboard-facts` 4-column grid),
  `/* STUDENT NOTIFICATIONS */` (`.student-notifications-switch` type + read-state
  dropdown pair), `/* STUDENT PROFILE */` (760px settings column, facts rows with
  a 132px uppercase `dt` column and left-aligned `dd`, `Edit details` text action,
  inline row editing, in-page password view), `/* STUDENT COURSES */`
  (`.student-courses-search-input`, status-toned `.student-courses-row-state`,
  pending/rejected rows stay `is-static`), `/* STUDENT LEARN */`
  (`.student-learn-tabs` text-tab bar with a coral underline,
  `.student-learn-state-block` for state wrappers — the row status label is
  `.student-learn-state` — and module panels whose rows reuse the class row
  pattern with Notes/Watch text actions).
- Teacher shell lives on the same shared chrome: `.teacher-sidebar` is in the
  `.admin-sidebar, .student-sidebar` desktop flex/label rules and the teacher
  layout uses `.student-topbar` + `.app-main`. `/* TEACHER DASHBOARD */`,
  `/* TEACHER CLASSES */`, `/* TEACHER CODING PRACTICE */`,
  `/* TEACHER SUBMISSIONS */`, `/* TEACHER ASSIGNMENTS */`,
  `/* TEACHER MCQS */` and `/* TEACHER LEADERBOARD */`, `/* TEACHER PROFILE */`
  are self-contained blocks at the end of the file.
  Teacher pages follow the page recipe with `teacher-<page>` class names.
  Teacher submissions uses the shared `SelectMenu` twice (course + level) plus a
  `.teacher-submissions-search-input` (38px tall, 220px wide, full width under
  640px) in the same scope row. Teacher leaderboard reuses that search-input
  idiom for `.teacher-leaderboard-search-input`. Every teacher page (dashboard,
  classes, coding practice, submissions, assignments, MCQs, leaderboard) uses
  `SelectMenu` for its course/level scope so no native OS-blue select appears.
- Every interactive field shares the neutral field tokens in `tokens.css`:
  `--field-border-default` (`#D9DDE3`), `--field-border-hover` (`#C3C9D2`),
  `--field-border-disabled` (`#EDEFF3`), `--field-border-focus` (`#F28A55`),
  `--field-border-error` (`#E5484D`), `--field-focus-ring` and
  `--field-error-ring`. Inputs, textareas, native selects, `SelectMenu`
  triggers, admin dropdown buttons, the catalog filter and the notification
  filter switches all rest neutral grey; the brand orange border and ring
  appear only on focus/open (hover is a slightly darker neutral). Teacher
  pages no longer tint idle inputs orange — the old `--field-border` teacher
  overrides were removed — and non-teacher pages already used the same
  neutral values in light and dark. The global `--focus-ring` token is coral in
  both themes, so focus rings no longer read as indigo.
- Duplication per page is intentional and matches the existing convention. Reuse
  only cross-cutting atoms (`.btn`, `.badge`, `.state-block`, `.skeleton`) and
  comma-group rules when two pages need the exact same selector set.

## 5. Done

| Area | Pages |
| --- | --- |
| Admin | all pages, merged (PR #13 `97c0e19`), plus level-dropdown fix `467189c`, course-details fix `670862a` |
| Student | Dashboard (`DashboardPage`), Classes (`StudentClassesPage`), Assignments (`CourseAssignmentsPage`), MCQs / Practice (`McqPracticePage`), Coding Practice: list (`StudentCodingPracticePage`), topic (`StudentCodingTopicPage`), instructions (`StudentCodingTaskPage`), workspace (`StudentCodingWorkspacePage`), Progress (`ProgressPage`), Achievements (`AchievementsPage`), Leaderboard (`LeaderboardPage`), Notifications (`NotificationsPage`), Profile (`ProfilePage`), My Courses (`MyCoursesPage`), Course Learn (`CourseLearnPage`) |
| Teacher | Dashboard (`TeacherDashboardPage`), Classes (`TeacherClassesPage`), Coding Practice: list (`TeacherCodingPracticePage`), topic (`TeacherCodingTopicPage`), task form (`TeacherCodingPracticeFormPage`), Submissions (`TeacherSubmissionsPage`), Assignments (`TeacherAssignmentsPage`), MCQs / Practice (`TeacherMcqsPage`), practice form (`TeacherPracticeFormPage`), Leaderboard (`TeacherLeaderboardPage`), Profile (`TeacherProfilePage`) |

Committed: `70a9b86` (student pages, teacher dashboard + classes), `e098b88`
(teacher coding practice), `2173fc7` (teacher submissions), `1331917`
(teacher assignments + MCQs), and the finished teacher leaderboard/profile plus
coding topic and both form pages in this branch.

Coding pages shipped with: row-per-technology list (Solved X / Y stat), level
panels with numbered rows (`topic` as the row label — `title` is the technology),
in-page instructions with facts/requirements/examples/constraints/starter files,
and a workspace reuse of the same panels plus dense submission history rows.

Progress shipped with: masthead (Overall % + course switcher), Continue learning,
Overview rows (Classes / Assignments / Practice drill-downs), Courses rows
(click a course to scope the whole page), Recent activity, drill-down views with
status-toned rows, and an in-page result view (facts, score panel, answer review).

Achievements shipped with: masthead (Unlocked X / Y + completion bar), one panel
per category (Learning / Assignments / Practice / Performance / Streak) whose
count reads `N of M unlocked`, rows showing the requirement with a 3px forest
progress track when locked and the unlock date when earned, and an in-page detail
view (eyebrow, description, Requirement / Progress / Unlocked facts, 6px meter,
"n more to unlock", Open progress CTA). The old category filter chips, cards,
modal and icons were removed — grouping by panel replaces filtering.

Leaderboard shipped with: masthead (`Your rank #N of M` stat with a forest
percentile bar, caption `Top X% · N points`), course + period text dropdowns
under the h1, a `Your standing` facts panel (points, rank change, percentile,
classes, assignments, MCQs, average score), one `Rankings` panel of static rows
(rank number, name + activity meta, points; ranks 1–3 colour the number and name
gold `#8a6a00` / silver `#57606a` / bronze `#8a4f22`, dark `#e3b341` /
`#aab4c0` / `#cd7f32` via the `--student-gold|silver|bronze` tokens; the current
student gets a 6% coral row tint and a `You` marker — no inset bar), and a
`How points work` panel of four static rule rows. The old podium cards, avatars,
table and `badge-*` pills were removed. Rows are not clickable (there is no
student detail view), so they carry no arrow.

Notifications shipped with: masthead (`Unread X of Y` stat with a forest read
bar, caption `N read` / `All N read`, and a `Mark all as read` text action),
type + read-state text dropdowns under the h1, and one `Inbox` panel of rows
(title, 2-line-clamped message, `Type · relative time` meta, right-aligned
`Unread` coral / `Read` idle status, arrow only on rows that link somewhere).
Unread rows carry a 4% coral row tint (no inset bar). Clicking a row marks it read and follows its
`link` (rows with no link and no unread state are static). The pager is a
text-button Previous / `Page N of M` / Next inside the panel. Per-row and
mark-all actions dispatch `mentriv:notifications-changed`, which `StudentLayout`
listens for to refresh the sidebar badge without a reload. The old filter card,
`tab-pill` read-state buttons, type `select`, cards, `Badge`, `due-dot` and
per-row "Mark as read" buttons were removed. Masthead totals are global (fetched
from `unread-count` + an unfiltered `limit=1` list), so the stat stays stable
while the list is filtered.

Profile shipped with: a 760px settings column under a plain `Profile` masthead
(the only masthead action is the `Edit details` text button), a `Details` panel
of five facts (`Name`, `Email`, `Mobile`, `Course`, `Member since`) whose values
sit left-aligned next to a 132px uppercase label column, and a `Security` panel
with one `Password` row. Editing happens inline in the rows (Name and Mobile
become inputs, the other facts stay visible) with Cancel / Save changes under the
list; `Edit details` is hidden while editing. Non-active accounts get a `Status`
row in coral. The in-page password view keeps the back button, h1, 8–72 note,
three inputs and Cancel / Update password, and returns to the profile on success.
Missing values render `—`. The eyebrow, name subtitle, account-status stat,
avatar, `Badge`, separate `Account` panel, `Email verified` row and the old
`admin.css` `STUDENT PROFILE` block were removed.

My Courses shipped with: a masthead (`My Courses` + an `Average progress` stat
with a 3px forest bar and a `N active · M pending` caption) and one `Your courses`
panel with a right-aligned `N courses` count and a search field in the panel head.
Rows show course title, `Enrolled … · Last activity …` meta, a percentage with a
3px forest meter, an uppercase status (`ACTIVE` forest / `COMPLETED` forest /
`PENDING` coral / `REJECTED` coral / `CANCELLED` idle) and an arrow. Approved
courses sort first (active before completed), then pending, rejected, cancelled;
only approved rows link to `/courses/:id/learn` — every other row is static and
has no hover. Search filters on title and meta. The old card grid,
`CategoryThumb` covers, `Badge` pills and `ProgressBar` were removed; empty and
error states use `.student-courses-state`, and loading is a hand-written panel
skeleton.

Course Learn shipped with: a `← My Courses` text back link, an h1 course title,
an `APPROVED · N classes · N assignments · N practice sets` meta line, and a
`Course progress` stat (`8 of 13 classes` caption + forest bar). A
`.student-learn-tabs` text-tab bar (Overview / Classes / Assignments / MCQs /
Progress) with a coral underline on the active tab switches in-page views; Classes
is the default. Classes view: one panel per module (h2 + `N / M` count) of rows
(title, `N min · N resources` meta, status label, `Notes` and `Watch` text
actions — either disabled when the class has no notes/video). Assignments and
MCQs are row panels with status labels and arrows to their pages; Overview is an
`Up next` panel with an `Open class` CTA plus an `At a glance` facts row; Progress
is a large percentage, a 6px meter and a `By module` breakdown. Data loads with
`Promise.allSettled` (classes, assignments, submissions, MCQ tests) using three
states — `undefined` loading, `null` failed, array loaded — so a failed dependent
fetch shows `—` instead of `0`. Empty (`No active access`) and error states are
centred `.student-learn-state-block` panels; the old thumbnails, cards, badge,
progress bar and mojibake glyphs were removed.

Teacher dashboard shipped with: masthead (`Welcome back, <first>.` + `SelectMenu`
course dropdown under the h1, and a `Review queue` stat showing pending of total
submissions with a forest reviewed bar and `N reviewed` caption), a 4-cell
teaching snapshot (Students / Classes / Assignments / Practice sets, no bars —
there is no denominator), a paper `Live announcement` panel (eyebrow, title,
content, published date; empty copy when none), a `Recent submissions` panel
(student name, assignment · course meta, right-aligned Pending/Late coral or
Reviewed forest + relative time, `All submissions` link), a `Create` panel of
three row links (Add a class / Add an assignment / Create a practice set), and a
3-row `Notifications` panel (type · relative time, `Unread` coral, 4% coral tint,
`All notifications` link). All numbers come from the extended
`GET /teacher/dashboard` payload (`totalClasses`, `totalAssignments`,
`totalPracticeSets`, `totalSubmissions`, `pendingSubmissions`,
`recentSubmissions`), so counts are course-scoped when the switcher changes.
Loading is a hand-written skeleton (stat line, 4 cells, focus, two panels).
The old admin stat cards, badge, welcome subtitle and quick-action buttons were
removed.

Teacher classes shipped with: masthead (`Classes`, `SelectMenu` course dropdown under the
h1, and a `Published classes` stat showing `published of total` with a forest
bar and an `N drafts` / `All classes published` caption), one `Add a class` panel
(Class title, Module, Video link, Notes link — the target course sits in the panel
head, so the form always adds to the scoped course), and one panel per module
(`Foundations`, `React and APIs`, …) whose rows carry title, `Module · N min · N
resources` meta, and a right-aligned `Published` forest / `Draft` coral status
with a relative date. The notes link is saved as a resource named `Notes`; new
classes land in their module panel and the stat updates after the post-create
refetch. Classes with no module group under `General`. The page is backed by the
new teacher-only `GET /teacher/classes` endpoint (`courses`, `selectedCourse`,
`classes` with `status`/`resourceCount`/`courseTitle`, `totalClasses`,
`publishedClasses`, `draftClasses`; honours `?courseId=`), which lists
non-archived classes so the page does not depend on the student-only course
classes route. The old single-card form, separate course select, `page-head`
caption and `teacher-class-card` chrome were removed. Loading is a two-panel
skeleton; `empty` shows `No courses yet` with a `—` stat.

Teacher coding practice shipped with: masthead (`Coding Practice` plus a
`Published tasks` stat showing published of total with a forest bar and a drafts
caption), `SelectMenu` course dropdown under the h1, and one panel per level (`Beginner`,
`Basic`, `Intermediate`, `Advanced`) whose rows carry the task title, a
`topic · difficulty · N min` meta line and a right-aligned Published forest /
Draft coral state.

Teacher submissions shipped with: masthead (`Submissions` plus a `Submitted`
stat showing submitted of total student-course rows with a forest bar and an
`N not submitted` caption), two `SelectMenu`s (course and level) under the h1,
and a `Search students` input in the same scope row that filters
both panels client-side (the stat keeps the course/level totals while typing).
One `Practice progress` panel lists each enrolled student once per course
(`course · level · N of M correct`, right-aligned `NN%` plus Submitted forest /
Not submitted coral) and one `Submission timing` panel lists assignment and
practice submissions (`assignment`, `student · course · Attempt N`,
`Started … · Submitted … · N min limit`, right-aligned time taken plus
Submitted/Reviewed forest or Late/Pending coral). Rows are static, not
clickable, so they carry no arrow; hover is a 3.5% tint. Loading is a two-panel
skeleton; `empty` shows `No courses yet` with a `—` stat; a scope with no rows
shows `Nothing in this scope`, and a search with no rows shows `No matches`.
The old stat cards, `Badge`/`ProgressBar` pills and both `admin-table` tables
were removed.

Teacher assignments shipped with: masthead (`Assignments`, `SelectMenu` course
dropdown under the h1 incl. an `All courses` option, and a `Published` stat
showing published of total across assignments + practice tests, forest bar,
`N drafts` caption), an `Assignments` panel and a `Practice tests` panel. Each
panel head carries a text action (`New assignment` / `New practice test`) plus
the row count; rows are static (not links, so no arrow) with title, meta
(`course · N min · Due …` / `course · level · topic · N questions · N min`, where
the course becomes `N courses` when a set spans several), right-aligned
`Published` forest / `Draft` coral status and relative time. Both panel actions open the same in-page create view: back
button, h1 `New assignment`, a `Details` panel (multi-course checkbox list with
coral checkboxes and removable coral chips, Title, Duration, Type text-toggle
`Assignment` / `Practice test`, and for practice tests Level + Topic) and, for
practice tests, a `Questions` panel. Questions are written manually (pick 5–25,
then per-question stem, options A–D and correct answer) or bulk-added by pasting
text into the AI parse box (`POST /ai/parse-questions`), previewing/editing the
parsed set and then using it. Submit saves via `POST /assignments/bulk` or
`POST /mcq-tests/bulk`, shows an inline coral error per field on validation
failure, and on success toasts (`Assignment created.` / `Practice test created
with N questions.`), resets the form, returns to the list and refetches. The
page is backed by the new teacher-only `GET /teacher/assignments?courseId=`
endpoint (`courses`, `selectedCourse`, `assignments`, `mcqTests`,
`totalAssignments`, `publishedAssignments`, `totalMcqTests`,
`publishedMcqTests`, `courseTitles`, `questionCount`) which lists non-archived
rows so it does not depend on the student-only course routes. Loading is a
two-panel skeleton; `empty` shows `No courses yet` with a `—` stat. The old
admin tables, stat cards and modal were removed.

Teacher MCQs shipped with: masthead (`MCQs / Practice` plus a `Published` stat
showing published of total across practice sets with a forest bar and an
`N drafts` caption), an `All courses` `SelectMenu` course dropdown under the h1, and one
`Practice sets` panel whose rows carry the set title, a
`course · level · topic · N questions · N min` meta line (the course is only
listed in `All courses`), a right-aligned Published forest / Draft coral status
with a relative date, and an arrow into `/teacher/mcqs/:id`. The
`New practice set` text action goes to `/teacher/mcqs/new`. Rows are sorted by
level then title. The page reads the new teacher-only
`GET /teacher/mcqs?courseId=` payload (`courses`, `selectedCourse`, `mcqTests`,
`totalMcqTests`, `publishedMcqTests`) and is backed by the same service query as
Teacher assignments. Loading is a panel skeleton; `empty` shows `No courses yet`
with a `—` stat. The old admin table and stat cards were removed.

Teacher coding topic shipped with: a masthead (`← Coding Practice` text back
link, a `LEVEL · TECHNOLOGY` eyebrow and the topic as h1, plus a `Published
tasks` stat showing published of total with a forest bar and an `All tasks
published` / `N drafts` caption), a `New task` text action, and one `Tasks`
panel whose rows show the task title, a
`Technology · level · topic · N points` meta line, a right-aligned Published
forest / Draft coral status, an arrow into `/teacher/coding-practice/:id`, and
`N tasks` as the panel count. Loading is a panel skeleton; `empty` shows
`No tasks yet` with a `—` stat; a fetch failure renders `Failed to load tasks`
with retry.

Teacher coding practice task form shipped with: a masthead (back link,
`NEW TASK` / `EDIT TASK` / task-title eyebrow, title as h1, a status line and
Cancel / Save actions), a `Details` panel (title, technology, level, topic,
points, statement, starter files) and an `Configuration` panel with test-case
groups (visible + hidden rows, add/remove). View mode renders the same panels as
static facts with an `Edit task` action and, for drafts, an archive action.
Loading is a two-panel skeleton; a fetch failure renders an error state with
retry and hides the status/actions.

Teacher practice form shipped with: the same masthead recipe (`NEW PRACTICE
SET` / `EDIT PRACTICE SET` eyebrow, title, a `Questions` stat with count, Cancel
/ Save actions), a `Details` panel (title, course, level, topic, duration,
instructions) and a `Questions` panel with per-question blocks (prompt,
options, correct answer, explanation) and add/remove controls. View mode is
read-only with `Edit practice set`; a locked/published notice replaces editing
where the API forbids it. Loading is a two-panel skeleton; failure renders the
shared error state with retry.

Teacher leaderboard shipped with: masthead (`Leaderboard` plus an
`Average progress` stat showing the mean score with a forest bar and a
`Best X% · N students` caption), a `SelectMenu` course dropdown and a `Search students`
input (same 38px/220px idiom as submissions, filters name or mobile client-side
while the stat keeps the course totals) under the h1, one `Rankings` panel of
static rows (rank number, name, `X of Y correct` meta plus an `N courses` prefix
when a student spans courses in `All courses` scope, right-aligned percentage),
and a `How ranking works` panel of three static rules (Progress / Ties / No
attempts). Ranks 1–3 colour the number and name with the shared
`--student-gold|silver|bronze` tokens. Students without a submitted attempt read
`No attempts · N questions` with an idle 0%. The panel count reads `N students`
and switches to `N of M` while searching; a search with no rows shows
`No matches.` in place of the list. Rows are not clickable (there is no student
detail view), so they carry no arrow; hover is a 3.5% tint. The service payload
now includes `courseCount`, `attemptedCourseCount`, `correctAnswers` and
`totalQuestions` per row (still honours `?courseId=` and `?search=`). Loading is
a panel skeleton; `empty` shows `No courses yet` with a `—` stat; a course with
no enrollments shows `No students ranked yet`. The old search/course filter card,
`admin-table`, rank pills and progress bars were removed, along with the
`admin.css` `TEACHER LEADERBOARD` block.

Teacher profile shipped with: the same 760px settings column as the student
profile under a plain `Profile` masthead (only masthead action is the
`Edit details` text button), a `Details` panel of five facts (`Name`, `Email`,
`Mobile`, `Course`, `Member since`) with a 132px uppercase label column and
left-aligned values, and a `Security` panel with one `Password` row. Facts come
from `GET /auth/me` (the teacher's `selectedCourse` supplies `Course`). Editing
is inline in the rows (Name and Mobile become inputs, other facts stay visible)
with Cancel / Save changes under the list; `Edit details` hides while editing.
Non-active accounts get a coral `Status` row. The in-page password view keeps
the back button, h1, 8–72 note, three inputs and Cancel / Update password, and
returns to the profile on success. Missing values render `—`. Loading is a
one-panel skeleton; page fetch failure renders `Failed to load profile` with a
retry. The old `teacher-profile-page` card grid, `Badge`, `teacher-card-head`,
separate `Teacher Profile` card heading and the `admin.css` `teacher-profile`
block were removed.

Teacher shell: `TeacherLayout` now matches the student shell — `.student-topbar`
hamburger, `.app-main`, sidebar `Log out` opening `ConfirmDialog`
(`Log out of Mentriv?` / `Stay signed in` / `Log out`), and a `Dashboard` link at
the top of the teacher nav (`end` on `/teacher`, and `/teacher/dashboard` also
highlights it). `TeacherSidebar` gained
`teacher-sidebar`, the footer and the logout icon. The old topbar `Log out`
button that logged out immediately is gone.

Student and teacher shells: the sidebar `Log out` action opens the shared
`ConfirmDialog` (`Log out of Mentriv?` / `Stay signed in` / `Log out`) exactly
like admin — each layout holds `logoutOpen` and only clears the session on
confirm.

## 6. Remaining

Student: `CourseMcqsPage`, `CourseProgressPage`, `ClassDetailPage`,
`McqTestDetailPage`, `McqAttemptResultPage`, `AttemptWorkspacePage` (some are
secondary flows of an already-redesigned page — redesign them together with their
parent page if they are entered from it).

Suggested order (highest traffic first): McqAttemptResultPage → then the
remaining student secondary flows.

## 7. QA harness

- No real backend. A mock runs on port 5000:
  `C:\Users\harsh\AppData\Local\Temp\opencode\admin-mock\server.mjs`
  (`node <path>`). Modes via `GET /__mode?value=normal|error|empty|delay&delay=N`.
  It already covers admin, student dashboard/classes/assignments, MCQ practice,
  coding practice, progress, achievements, leaderboard, and teacher
  dashboard/classes/assignments/leaderboard. Extend it for the page you are
  redesigning; keep fixtures realistic (2–3 courses, mixed statuses, one empty
  state).
  `/progress/overview` now honours `?courseId=` and serves real MCQ test/attempt
  ids so the result drill-down works. `/leaderboard` honours `?timeFilter=` and
  `?courseId=` and marks `lb-05` (Harsh Patel) as `isMe`; it has no real JWT
  lookup, so keep that fixed id when adding fixtures.
  `/notifications` serves 14 student fixtures (links to student routes, mixed
  types/read states) and honours `?isRead`, `?type`, `?page`, `?limit`;
  `PATCH /notifications/:id/read` and `PATCH /notifications/read-all` mutate the
  in-memory rows, so unread counts change during a QA pass.
- My Courses / Course Learn run off `/enrollments/my` (three enrollments:
  approved Full Stack, approved UI/UX, and a pending Data Science
  `65f000000000000000000002` with no class plan) plus `/courses/:id/classes`,
  `/assignments?courseId=`, `/mcq-tests?courseId=` and `GET /submissions/my`.
  That last route is new: it derives one row per submitted `assignmentFixtures`
  entry, sets `status` to `reviewed` when marks exist and `submitted` otherwise,
  and honours `?courseId=`. Course ids for QA:
  `65f000000000000000000001` (Full Stack, 13 classes / 4 assignments / 8 practice
  sets), `...0003` (UI/UX) and `...0002` (pending).
- `GET /teacher/dashboard` is now mocked: four courses (`...0001`–`...0004`),
  per-course totals in `teacherCourseStats`, five `teacherRecentSubmissions`
  (mixed Pending/Late/Reviewed), and one live announcement. It honours
  `?courseId=` (`all` or a course id), `empty` returns no courses/rows/
  announcement, and `error`/`delay` work as usual. Teacher auth for QA:
  fake JWT with `role:'teacher'` and any name (e.g. Harsh Patel).
- `GET /teacher/classes` is mocked from `teacherClassPlans` (24 classes across
  the same four courses: 19 published, 5 drafts, realistic modules/titles,
  mixed video/resource counts, `createdAt` spread over ~3 months). It honours
  `?courseId=` and `empty`; class counts match `teacherCourseStats` (9/6/5/4).
  `POST /courses/:courseId/classes` mutates the in-memory catalog so the
  create → toast → refetch flow works; new rows append to their module and the
  stat moves.
- `GET /teacher/submissions` is mocked from `teacherSubmissionPlans` (16
  student-course rows across the same four courses with mixed progress and
  `submitted`/`pending` states) and `teacherTimingPlans` (8 assignment/MCQ
  timing rows: submitted, late, reviewed, one pending without a submitted time
  and one with no limit). It honours `?courseId=` and `?level=`; the `courses`
  array is not level-filtered (matching the real service), so a course + level
  combination with no rows still leaves the switchers usable.
- `GET /teacher/assignments` and `GET /teacher/mcqs` are mocked from
  `teacherAssignmentPlans` (23
  assignments: 18 published, 5 drafts, plus 11 practice tests across the same
  four courses) and `teacherAssignmentCatalog` (three Data Science MCQ fixtures
  with real `questions` arrays so `questionCount` is realistic). It honours
  `?courseId=` and `empty`; counts match `teacherCourseStats` totals. It also
  serves `POST /assignments/bulk` and `POST /mcq-tests/bulk` (mutating the
  in-memory rows so create → toast → refetch works) and `POST /ai/parse-questions`
  (returns a fixed two-question set for the paste-and-preview flow).
- `GET /teacher/leaderboard` is mocked by aggregating `teacherSubmissionRows`
  per student name (14 students, `teacherStudentPhones` supplies mobiles) into
  `courseCount`, `attemptedCourseCount`, `correctAnswers`, `totalQuestions` and a
  percentage `progress`, sorted by progress then name. It honours `?courseId=`
  and `?search=`, and `empty` returns no courses/rows. Counts line up with the
  submissions fixtures so cross-checking the two pages is easy.
- The mock also serves `GET/PATCH /api/v1/auth/me` and
  `PATCH /api/v1/auth/change-password` for Profile. It reads the bearer token
  role: teacher requests get `teacherProfileUser` (teacher course, 540-day-old
  account) and student requests keep the student fixtures. The password change
  returns a real-shaped JWT for the requesting role (`AuthContext.buildAuthValue`
  rejects any token without a decodable payload and drops the session), accepts
  `pass1234` as the current password, and `empty` mode blanks the phone and
  course so the `—` fallbacks render. `PATCH /auth/me` validates name/phone like
  the server.
- Vite: `npm.cmd run dev` from `client/`. It may pick 5173–5175 depending on stale
  servers — always confirm the printed port.
- Auth: write a fake JWT into `mentriv.accessToken`
  (`{sub, role:'student', tv, iat, exp}`), user into `mentriv.user`
  (`{id, name, role}`), theme into `theme` (`'light'|'dark'`).
- Browser: Playwright MCP **through `execute`** as `tools.playwright.*`. Browse
  MCP is available again but a fresh page load via Playwright is faster and has
  reliable console capture. Use `browser_console_messages({all:false})` after
  navigation — stale history from earlier ports is noise.
- If neither MCP is connected, launch headless Chrome yourself:
  `chrome.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<temp>`
  and drive it over CDP from a temp Node script (Node 24 has a global
  `WebSocket`). `Emulation.setDeviceMetricsOverride` gives exact
  1440/1024/768/390 viewports, `Page.captureScreenshot` gives viewport shots,
  and `Runtime.evaluate` covers the scrollWidth assertion and state checks.
- Screenshots: viewport captures only (full-page mis-stitches under the fixed
  sidebar). Keep the mouse away or the sidebar expands 72px → 220px.
- Check light + dark at 1440, 1024, 768, 390; assert
  `document.documentElement.scrollWidth <= window.innerWidth`; walk the primary
  flow (open → act → submit → result) plus error/empty/loading states.
- Save QA screenshots under `docs/qa/<page-slug>/` (e.g. `docs/qa/teacher-mcqs/`)
  and show them in the session reply — the user wants to see the result, so do
  not delete them at handoff. Finish with `npm.cmd run build` from `client/`
  (exit 0; chunk-size warnings are pre-existing), then delete `client/build.log`.

## 8. Session prompt template

> Read `docs/redesign-handoff.md`. Redesign **<page>** (`client/src/pages/<area>/<file>`)
> to match the finished student pages. Follow the page recipe and tokens in the
> handoff. Extend the mock if the endpoints are missing, QA light/dark at
> 1440/1024/768/390 plus error/empty/loading, run the build, then append the page
> to the Done table and leave everything uncommitted.
