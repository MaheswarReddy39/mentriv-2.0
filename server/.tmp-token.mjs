import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const { default: User } = await import('./src/models/user.model.js');
const u = await User.findOne({ role: { $in: ['admin', 'superAdmin'] } });
if (!u) {
  console.log('NO_ADMIN');
  process.exit(1);
}
const token = jwt.sign(
  { sub: u._id.toString(), tv: u.tokenVersion ?? 0 },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
);
console.log(token);
await mongoose.disconnect();
