// Backup Controller
// Handles HTTP requests for backup operations

import { Request, Response } from 'express';
import * as backupService from '../services/backupService';

// ============================================================
// POST /api/backup/now - Create manual backup
// ============================================================
export async function createBackup(req: Request, res: Response) {
  try {
    const backup = await backupService.createBackup();
    res.json({
      message: 'Backup created successfully',
      backup,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup failed';
    console.error('❌ Backup failed:', message);
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/backup/list - List available backups
// ============================================================
export async function listBackups(req: Request, res: Response) {
  try {
    const backups = backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list backups';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/backup/download/:filename - Download backup file
// ============================================================
export async function downloadBackup(req: Request, res: Response) {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = backupService.getBackupPath(filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(filePath, filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed';
    res.status(500).json({ error: message });
  }
}
