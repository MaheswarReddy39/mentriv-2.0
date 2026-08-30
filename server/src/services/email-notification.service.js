import Enrollment from '../models/enrollment.model.js';
import User from '../models/user.model.js';
import emailService from './email.service.js';

// Recipients are always resolved from the database. Inactive accounts never
// receive business-event emails.
const getActiveUserContact = async (userId) => {
  const user = await User.findById(userId).select('name email status');
  if (!user || user.status !== 'active' || !user.email) {
    return null;
  }
  return { id: user._id.toString(), name: user.name, email: user.email };
};

// Eligible students for course fan-outs = approved/completed enrollments
// belonging to active users (uses the enrollment courseId/status indexes).
const getEligibleCourseRecipients = async (courseId) => {
  const enrollments = await Enrollment.find({
    courseId,
    status: { $in: ['approved', 'completed'] },
  })
    .populate('userId', 'name email status')
    .select('userId');

  return enrollments
    .map((enrollment) => enrollment.userId)
    .filter((user) => user && user.email && user.status === 'active')
    .map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));
};

const getActiveUsersByRoles = async (roles) => {
  const users = await User.find({
    role: { $in: roles },
    status: 'active',
    accountActivated: true,
  }).select('name email role');

  return users
    .filter((user) => Boolean(user.email))
    .map((user) => ({ id: user._id.toString(), name: user.name, email: user.email }));
};

// One invalid recipient must not block emails to the rest of the audience.
const sendToRecipients = async (recipients, compose) => {
  for (const recipient of recipients) {
    try {
      await compose(recipient);
    } catch (error) {
      console.warn(`[email] skipped recipient ${recipient.email}: ${error.message}`);
    }
  }
};

const sendEnrollmentStatusEmails = async (enrollment, newStatus, courseTitle) => {
  const contact = await getActiveUserContact(enrollment.userId);
  if (!contact) {
    return;
  }

  const payload = {
    to: contact.email,
    name: contact.name || contact.email,
    courseTitle,
    courseId: (enrollment.courseId ?? '').toString(),
  };

  if (newStatus === 'approved') {
    await emailService.sendEnrollmentApprovedEmail(payload);
  } else if (newStatus === 'rejected') {
    await emailService.sendEnrollmentRejectedEmail(payload);
  }
};

const sendPaymentStatusEmails = async (payment, newStatus) => {
  const contact = await getActiveUserContact(payment.userId);
  if (!contact) {
    return;
  }

  const courseTitle = payment.courseId?.title || 'your course';
  const payload = {
    to: contact.email,
    name: contact.name || contact.email,
    courseTitle,
    amount: payment.amount,
    currency: payment.currency,
    reason: payment.rejectionReason,
    courseId: payment.courseId?._id ? payment.courseId._id.toString() : undefined,
  };

  if (newStatus === 'verified') {
    await emailService.sendPaymentVerifiedEmail(payload);
  } else if (newStatus === 'rejected') {
    await emailService.sendPaymentRejectedEmail(payload);
  }
};

const sendClassPublishedEmails = async ({ courseId, courseTitle, lessonTitle }) => {
  const recipients = await getEligibleCourseRecipients(courseId);
  const resolvedCourseId = typeof courseId === 'string' ? courseId : courseId.toString();

  await sendToRecipients(recipients, async (recipient) => {
    await emailService.sendNewClassEmail({
      to: recipient.email,
      name: recipient.name,
      courseTitle,
      lessonTitle,
      courseId: resolvedCourseId,
    });
  });
};

const sendAssignmentPublishedEmails = async ({
  courseId,
  courseTitle,
  assignmentTitle,
  assignmentId,
}) => {
  const recipients = await getEligibleCourseRecipients(courseId);
  const resolvedAssignmentId =
    typeof assignmentId === 'string' ? assignmentId : assignmentId.toString();

  await sendToRecipients(recipients, async (recipient) => {
    await emailService.sendNewAssignmentEmail({
      to: recipient.email,
      name: recipient.name,
      courseTitle,
      assignmentTitle,
      assignmentId: resolvedAssignmentId,
    });
  });
};

const sendAnnouncementPublishedEmails = async (announcement) => {
  const audienceRoles =
    announcement.audience === 'students'
      ? ['student']
      : announcement.audience === 'admins'
        ? ['admin', 'superAdmin']
        : ['student', 'admin', 'superAdmin'];

  const recipients = await getActiveUsersByRoles(audienceRoles);
  await sendToRecipients(recipients, async (recipient) => {
    await emailService.sendAnnouncementEmail({
      to: recipient.email,
      name: recipient.name,
      announcementTitle: announcement.title,
      content: announcement.content,
      announcementId: announcement._id.toString(),
    });
  });
};

export default {
  sendEnrollmentStatusEmails,
  sendPaymentStatusEmails,
  sendClassPublishedEmails,
  sendAssignmentPublishedEmails,
  sendAnnouncementPublishedEmails,
};
