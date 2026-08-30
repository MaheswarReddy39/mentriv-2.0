import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import courseRoutes from './course.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import paymentRoutes from './payment.routes.js';
import classRoutes from './class.routes.js';
import assignmentRoutes from './assignment.routes.js';
import submissionRoutes from './submission.routes.js';
import mcqRoutes from './mcq.routes.js';
import mcqAttemptRoutes from './mcq-attempt.routes.js';
import progressRoutes from './progress.routes.js';
import notificationRoutes from './notification.routes.js';
import announcementRoutes from './announcement.routes.js';
import studentRoutes from './student.routes.js';
import teacherAdminRoutes from './teacher-admin.routes.js';
import teacherDashboardRoutes from './teacher-dashboard.routes.js';

const apiV1Router = Router();

apiV1Router.use('/', healthRoutes);
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/courses', courseRoutes);
apiV1Router.use('/enrollments', enrollmentRoutes);
apiV1Router.use('/payments', paymentRoutes);
apiV1Router.use('/students', studentRoutes);
apiV1Router.use('/teachers', teacherAdminRoutes);
apiV1Router.use('/teacher', teacherDashboardRoutes);
apiV1Router.use(classRoutes);
apiV1Router.use(assignmentRoutes);
apiV1Router.use(submissionRoutes);
apiV1Router.use(mcqRoutes);
apiV1Router.use(mcqAttemptRoutes);
apiV1Router.use(progressRoutes);
apiV1Router.use(notificationRoutes);
apiV1Router.use(announcementRoutes);

const router = Router();

router.use('/', healthRoutes);
router.use('/api/v1', apiV1Router);

export default router;
