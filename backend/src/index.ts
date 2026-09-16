// Store Management System - Backend Entry Point
// This file sets up the Express server and connects to the database

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import prisma from './lib/prisma';
import authRoutes from './routes/authRoutes';
import itemRoutes from './routes/itemRoutes';
import transactionRoutes from './routes/transactionRoutes';
import importRoutes from './routes/importRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import backupRoutes from './routes/backupRoutes';
import reportRoutes from './routes/reportRoutes';
import exportRoutes from './routes/exportRoutes';
import auditRoutes from './routes/auditRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import reorderRoutes from './routes/reorderRoutes';
import { authenticate } from './middleware/auth';
import { startPeriodicBackup } from './services/backupService';

// Parse --data-dir argument
const dataDirArg = process.argv.find(arg => arg.startsWith('--data-dir='));
const DATA_DIR = dataDirArg
  ? dataDirArg.split('=')[1]
  : process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Set database path if not already set
if (!process.env.DATABASE_URL) {
  const dbPath = path.join(DATA_DIR, 'store.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

// Set backup and report directories
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const REPORT_DIR = process.env.REPORT_DIR || path.join(DATA_DIR, 'reports');

[BACKUP_DIR, REPORT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

// CORS: allow any device on the local network
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Store Management System API is running' });
});

// Auth routes (login is public, me is protected)
app.use('/api/auth', authRoutes);

// Protect all other /api routes
app.use('/api/items', authenticate, itemRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/import', authenticate, importRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/backup', authenticate, backupRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/api/audits', authenticate, auditRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/reorder', authenticate, reorderRoutes);

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Start periodic backup
    startPeriodicBackup();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
