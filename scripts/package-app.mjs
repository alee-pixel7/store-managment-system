#!/usr/bin/env node
// ============================================================
// package-app.mjs — stages the installable app bundle at
// src-tauri/bundle/ :
//
//   bundle/
//   ├── bin/node(.exe)          portable Node runtime
//   ├── backend/dist/           compiled backend
//   ├── backend/node_modules/   production deps (Prisma engines included)
//   ├── backend/package.json
//   ├── frontend/dist/          built frontend
//   └── template.db             fresh DB (migrate + seed) copied on first run
//
// Run AFTER: backend build + frontend build.
// Usage: node scripts/package-app.mjs [--skip-node] [--skip-template] [--no-prune]
// ============================================================

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const BUNDLE = path.join(ROOT, 'src-tauri', 'bundle');

const NODE_VERSION = process.env.NODE_VERSION || '24.18.0';
const args = new Set(process.argv.slice(2));

const log = (...m) => console.log('[package]', ...m);
const die = (...m) => {
  console.error('[package] ERROR:', ...m);
  process.exit(1);
};

function run(cmd, cmdArgs, opts = {}) {
  const isWin = process.platform === 'win32';
  // Windows: npm/npx are .cmd shims (need shell); tar and friends are .exe —
  // blindly appending .cmd breaks them ("'tar.cmd' is not recognized").
  const isShim = /^(npm|npx|pnpm|yarn)$/.test(cmd);
  const res = spawnSync(isWin && isShim ? `${cmd}.cmd` : cmd, cmdArgs, {
    stdio: 'inherit',
    encoding: 'utf8',
    shell: isWin && isShim,
    ...opts,
  });
  if (res.status !== 0) {
    die(`command failed: ${cmd} ${cmdArgs.join(' ')}`);
  }
  return res;
}

function dirSize(p) {
  let total = 0;
  const walk = (cur) => {
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const fp = path.join(cur, e.name);
      if (e.isDirectory()) walk(fp);
      else {
        try {
          total += fs.statSync(fp).size;
        } catch { /* ignore */ }
      }
    }
  };
  try {
    walk(p);
  } catch { /* ignore */ }
  return total;
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ── 0. Sanity: builds must exist ────────────────────────────
if (!fs.existsSync(path.join(BACKEND, 'dist', 'index.js'))) {
  die('backend/dist/index.js missing — run: cd backend && npm run build');
}
if (!fs.existsSync(path.join(FRONTEND, 'dist', 'index.html'))) {
  die('frontend/dist/index.html missing — run: cd frontend && npm run build');
}

// ── 1. Fresh template DB (migrate + seed) ───────────────────
if (!args.has('--skip-template')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-template-'));
  const dbPath = path.join(tmp, 'template.db');
  const env = {
    ...process.env,
    // Prisma's expected file: URL — NOT pathToFileURL (which makes file:///C:/...
    // on Windows and gets rejected; Prisma wants file:C:/... / file:/abs/path)
    DATABASE_URL:
      process.platform === 'win32'
        ? 'file:' + dbPath.replace(/\\/g, '/')
        : 'file:' + dbPath,
  };
  log('template DB: migrate deploy ...');
  run('npx', ['prisma', 'migrate', 'deploy'], { cwd: BACKEND, env });
  log('template DB: seed (admin + departments + 34 machines) ...');
  run('npx', ['prisma', 'db', 'seed'], { cwd: BACKEND, env });
  if (!fs.existsSync(dbPath)) die('template DB was not created');
  fs.mkdirSync(BUNDLE, { recursive: true });
  fs.copyFileSync(dbPath, path.join(BUNDLE, 'template.db'));
  fs.rmSync(tmp, { recursive: true, force: true });
  log('template.db ready');
} else {
  log('template DB skipped (--skip-template)');
}

// ── 2. Clean staging dirs (keep template.db) ────────────────
for (const sub of ['bin', 'backend', 'frontend']) {
  fs.rmSync(path.join(BUNDLE, sub), { recursive: true, force: true });
}
fs.mkdirSync(path.join(BUNDLE, 'bin'), { recursive: true });
fs.mkdirSync(path.join(BUNDLE, 'backend'), { recursive: true });
fs.mkdirSync(path.join(BUNDLE, 'frontend'), { recursive: true });

// ── 3. Copy app artifacts ───────────────────────────────────
log('copying backend dist + frontend dist ...');
fs.cpSync(path.join(BACKEND, 'dist'), path.join(BUNDLE, 'backend', 'dist'), {
  recursive: true,
});
fs.cpSync(path.join(FRONTEND, 'dist'), path.join(BUNDLE, 'frontend', 'dist'), {
  recursive: true,
});
fs.copyFileSync(
  path.join(BACKEND, 'package.json'),
  path.join(BUNDLE, 'backend', 'package.json')
);
if (fs.existsSync(path.join(BACKEND, 'package-lock.json'))) {
  fs.copyFileSync(
    path.join(BACKEND, 'package-lock.json'),
    path.join(BUNDLE, 'backend', 'package-lock.json')
  );
}

// ── 4. node_modules (production only) ───────────────────────
log('copying node_modules (large) ...');
fs.cpSync(path.join(BACKEND, 'node_modules'), path.join(BUNDLE, 'backend', 'node_modules'), {
  recursive: true,
  dereference: true,
});

if (!args.has('--no-prune')) {
  log('pruning devDependencies from bundle copy ...');
  run('npm', ['prune', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: path.join(BUNDLE, 'backend'),
  });
  // npm prune may drop the generated Prisma client (.prisma) — restore it
  const srcPrisma = path.join(BACKEND, 'node_modules', '.prisma');
  const dstPrisma = path.join(BUNDLE, 'backend', 'node_modules', '.prisma');
  if (fs.existsSync(srcPrisma)) {
    fs.cpSync(srcPrisma, dstPrisma, { recursive: true, dereference: true });
    log('Prisma client restored after prune');
  } else {
    die('.prisma client missing in backend/node_modules — run: cd backend && npx prisma generate');
  }
}

// ── 5. Portable Node runtime ────────────────────────────────
if (!args.has('--skip-node')) {
  const plat = process.platform;
  const arch = process.arch; // x64 on CI
  if (!['win32', 'linux'].includes(plat) || arch !== 'x64') {
    die(`unsupported platform for portable node: ${plat}/${arch} (use --skip-node)`);
  }
  const ext = plat === 'win32' ? 'zip' : 'tar.xz';
  const folder = `node-v${NODE_VERSION}-${plat === 'win32' ? 'win' : 'linux'}-x64`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${folder}.${ext}`;
  const cache = path.join(ROOT, 'tmp', 'node-dist');
  const archive = path.join(cache, `${folder}.${ext}`);

  if (!fs.existsSync(archive)) {
    log(`downloading ${url} ...`);
    fs.mkdirSync(cache, { recursive: true });
    const res = await fetch(url);
    if (!res.ok) die(`download failed: ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(archive, buf);
    log(`downloaded ${mb(buf.length)}`);
  } else {
    log('using cached node archive');
  }

  const extractDir = path.join(cache, folder);
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  log('extracting ...');
  run('tar', ['-xf', archive, '-C', cache]);

  const nodeSrc =
    plat === 'win32'
      ? path.join(cache, folder, 'node.exe')
      : path.join(cache, folder, 'bin', 'node');
  if (!fs.existsSync(nodeSrc)) die(`extracted node not found: ${nodeSrc}`);
  const nodeDst = path.join(BUNDLE, 'bin', plat === 'win32' ? 'node.exe' : 'node');
  fs.copyFileSync(nodeSrc, nodeDst);
  if (plat !== 'win32') fs.chmodSync(nodeDst, 0o755);
  log(`bundled ${path.basename(nodeDst)}`);
} else {
  log('portable node skipped (--skip-node)');
}

// ── 6. Summary ──────────────────────────────────────────────
log('--- bundle summary ---');
for (const sub of ['bin', 'backend', 'frontend', 'template.db']) {
  const p = path.join(BUNDLE, sub);
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    log(`${sub}: ${mb(st.isDirectory() ? dirSize(p) : st.size)}`);
  }
}
log('done. bundle ready at src-tauri/bundle/');
