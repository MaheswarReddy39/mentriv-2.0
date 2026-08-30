import bcrypt from 'bcrypt';
import env from '../config/env.js';

const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, env.bcryptSaltRounds);

const comparePassword = (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

export { hashPassword, comparePassword };
