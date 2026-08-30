import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateSecureToken = (ttlMinutes) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return { token, hashedToken, expiresAt };
};

const generateAccessToken = (payload) => {
  if (!env.jwtAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
};

const verifyAccessToken = (token) => {
  if (!env.jwtAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  return jwt.verify(token, env.jwtAccessSecret);
};

const generatePasswordResetToken = () =>
  generateSecureToken(env.passwordResetTokenTtlMinutes);

const generateEmailVerificationToken = () =>
  generateSecureToken(env.emailVerificationTokenTtlMinutes);

const generateAccountActivationToken = () =>
  generateSecureToken(env.accountActivationTokenTtlMinutes);

const hashPasswordResetToken = (token) => sha256Hex(token);
const hashEmailVerificationToken = (token) => sha256Hex(token);
const hashAccountActivationToken = (token) => sha256Hex(token);

export {
  generateAccessToken,
  verifyAccessToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  generateAccountActivationToken,
  hashAccountActivationToken,
};
