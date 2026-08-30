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
  if (!transporter) {
    console.warn('[email] SMTP is not configured - password reset email skipped');
    return { sent: false };
  }

  try {
    const link = buildPasswordResetLink(token);
    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject: 'Reset your Mentriv password',
      text: `Hi ${name}, please reset your password: ${link}`,
      html: `<p>Hi ${name},</p><p>Please reset your password by clicking the link below:</p><p><a href="${link}">Reset my password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send password reset email: ${error.message}`);
    return { sent: false };
  }
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
    subject: `New lesson published in "${courseTitle}"`,
    text: `Hi ${name}, a new lesson "${lessonTitle}" is now available in "${courseTitle}".`,
    html: brandWrap(
      'New lesson available',
      name,
      `<p>A new lesson <strong>${lessonTitle}</strong> is now available in <strong>${courseTitle}</strong>.</p><p><a href="${emailConfig.frontendUrl}/courses/${courseId}">Open course</a></p>`
    ),
  });

const sendNewAssignmentEmail = async ({ to, name, courseTitle, assignmentTitle, assignmentId }) =>
  sendBrandedMail('new assignment', {
    to,
    subject: `New assignment published in "${courseTitle}"`,
    text: `Hi ${name}, a new assignment "${assignmentTitle}" is now available in "${courseTitle}".`,
    html: brandWrap(
      'New assignment available',
      name,
      `<p>A new assignment <strong>${assignmentTitle}</strong> is now available in <strong>${courseTitle}</strong>.</p><p><a href="${emailConfig.frontendUrl}/assignments/${assignmentId}">View assignment</a></p>`
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
};
