import env from './env.js';

const smtpConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.password);

const smtpConfig = {
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  ...(smtpConfigured ? { auth: { user: env.smtp.user, pass: env.smtp.password } } : {}),
};

const emailConfig = {
  smtpConfigured,
  smtp: smtpConfig,
  from: env.smtp.from,
  frontendUrl: env.appFrontendUrl,
  verificationTokenTtlMinutes: env.emailVerificationTokenTtlMinutes,
};

export default emailConfig;
