import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 15,
  emailVerificationTokenTtlMinutes:
    Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) || 60,
  accountActivationTokenTtlMinutes:
    Number(process.env.ACCOUNT_ACTIVATION_TOKEN_TTL_MINUTES) || 1440,
  appFrontendUrl: process.env.APP_FRONTEND_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM_EMAIL || 'Mentriv <no-reply@mentriv.local>',
  },
  chromaDbUrl: process.env.CHROMA_DB_URL || 'http://localhost:8000',
  embeddingModel: process.env.EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'openai/gpt-4o-mini',
};

export default env;
