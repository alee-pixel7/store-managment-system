// Admin Service
// Factory reset — wipe all data so the install can be handed to a new customer

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

// Mirror index.ts resolution so we clear the dirs the app actually uses
const dataDirArg = process.argv.find((arg) => arg.startsWith('--data-dir='));
const DATA_DIR = dataDirArg
  ? dataDirArg.split('=')[1]
  : process.env.DATA_DIR || path.join(process.cwd(), 'data');

function candidateDirs(kind: 'backups' | 'reports'): string[] {
  const envDir = process.env[kind === 'backups' ? 'BACKUP_DIR' : 'REPORT_DIR'];
  const dirs = [
    envDir,
    path.join(DATA_DIR, kind),
    path.resolve(__dirname, `../../${kind}`), // dev/dist fallback → backend/<kind>
  ].filter((d): d is string => Boolean(d));
  return Array.from(new Set(dirs.map((d) => path.resolve(d))));
}

function clearDirs(dirs: string[]): number {
  let removed = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      try {
        fs.unlinkSync(path.join(dir, file));
        removed++;
      } catch {
        // ignore locked files — DB rows are already gone
      }
    }
  }
  return removed;
}

export interface FactoryResetResult {
  backupsCleared: number;
  reportsCleared: number;
}

// ============================================================
// FACTORY RESET - delete everything, re-create the admin login
// ============================================================
export async function factoryReset(): Promise<FactoryResetResult> {
  await prisma.$transaction(async (tx) => {
    await tx.stock_audit_lines.deleteMany();
    await tx.stock_audits.deleteMany();
    await tx.transaction_items.deleteMany();
    await tx.transactions.deleteMany();
    await tx.item_aliases.deleteMany();
    await tx.items.deleteMany();
    await tx.categories.deleteMany();
    await tx.persons.deleteMany();
    await tx.machines.deleteMany();
    await tx.departments.deleteMany();
    await tx.suppliers.deleteMany();
    await tx.users.deleteMany();
  });

  // Re-create the default login so the app stays accessible
  const passwordHash = await bcrypt.hash('S123T', 10);
  await prisma.users.create({
    data: {
      username: 'STORE ADMIN',
      password_hash: passwordHash,
      full_name: 'Store Admin',
      role: 'ADMIN',
    },
  });

  const backupsCleared = clearDirs(candidateDirs('backups'));
  const reportsCleared = clearDirs(candidateDirs('reports'));

  console.log(
    `🏭 Factory reset complete — backups: ${backupsCleared}, reports: ${reportsCleared} files cleared`
  );
  return { backupsCleared, reportsCleared };
}
