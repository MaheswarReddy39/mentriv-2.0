import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const { default: User } = await import('./src/models/user.model.js');
const { comparePassword } = await import('./src/services/password.service.js');

const admin = await User.findOne({ role: { $in: ['admin', 'superAdmin'] } }).select('+passwordHash');
const candidates = [
  'SeedAdmin@123', 'TestPass@123', 'Admin@123', 'admin@123', 'Admin123', 'admin123',
  'Password@123', 'password123', 'Mentriv@123', 'Mentriv123', 'mentriv@123',
  'Tharun@123', 'Tharun123', 'tharun@123', 'Tharun@1234', 'Welcome@123',
  'Admin@2024', 'Admin@2025', 'Admin@2026', 'P@ssw0rd123', 'Admin@1234',
  'SuperAdmin@123', 'superadmin', 'changeme', 'letmein123', 'Test@123',
];
const hits = [];
for (const p of candidates) {
  try {
    if (await comparePassword(p, admin.passwordHash || '')) hits.push(p);
  } catch {}
}
console.log(JSON.stringify({ email: admin.email, hits }));
await mongoose.disconnect();
