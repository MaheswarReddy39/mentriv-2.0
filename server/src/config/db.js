import dns from 'node:dns';
import mongoose from 'mongoose';
import env from './env.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const sanitize = (text) => text.replace(/\/\/[^@/\s]*@/g, '//***@');

const registerConnectionListeners = () => {
  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[db] MongoDB error: ${sanitize(err.message)}`);
  });
};

const connectDB = async () => {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your Atlas connection string.');
  }

  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log(
      `[db] MongoDB connected: database "${conn.connection.name}" on host "${conn.connection.host}"`
    );
    return conn;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${sanitize(error.message)}`);
  }
};

export default connectDB;
