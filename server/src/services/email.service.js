import nodemailer from 'nodemailer';
import emailConfig from '../config/email.config.js';

const transporter = emailConfig.smtpConfigured
  ? nodemailer.createTransport(emailConfig.smtp)
  : null;

const buildVerificationLink = (token) =>
  `${emailConfig.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

const sendVerificationEmail = async ({ to, name, token }) => {
  if (!transporter) {
    console.warn('[email] SMTP is not configured - verification email skipped');
    return { sent: false };
  }

  try {
    const link = buildVerificationLink(token);
    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject: 'Verify your Mentriv email address',
      text: `Hi ${name}, please verify your email address: ${link}`,
      html: `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${link}">Verify my email</a></p>`,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send verification email: ${error.message}`);
    return { sent: false };
  }
};

const buildActivationLink = (token) =>
  `${emailConfig.frontendUrl}/activate-account?token=${encodeURIComponent(token)}`;

const sendAccountActivationEmail = async ({ to, name, token }) => {
  if (!transporter) {
    console.warn('[email] SMTP is not configured - account activation email skipped');
    return { sent: false };
  }

  try {
    const link = buildActivationLink(token);
    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject: 'Activate your Mentriv account',
      text: `Hi ${name}, please activate your account and set your password: ${link}`,
      html: `<p>Hi ${name},</p><p>Please activate your account and set your password by clicking the link below:</p><p><a href="${link}">Activate my account</a></p>`,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send activation email: ${error.message}`);
    return { sent: false };
  }
};

const buildPasswordResetLink = (token) =>
  `${emailConfig.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

const sendPasswordResetEmail = async ({ to, name, token }) => {
  const link = buildPasswordResetLink(token);

  return sendBrandedMail('password reset', {
    to,
    subject: 'Reset Your Mentriv Password',
    text: `Hi ${name}, We received a request to reset your Mentriv account password. Reset your password here: ${link} This link is valid for a limited time and can only be used once. If you didn't request a password reset, you can safely ignore this email.`,
    html: brandWrap(
      'Reset Your Mentriv Password',
      name,
      `<p>We received a request to reset your Mentriv account password. Click the button below to create a new password.</p>
       <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p>
       <p>This link is valid for a limited time and can only be used once. If you don't see this email in your inbox, please check your Spam or Junk folder as well.</p>
       <p>If you didn't request a password reset, you can safely ignore this email.</p>`
    ),
  });
};

const sendBrandedMail = async (kind, { to, subject, text, html }) => {
  if (!transporter) {
    console.warn(`[email] SMTP is not configured - ${kind} email skipped`);
    return { sent: false };
  }

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send ${kind} email: ${error.message}`);
    return { sent: false };
  }
};

const brandWrap = (heading, name, bodyHtml) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#0f172a">
    <h2 style="color:#2563eb">Mentriv</h2>
    <p>Hi ${name || 'there'},</p>
    ${bodyHtml}
    <p style="margin-top:24px">- The Mentriv Team</p>
  </div>`;

const sendEnrollmentApprovedEmail = async ({ to, name, courseTitle, courseId }) =>
  sendBrandedMail('enrollment approved', {
    to,
    subject: `Your enrollment for "${courseTitle}" is approved`,
    text: `Hi ${name}, your enrollment for "${courseTitle}" has been approved. Start learning at ${emailConfig.frontendUrl}/courses/${courseId}`,
    html: brandWrap(
      'Great news!',
      name,
      `<p>Your enrollment for <strong>${courseTitle}</strong> has been approved.</p><p><a href="${emailConfig.frontendUrl}/courses/${courseId}">Start learning</a></p>`
    ),
  });

const sendEnrollmentRejectedEmail = async ({ to, name, courseTitle }) =>
  sendBrandedMail('enrollment rejected', {
    to,
    subject: `Update on your enrollment request for "${courseTitle}"`,
    text: `Hi ${name}, unfortunately your enrollment request for "${courseTitle}" was not approved. Contact support if you believe this is a mistake.`,
    html: brandWrap(
      'Enrollment update',
      name,
      `<p>Unfortunately your enrollment request for <strong>${courseTitle}</strong> was not approved.</p><p>If you believe this is a mistake, please contact support.</p>`
    ),
  });

const sendPaymentVerifiedEmail = async ({ to, name, courseTitle, amount, currency, courseId }) =>
  sendBrandedMail('payment verified', {
    to,
    subject: `Payment confirmed for "${courseTitle}"`,
    text: `Hi ${name}, we received your payment of ${currency} ${amount} for "${courseTitle}". Your enrollment is now active.`,
    html: brandWrap(
      'Payment confirmed',
      name,
      `<p>We received your payment of <strong>${currency} ${amount}</strong> for <strong>${courseTitle}</strong>.</p><p>Your enrollment is now active - happy learning!</p><p><a href="${emailConfig.frontendUrl}/courses/${courseId}">Go to course</a></p>`
    ),
  });

const sendPaymentRejectedEmail = async ({ to, name, courseTitle, reason }) => {
  const safeReason = String(reason || '').slice(0, 300);
  return sendBrandedMail('payment rejected', {
    to,
    subject: `Your payment for "${courseTitle}" was rejected`,
    text: `Hi ${name}, your payment for "${courseTitle}" was rejected. Reason: ${safeReason}. Please review and submit a new payment.`,
    html: brandWrap(
      'Payment rejected',
      name,
      `<p>Your payment for <strong>${courseTitle}</strong> was rejected.</p><p><strong>Reason:</strong> ${safeReason}</p><p>Please review the details and submit a new payment.</p>`
    ),
  });
};

const sendNewClassEmail = async ({ to, name, courseTitle, lessonTitle, courseId }) =>
  sendBrandedMail('new class', {
    to,
    subject: `New Class Added — ${courseTitle}`,
    text: `Hi ${name}, A new class has been added to your ${courseTitle} course on Mentriv. Please log in to your Mentriv account to check the new class and access the available details and learning materials.`,
    html: brandWrap(
      'New class added',
      name,
      `<p>A new class has been added to your <strong>${courseTitle}</strong> course on Mentriv.</p>
       <p>Please log in to your Mentriv account to check the new class and access the available details and learning materials.</p>
       <p><a href="${emailConfig.frontendUrl}/courses/${courseId}">Open course</a></p>`
    ),
  });

const sendNewAssignmentEmail = async ({ to, name, courseTitle, assignmentTitle, assignmentId }) =>
  sendBrandedMail('new assignment', {
    to,
    subject: `New Assignment Added — ${courseTitle}`,
    text: `Hi ${name}, A new assignment has been added to your ${courseTitle} course on Mentriv. You have only 12 hours to complete and submit the assignment. Please log in to your Mentriv account to view the assignment details and submit your work.`,
    html: brandWrap(
      'New assignment added',
      name,
      `<p>A new assignment has been added to your <strong>${courseTitle}</strong> course on Mentriv.</p>
       <p>You have only 12 hours to complete and submit the assignment. Please make sure to submit your work within this period.</p>
       <p>Please log in to your Mentriv account to view the assignment details and submit your work.</p>
       <p><a href="${emailConfig.frontendUrl}/assignments/${assignmentId}">View assignment</a></p>`
    ),
  });

const sendAnnouncementEmail = async ({ to, name, announcementTitle, content, announcementId }) =>
  sendBrandedMail('announcement', {
    to,
    subject: `Announcement: ${String(announcementTitle).slice(0, 100)}`,
    text: `Hi ${name}, ${content}`,
    html: brandWrap(
      announcementTitle,
      name,
      `<p>${content}</p><p><a href="${emailConfig.frontendUrl}/announcements/${announcementId}">Read on Mentriv</a></p>`
    ),
  });

const sendRegistrationConfirmationEmail = async ({ to, name, courseTitle }) =>
  sendBrandedMail('registration confirmation', {
    to,
    subject: 'Registration Received — Your Mentriv Account Is Awaiting Approval',
    text: `Hi ${name}, Welcome to Mentriv. We've received your registration for the ${courseTitle} course. Your account is currently awaiting admin approval. Our team will review your registration and activate your access. You'll receive another email once your account has been approved. We look forward to having you learn with Mentriv.`,
    html: brandWrap(
      'Registration received',
      name,
      `<p>Welcome to Mentriv!</p>
       <p>We've successfully received your registration for the <strong>${courseTitle}</strong> course. Your account is currently awaiting admin approval, and our team will review your registration before activating your access.</p>
       <p>There's nothing you need to do at this stage. We'll send you another email as soon as your account has been approved.</p>
       <p>We look forward to having you learn with Mentriv.</p>`
    ),
  });

const sendNewStudentRegistrationEmail = async ({ to, adminName, studentName, studentEmail, courseTitle }) =>
  sendBrandedMail('new student registration', {
    to,
    subject: 'New Student Registration — Approval Required',
    text: `Hi ${adminName}, A new student has registered for the ${courseTitle} course on Mentriv and is waiting for your approval. Student: ${studentName}, Email: ${studentEmail}, Course: ${courseTitle}. Please review from the Admin Dashboard.`,
    html: brandWrap(
      'New student registration',
      adminName,
      `<p>A new student has successfully registered for the <strong>${courseTitle}</strong> course on Mentriv and is currently waiting for your approval.</p>
       <p style="margin:var(--space-4) 0;padding:var(--space-3) var(--space-4);background:var(--color-surface-muted);border-radius:var(--radius-sm);line-height:1.8">
         <strong>Student:</strong> ${studentName}<br/>
         <strong>Email:</strong> ${studentEmail}<br/>
         <strong>Course:</strong> ${courseTitle}
       </p>
       <p>Please review the student's registration from the Admin Dashboard and approve or reject the account.</p>`
    ),
  });

const sendStudentApprovalEmail = async ({ to, studentName, courseTitle }) =>
  sendBrandedMail('student approval', {
    to,
    subject: 'Your Mentriv Registration Has Been Approved',
    text: `Hi ${studentName}, Good news! Your registration for the ${courseTitle} course has been approved. Your account is now active and you can log in using the email and password you provided during registration.`,
    html: brandWrap(
      'Registration approved',
      studentName,
      `<p>Good news! Your registration for the <strong>${courseTitle}</strong> course has been approved by the Mentriv Admin team.</p>
       <p>Your account is now active, and you can log in to Mentriv using the email address and password you provided during registration.</p>
       <p>You can now log in and access your Mentriv account.</p>`
    ),
  });

const sendStudentRejectionEmail = async ({ to, studentName, courseTitle }) =>
  sendBrandedMail('student rejection', {
    to,
    subject: 'Update on Your Mentriv Registration',
    text: `Hi ${studentName}, We're writing to let you know that your registration for the ${courseTitle} course was not approved. If you believe this was unexpected, please contact the Mentriv team for assistance.`,
    html: brandWrap(
      'Registration update',
      studentName,
      `<p>We're writing to let you know that your registration for the <strong>${courseTitle}</strong> course was not approved by the Mentriv Admin team.</p>
       <p>If you believe this was unexpected or you need more information, please contact the Mentriv team for assistance.</p>`
    ),
  });

const sendTeacherRegistrationConfirmationEmail = async ({ to, teacherName }) =>
  sendBrandedMail('teacher registration confirmation', {
    to,
    subject: 'Teacher Registration Received — Awaiting Admin Approval',
    text: `Hi ${teacherName}, We've successfully received your registration as a teacher on Mentriv. Your registration is currently awaiting Admin approval, and our team will review your details before activating your teacher account. You'll receive another email once your registration has been approved or rejected. We look forward to having you as part of Mentriv.`,
    html: brandWrap(
      'Registration received',
      teacherName,
      `<p>We've successfully received your registration as a teacher on Mentriv. Your registration is currently awaiting Admin approval, and our team will review your details before activating your teacher account.</p>
       <p>There's nothing you need to do at this stage. Please wait for the Admin's decision. You'll receive another email once your registration has been approved or rejected.</p>
       <p>We look forward to having you as part of Mentriv.</p>`
    ),
  });

const sendNewTeacherRegistrationEmail = async ({ to, adminName, teacherName, teacherEmail }) =>
  sendBrandedMail('new teacher registration', {
    to,
    subject: 'New Teacher Registration — Approval Required',
    text: `Hi ${adminName}, A new teacher has registered on Mentriv and is waiting for your approval. Teacher: ${teacherName}, Email: ${teacherEmail}. Please review from the Admin Dashboard.`,
    html: brandWrap(
      'New teacher registration',
      adminName,
      `<p>A new teacher has successfully registered on Mentriv and is currently waiting for your approval.</p>
       <p style="margin:var(--space-4) 0;padding:var(--space-3) var(--space-4);background:var(--color-surface-muted);border-radius:var(--radius-sm);line-height:1.8">
         <strong>Teacher:</strong> ${teacherName}<br/>
         <strong>Email:</strong> ${teacherEmail}
       </p>
       <p>Please review the teacher's registration from the Admin Dashboard and approve or reject the account.</p>`
    ),
  });

const sendTeacherApprovalEmail = async ({ to, teacherName }) =>
  sendBrandedMail('teacher approval', {
    to,
    subject: 'Your Mentriv Teacher Registration Has Been Approved',
    text: `Hi ${teacherName}, Good news! Your teacher registration on Mentriv has been approved. Your teacher account is now active and you can log in using the email address and password you provided during registration.`,
    html: brandWrap(
      'Registration approved',
      teacherName,
      `<p>Good news! Your teacher registration on Mentriv has been approved by the Admin team.</p>
       <p>Your teacher account is now active, and you can log in using the email address and password you provided during registration.</p>
       <p>You can now log in and access your Mentriv teacher account.</p>`
    ),
  });

const sendTeacherRejectionEmail = async ({ to, teacherName }) =>
  sendBrandedMail('teacher rejection', {
    to,
    subject: 'Update on Your Mentriv Teacher Registration',
    text: `Hi ${teacherName}, We're writing to let you know that your teacher registration on Mentriv was not approved. If you believe this was unexpected, please contact the Mentriv team for assistance.`,
    html: brandWrap(
      'Registration update',
      teacherName,
      `<p>We're writing to let you know that your teacher registration on Mentriv was not approved by the Admin team.</p>
       <p>If you believe this was unexpected or you need more information, please contact the Mentriv team for assistance.</p>`
    ),
  });

export default {
  sendVerificationEmail,
  buildVerificationLink,
  sendAccountActivationEmail,
  buildActivationLink,
  sendPasswordResetEmail,
  buildPasswordResetLink,
  sendEnrollmentApprovedEmail,
  sendEnrollmentRejectedEmail,
  sendPaymentVerifiedEmail,
  sendPaymentRejectedEmail,
  sendNewClassEmail,
  sendNewAssignmentEmail,
  sendAnnouncementEmail,
  sendRegistrationConfirmationEmail,
  sendNewStudentRegistrationEmail,
  sendStudentApprovalEmail,
  sendStudentRejectionEmail,
  sendTeacherRegistrationConfirmationEmail,
  sendNewTeacherRegistrationEmail,
  sendTeacherApprovalEmail,
  sendTeacherRejectionEmail,
};
