import mongoose from 'mongoose';
import { settings } from './config.js';
import { logger } from './logger.js';

let connected = false;

export function connectDb(): void {
  mongoose.set('strictQuery', false);
  mongoose.connection.on('connected', () => {
    connected = true;
    logger.info(`MongoDB connected: ${settings.mongodb_database}`);
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
  });
  mongoose
    .connect(settings.mongodb_uri, { dbName: settings.mongodb_database, serverSelectionTimeoutMS: 5000 })
    .catch((err) => {
      logger.warn({ err: err.message }, 'Initial MongoDB connection failed — will retry in background');
    });
}

export async function dbConnected(): Promise<boolean> {
  try {
    if (!connected || !mongoose.connection.db) return false;
    await mongoose.connection.db.admin().command({ ping: 1 });
    return true;
  } catch (exc) {
    logger.warn({ exc }, 'MongoDB ping failed');
    return false;
  }
}

export const db = mongoose.connection;
