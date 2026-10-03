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
import adminRoutes from './routes/adminRoutes';
import reportRoutes from './routes/reportRoutes';
import exportRoutes from './routes/exportRoutes';
import auditRoutes from './routes/auditRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import reorderRoutes from './routes/reorderRoutes';
import { authenticate } from './middleware/auth';
import { startPeriodicBackup, stopPeriodicBackup } from './services/backupService';

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

// CORS: allow devices on the local network
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint (public)
// `version` is injected by the Tauri sidecar (APP_VERSION) so the desktop app
// can detect a stale backend left over from a previous install and replace it.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Store Management System API is running',
    version: process.env.APP_VERSION || null,
  });
});

// Auth routes (login is public, me is protected)
app.use('/api/auth', authRoutes);

// Protect all other /api routes
app.use('/api/items', authenticate, itemRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/import', authenticate, importRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/backup', authenticate, backupRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/api/audits', authenticate, auditRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/reorder', authenticate, reorderRoutes);

// ============================================================
// SINGLE-PORT PRODUCTION MODE
// Serve the built frontend (frontend/dist) on the same port.
// Dev mode keeps using Vite on :3000 — this only activates when
// the build output exists (after `cd frontend && npm run build`).
// ============================================================
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  // Hashed assets (JS/CSS/images) can be cached hard; index.html never is
  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      setHeaders: (res, filePath) => {
        if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // Unknown API paths must still return JSON (never index.html)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // SPA fallback — everything else serves index.html
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });

  console.log(`🌐 Serving frontend from ${FRONTEND_DIST}`);
} else {
  // Dev: unknown API paths get JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Start periodic backup
    startPeriodicBackup();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      stopPeriodicBackup();
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
