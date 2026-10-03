# Store Management System

Complete inventory management system for machine-parts stores. Replaces Excel-based tracking with a modern web application. Runs locally on PC with WiFi access for phone use.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, framer-motion, Recharts |
| Backend | Node.js, Express, Prisma ORM |
| Database | SQLite |
| Auth | JWT (12hr expiry, persisted secret), bcryptjs |
| PDF | PDFKit (premium Noir + Amethyst theme) |
| Excel | ExcelJS (styled workbooks — banners, borders, frozen panes) |
| Desktop | Tauri 2 (offline — double-click .exe/.deb, auto-start backend) |

## Login

| Field | Value |
|-------|-------|
| URL (single-port / production) | `http://localhost:5000` |
| URL (dev mode) | `http://localhost:3000` |
| Username | `STORE ADMIN` |
| Password | `S123T` |

Phone access: `http://<your-PC-IP>:5000` (single-port) or `:3000` (dev)

**Single-port mode:** after `cd frontend && npm run build`, the backend serves the built
frontend on port 5000 — one process, one port, no Vite needed. In dev mode (build output
absent), keep using Vite on 3000 as before.

---

## Features — Complete List

### 1. Dashboard (Premium)

- **Greeting header** with user name + live date/time
- **Quick summary banner** — total items, stock in today, issued today, alerts
- **4 big stat cards** — total items (📦), stock in (📥), issued out (📤), low stock (⚠️)
- **2 wide activity cards** — Stock In Today, Issued Out Today (clickable → Stock In / Issue pages)
- **Recent Activity** — timeline design with colored dots + vertical line + emoji type badges
- **Low Stock Alert** — premium empty state with animated shield + glow; stock level progress bars (green/yellow/red)
- All stat cards clickable → navigate to relevant pages

### 2. Items Management

- View all items in a searchable, filterable table
- Add/edit/soft-delete items
- **Manual stock edit** — the Edit modal has a Current Stock field; saving a changed
  value writes a signed **ADJUST** transaction ("Manual stock edit"), never a bare
  column update. Unchanged value → no transaction. Negative stock allowed, empty/NaN
  blocked (STORE_INCHARGE+)
- **Spec / Value column** — `spec` field (Amp, Volt, Size, Model...) shown in a
  288px "Value / Unit" table column, the item detail card, exports, and searchable
  in both browse and smart-search modes
- View item detail with full transaction history (ledger)
- Smart fuzzy search — matches code, name, brand, **spec**, aliases (ignores spaces, dashes, case)
- 31 categories with item counts
- Export items list as Excel or PDF (includes Spec / Unit column)

### 2b. Dates — Day-First Everywhere

- Display format: **`26 Sep 2026`** (day-first) across pages, reports, exports, PDFs
- Shared helpers: `frontend/src/lib/dates.ts` + `backend/src/utils/dates.ts`
  (`formatDate`, `formatDateLong`, `formatDateTime`, `formatDateShort`, `todayISO`)
- **Custom DateField** replaces every native `type="date"` (Stock In/Out/Return forms,
  Daily Report, Item Detail): type `29-09-2026` / `29 Sep 2026`, plus a dark portal
  calendar popup (month/year nav, today ring, violet selection, Escape/click-outside close)
- Filenames and API payloads stay ISO (`2026-09-26`)
- `todayISO()` is timezone-safe (no UTC day-shift before 5:30 AM IST)

### 3. Stock IN (Receipts)

- Record incoming stock from suppliers
- Fields: Date, Supplier, Invoice Number, Remarks
- Multiple line items per transaction (Item search, Quantity, Rate, Remarks)
- Auto-generates `IN-2026-0001` format
- **Premium form:** spacious 2-column layout, elevated card, icon-prefix inputs, gradient table header, animated toasts
- Recent 10 transactions in premium sidebar

### 4. Stock OUT (Issue)

- Issue stock to people/departments
- Fields: Date, Issued To, Department, Machine, Purpose, Remarks
- **Negative stock allowed** with confirmation dialog (spring animation)
- Auto-generates `OUT-2026-0001` format
- **Premium form:** spacious 2-column layout, elevated card, icon-prefix inputs, gradient table header, animated toasts
- **34 pre-seeded machines** across 8 departments (Printing, Bag Making, Lamination, Slitting, Extruder, Metalizer, Hologram, UV Machine)
- **Custom dropdown** with portal rendering — no overflow clipping, chevron toggle, min-width 280px for long names

### 5. Stock Return

- Record items returned by people/departments back into stock
- Fields: Date, Supplier (optional), Remarks
- Multiple line items per transaction
- Auto-generates `RETURN-2026-0001` format
- **Premium form:** danger-tinted save button, elevated cards, animated toasts

### 6. Stock Reversal

- Correct mistakes without deleting original transactions
- Creates a REVERSAL transaction that offsets the original
- Original marked as `is_reversed = true`
- **Reverse by transaction number** (POST `/api/transactions/by-no/reverse`)
- Negative stock block with **force override** option (red warning dialog)

### 7. Reports

**Daily Report:**
- Date picker → generates receipts, issues, items below minimum
- Summary cards with icons
- **Reverse button** per receipt/issue row with confirmation dialog
- Export: Excel / PDF / Print

**Monthly Report:**
- Month/year picker → department consumption, machine consumption, top 20 items, out-of-stock
- Summary cards with icons
- Export: Excel / PDF / Print

### 8. Export (Premium PDFs + Excel)

**Unified "Noir + Amethyst" design (PDF & Excel match the app theme):**

PDF design:
- Noir (`#141026`) title bar + violet accent strip + rounded "S" logo tile
- Short violet underline under the report title
- 2x2 KPI summary cards with colored accent bars
- Violet section markers + violet table headers (`#8B5CF6`)
- Soft amethyst zebra rows, hairline borders, colored section accents (green/red/amber)
- Compact footer — accent line + store name + `Page X of Y` + date (**no blank pages**)

Excel design:
- Noir title banner row + lavender subtitle (merged cells)
- Violet header row with wrapped text, thin borders, zebra data rows
- Currency / integer number formats (`#,##0.00`, `#,##0`), right-aligned numbers
- Frozen panes (header stays visible), autoFilter, violet sheet tabs
- Summary sheet with label/value metrics

| Export | Format | Access |
|--------|--------|--------|
| Items List | Excel / PDF | Items page |
| Daily Report | Excel / PDF | Reports → Daily |
| Monthly Report | Excel / PDF | Reports → Monthly |
| Item Ledger | Excel / PDF | Item Detail → Ledger |

### 9. Import System

- Multi-sheet Excel import with column mapping
- Daily Report import with fuzzy item matching
- Validate before importing
- Import items, stock transactions, and daily reports

### 10. Physical Stock Audit

- Start audit → system snapshots current stock
- Count items physically (mobile-friendly)
- Color-coded variance (green = match, red = mismatch)
- Finalise → auto-generates ADJUST transactions

### 11. Analytics (Premium — 5 Views)

**Premium dark design** with animated tab bar, gradient charts, stagger-animated tables:

| View | What it shows |
|------|---------------|
| Stock Value Trend | 12-month stock value line chart with violet/green/red gradient lines |
| Item Consumption Trend | Per-item line chart over 12 months (searchable) |
| Machine-wise Consumption | Bar chart comparing machines (violet + green gradients) |
| Unusual Consumption | Machines >50% above 6-month average (danger-highlighted) |
| Dead Stock | Items with no movement — 90/180/365 day filters, tied-up value |
| Smart Reorder Points | Suggested min_stock based on consumption + lead time |

### 12. Backup System

- Automatic backup on startup + every 24 hours
- Max 3 backups per day, 30-day retention
- Manual backup via Settings
- Download backup files
- **Restore from backup** with safety backup + confirmation ("RESTORE" to confirm)
- **Path traversal protection** on download endpoint
- **Prisma reconnect** after restore (no stale state)

### 13. Authentication & Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Everything + Settings + Delete master data + Factory Reset |
| STORE_INCHARGE | Stock ops + Reversals + Items CRUD + Reorder accept |
| ASSISTANT | Stock IN/OUT + View reports |
| VIEWER | Read only |

- JWT persisted to disk (survives server restarts)
- 12hr token expiry
- Role-based access control on all routes

### 14. Noir + Amethyst Theme (Desktop Left Sidebar)

**Design system — deep noir surfaces + electric violet accent:**

| Element | Color | Usage |
|---------|-------|-------|
| Base | `#07080B` | Page background |
| Surface | `#0E1015` | Sidebar, cards, panels |
| Elevated | `#15181F` | Modals, dropdowns |
| Accent | `#8B5CF6` | Buttons, active nav, links, highlights (violet) |
| Accent text | `#A78BFA` | Readable violet on dark |
| OK | `#4ADE80` | Stock ok (green) |
| Low | `#F59E0B` | Low stock (amber) |
| Danger | `#EF4444` | Out of stock (red) |

**Layout:**
- **Fixed left sidebar (260px, desktop)** — logo, grouped nav (Main / Operations /
  Insights / Admin), collapsible Reports group, user card + logout; scrollable when
  tall (`min-h-0`), violet active pill with glow
- **Mobile keeps the bottom navigation** with animated active indicator + glass popup
- Content area padded `pl-[260px]` (`print:pl-0` for clean A4 prints)

**Component system (`@layer components` in `index.css`):**
- `.btn` family — `btn-primary` (violet gradient), `btn-outline`, `btn-ghost`,
  `btn-solid`, `btn-danger`, `btn-danger-outline`, sizes `btn-sm/md/lg`
- `.card` / `.card-elevated` / `.card-hover` / `.card-accent-top` — static panels use
  cards; only floating layers (dropdowns, toasts, calendar, search) stay glass
- `.input` — unified dark input/select/textarea with violet focus ring
- `.sidebar-link` / `.sidebar-link-active`, `.table-head`, `.table-row-hover`, `.num`
- All component classes live in `@layer components`, so Tailwind utilities always
  override them (cascade layers beat specificity)
- Violet glow shadows (`--shadow-glow*`), violet text selection, violet focus ring

**Features:**
- framer-motion page transitions, stagger animations, spring dialogs
- Animated number count-up on stat cards
- **Custom Dropdown component** — portal-rendered, overflow-safe, chevron toggle, click-outside close, Escape key
- **Custom DateField** — day-first input + dark portal calendar (violet selection)
- Mobile responsive with bottom navigation + animated indicator
- Print stylesheet (clean A4, no UI elements)
- Service worker disabled in dev mode (prevents stale CSS)

### 15. Safe Delete & Factory Reset (ADMIN only)

**Delete options for master data** — 🗑 Manage modal next to every `+` quick-add:

| Where | Manage button | Delete targets |
|-------|---------------|----------------|
| Items page → "Categories" | Manage Categories | Categories |
| Stock In → Supplier field | 🗑 | Suppliers |
| Stock In/Out → Person field | 🗑 | Persons |
| Stock Out → Department field | 🗑 | Departments |
| Stock Out → Machine field | 🗑 | Machines |

- Hover row → **Edit / Delete**, `window.confirm` before delete
- **Block-if-in-use:** Suppliers / Persons / Departments / Machines delete karne par API
  **409** return karta hai agar record kisi transaction se linked ho — history kabhi
  orphan nahi hoti
- **Categories:** delete par items uncategorized ho jaate hain (`reassigned` count
  return hota hai) — items delete nahi hote
- Transaction history is **never hard-deleted** (only reversals, by design)

**Factory Reset** (Settings → Danger Zone):
- Wipes **everything**: items, categories, aliases, transactions, audits, suppliers,
  departments, machines, persons, **users**, plus backup + report files on disk
- Re-creates only `STORE ADMIN` / `S123T` (fresh-DB state)
- Type **`RESET`** to enable the button (double confirmation)
- API: `POST /api/admin/factory-reset` (ADMIN)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Setup Database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 3. Import Real Data (optional)

Place Excel files in `exel file/` directory, then:

```bash
cd backend
node src/scripts/reimport-clean.js
node src/scripts/dedupe-items.js
node src/scripts/verify-sections.js
node src/scripts/fix-recalc-mismatch.js
```

### 4. Start Development Servers

```bash
# Option A — One command
npm run dev

# Option B — Two terminals
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

### 5. Single-Port Production Mode

```bash
cd frontend && npm run build   # outputs frontend/dist
cd ../backend && npm run dev   # backend now serves the app on :5000
```

Open `http://localhost:5000`. The backend serves `frontend/dist` with SPA fallback
when the build exists; unknown `/api` paths still return JSON 404.

### 6. Login

Open `http://localhost:5000` (or `:3000` in dev):
- Username: `STORE ADMIN`
- Password: `S123T`

### Phone Access (WiFi)

Backend listens on `0.0.0.0:5000`. Open in phone browser:
```
http://<your-PC-IP>:5000     # single-port mode
http://<your-PC-IP>:3000     # dev mode (Vite)
```

Find your PC IP: `ip addr show` or `hostname -I`

---

## Maintenance Scripts

All scripts are idempotent (safe to re-run) and self-verify. Recommended cycle after a
fresh import:

```bash
cd backend
node src/scripts/reimport-clean.js        # 1. import from master Excel
node src/scripts/dedupe-items.js          # 2. merge duplicates
node src/scripts/verify-sections.js       # 3. Excel vs DB section check
node src/scripts/fix-recalc-mismatch.js   # 4. heal stock/ledger drift
```

| Script | What it does | Self-verify |
|--------|--------------|-------------|
| `reimport-clean.js` | Reads `exel file/` master workbook, builds items/categories/transactions | Summary counts |
| `dedupe-items.js` | Merges only same-category + same-name + same-spec duplicates; keeper = most txns → highest stock → lowest code; stock summed, txns reassigned, dupes soft-deleted | 0 duplicate groups |
| `verify-sections.js` | Compares every sheet's categories/stock against the DB (adaptive header detection); clear message if master Excel missing | categories + stock match |
| `fix-recalc-mismatch.js` | For each item where `current_stock ≠ recalc`, creates ONE signed ADJUST with the delta (never touches the column directly) | mismatch = 0 |

`--dry-run` flag supported on `dedupe-items.js` and `fix-recalc-mismatch.js`.

**Rules encoded in `dedupe-items.js`:**
- Same name with different spec/notes = different items (SINGLE POLE 10A vs 6A, HEATER sizes) — never merged
- Cross-category pairs left alone (machine-specific parts)
- Duplicates are soft-deleted (`is_active=false`), never hard-deleted

---

## Windows Auto-Start Launchers

For a Windows deployment where the app starts at login with no console windows:

| File | Role |
|------|------|
| `auto-start.ps1` | Starts the backend hidden at login. Named mutex (only one instance), TCP health-check on `127.0.0.1`, log rotation (`server.err.log` → `.old`), waits up to 30s for health. Runs `dist/index.js` if built, else `ts-node`. |
| `open-app.ps1` | Desktop icon entry: ensures backend is up (calls `auto-start.ps1`), waits up to 4s, shows `show-starting.vbs` popup if still booting (cold boot 6–20s), then opens `http://localhost:5000`. On failure opens `server.err.log` in Notepad. |
| `run-hidden.vbs` | Runs any `.ps1` with no PowerShell window (`wscript run-hidden.vbs script.ps1`). |
| `show-starting.vbs` | "Starting..." info popup, auto-dismisses after 25s. |

Setup: put a shortcut to `open-app.ps1` on the desktop and a shortcut to
`auto-start.ps1` in `shell:startup`. Logs land in `backend\logs\`.

> Note: these scripts were written on Linux and are syntax-reviewed but **not
> executed here** — first run should be verified on the Windows machine.

---

## Linux Shortcuts (login auto + desktop icon)

| File | Role |
|------|------|
| `start-app.sh` | Single entry point: health-check → start backend hidden if down (PID file + log rotation, 30s boot wait) → open browser. Already running → skips. `--no-browser` for autostart. Subcommands: `status`, `stop` (SIGINT→SIGKILL, all pids), `restart`. Failures surface as KDE/desktop notifications (`.desktop` runs without a terminal). |
| `store-management.desktop` | Template — `install-shortcut.sh` writes the absolute (space-quoted) Exec path. |
| `install-shortcut.sh` | Idempotent installer: menu entry (`~/.local/share/applications`), desktop icon (`~/Desktop`, executable), login autostart (`~/.config/autostart`, `--no-browser` = backend only), app icon (hicolor), `desktop-file-validate` + menu DB refresh. `--uninstall` removes all. |

```bash
./install-shortcut.sh        # install (safe to re-run)
./start-app.sh status        # running? pid, port
./start-app.sh stop          # graceful stop
./install-shortcut.sh --uninstall
```

- Double-click desktop icon → backend start (if needed) + browser opens `http://localhost:5000`
- Login → backend starts hidden (no browser)
- Repo path contains spaces — Exec values are quoted; the script self-locates, so it works from anywhere

---

## Offline Installers (Windows + Linux)

Har **push pe GitHub Actions** automatically dono platforms ke offline installers
build karta hai (`.github/workflows/build.yml`) — internet sirf build ke waqt
(Actions runner) chahiye, **install ke waqt bilkul nahi**.

| Platform | Installer | Kaise banega |
|----------|-----------|--------------|
| Windows 10/11 | `Store.Management.System_1.0.0_x64-setup.exe` (NSIS) | Actions → *windows-installer* artifact, ya Release |
| Ubuntu/Debian | `Store.Management.System_1.0.0_amd64.deb` | Actions → *linux-installers* artifact, ya Release |
| Fedora/RHEL/openSUSE | `Store.Management.System-1.0.0-1.x86_64.rpm` | Same artifact |
| Any Linux | `Store.Management.System_1.0.0_amd64.AppImage` | Same artifact |

**Release flow:** `git tag v1.0.0 && git push origin v1.0.0` → installers
Release me attach → download → `setup/windows/` + `setup/linux/` folders me daalein
(USB ke liye ready; ye folders gitignored hain — details `setup/README.md` me).

**Kaise banta hai package** (`scripts/package-app.mjs):
- `src-tauri/bundle/` me staging: portable **Node runtime** (nodejs.org se), backend
  `dist` + **production node_modules** (Prisma engines samet), `frontend/dist`
- **Fresh `template.db`** — CI me `prisma migrate deploy` + seed (STORE ADMIN,
  11 departments, 34 machines) → pehli baar app chalne pe app-data me copy hota hai
- Tauri app (`src-tauri/src/lib.rs`) bundled Node se backend launch karta hai,
  health ready hone pe window `http://localhost:5000` load karti hai — app
  **same-to-same** chalta hai (single-port behavior, wahi login, wahi data flow)

**Install ke baad (target PC):**
- Fresh DB — login `STORE ADMIN` / `S123T`, 0 items, 34 machines ready
- Data location: Windows `%APPDATA%\Store Management System\`, Linux `~/.local/share/com.storemanagement.app/`
- Purana data → Settings → Backup → Restore
- Windows SmartScreen warning: **More info → Run anyway** (installer unsigned hai)

**Local build (bina CI):**
```bash
npm run build:frontend && npm run build:backend
node scripts/package-app.mjs      # bundle stage karta hai
npx tauri build                   # Rust + NSIS/deb toolchain chahiye
```

---

## Troubleshooting — Windows

### Upgrade ke baad app purana lag raha hai (purane exports/design)

**Wajah:** Agar app install karte waqt purana backend (`node.exe`, port 5000) abhi
bhi chal raha hai toh naya app use reuse kar leta tha — purana code hi serve hota
rahta hai. **Ab fix hai** — app startup pe:

1. `backend.pid` file se orphaned node process kill karta hai
2. `/api/health` ka **version** check karta hai — same version pe hi reuse,
   warna stale backend **kill + replace** karta hai
3. Har decision `backend.log` me likhta hai

**Manual fix (kisi bhi version pe):** PC reboot — ya Task Manager me saare
`node.exe` end task → app dobara kholo.

**Diagnostics:** `%APPDATA%\com.storemanagement.app\backend.log`

| Log line | Matlab |
|----------|--------|
| `Existing backend on :5000 detected — reusing it (v1.0.0)` | Sahi — same version reuse |
| `Stale backend on :5000 (...) — replacing it` | Purana backend mila, kill ho gaya ✓ |
| `Killing orphaned backend from previous run (pid N)` | Force-kill ka orphan saaf hua ✓ |
| `Backend spawned (pid N)` | Naya backend chal raha hai ✓ |
| `WARNING: :5000 still busy after stale kill` | Koi non-node process port pakde hai — wo process band karein |

---

## Project Structure

```
store management system/
├── auto-start.ps1                    # Windows: hidden backend start at login (mutex + health-check)
├── open-app.ps1                      # Windows: desktop entry — start backend, open browser
├── run-hidden.vbs                    # Windows: run a .ps1 with no console window
├── show-starting.vbs                 # Windows: "Starting..." popup (25s auto-dismiss)
├── .github/workflows/build.yml       # CI: auto-build Windows (NSIS) + Linux (deb/AppImage) installers
├── scripts/package-app.mjs           # Stages src-tauri/bundle (portable node + prod deps + template.db)
├── setup/                            # Local folders for installers (gitignored, see setup/README.md)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (13 tables, items.spec added)
│   │   ├── dev.db                 # SQLite database
│   │   └── seed.ts                # Admin user + 11 departments + 34 machines (fresh-DB template)
│   ├── src/
│   │   ├── index.ts               # Express entry + single-port static serving + graceful shutdown
│   │   ├── lib/prisma.ts          # Prisma singleton client
│   │   ├── middleware/auth.ts     # JWT auth + role checks
│   │   ├── services/
│   │   │   ├── itemService.ts     # CRUD + manual stock edit (signed ADJUST) + spec search
│   │   │   ├── transactionService.ts   # Stock IN/OUT/Return/Reversal (by ID + by txn_no)
│   │   │   ├── reportService.ts        # Daily report (correct stock calculation)
│   │   │   ├── monthlyReportService.ts # Monthly report (correct stock calculation)
│   │   │   ├── dashboardService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── reorderService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── backupService.ts        # Path traversal protected
│   │   │   ├── importService.ts
│   │   │   ├── pdfExportService.ts     # Premium Noir+Amethyst PDFs (day-first dates, Spec/Unit col)
│   │   │   ├── excelExportService.ts   # Premium Noir+Amethyst workbooks (banners, borders, frozen panes)
│   │   │   ├── adminService.ts         # Factory reset (wipe all + re-create STORE ADMIN)
│   │   │   └── authService.ts          # Persisted JWT secret
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── validations/
│   │   ├── utils/stock.ts              # recalculateStock, generateTxnNo
│   │   ├── utils/dates.ts              # Day-first date helpers (backend twin)
│   │   └── scripts/
│   │       ├── reimport-clean.js       # Master Excel import
│   │       ├── dedupe-items.js         # Safe duplicate merge (self-verify)
│   │       ├── verify-sections.js      # Excel vs DB section check
│   │       └── fix-recalc-mismatch.js  # Signed-ADJUST ledger heal (self-verify)
│   └── backups/                        # Automatic backups
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Left sidebar shell, routing, AnimatePresence
│   │   ├── index.css                   # Noir+Amethyst tokens, @layer components (.btn/.card/.input/.sidebar-link)
│   │   ├── lib/motion.ts               # Animation presets
│   │   ├── lib/dates.ts                # Day-first date helpers (single source of truth)
│   │   ├── api/                        # API clients (authFetch wrapper)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── hooks/                      # useDebounce, useIsMobile
│   │   └── components/
│   │       ├── ui/DateField.tsx        # Day-first input + dark calendar popup
│   │       ├── Auth/LoginPage.tsx       # Premium login (aurora + violet glows)
│   │       ├── Dashboard/              # Premium dashboard (4+2 layout)
│   │       ├── Items/                  # Items page + detail + ledger + Value/Unit col
│   │       ├── Transactions/           # Stock In/Out/Return (premium forms, DateField, 🗑 manage modals)
│   │       ├── Reports/                # Daily + Monthly (with reverse)
│   │       ├── Import/ImportWizard.tsx
│   │       ├── Settings/BackupSettings.tsx
│   │       ├── Settings/DangerZone.tsx # Factory Reset (type RESET to confirm)
│   │       ├── Audit/                  # Physical audit
│   │       ├── Analytics/AnalyticsPage.tsx
│   │       ├── Reorder/ReorderPointsPage.tsx
│   │       └── Layout/                 # MobileNav, LoadingScreen
│   └── public/
│       ├── sw.js                       # Service worker (dev-aware)
│       ├── manifest.json               # Dark theme PWA manifest
│       └── offline.html                # Dark offline page
│
├── src-tauri/                          # Tauri desktop app
│   ├── src/lib.rs                      # Sidecar backend spawn + health polling
│   ├── tauri.conf.json                 # Window config + NSIS installer
│   ├── Cargo.toml                      # Rust dependencies
│   └── icons/                          # App icons (noir + amethyst "S" theme)
└── exel file/                          # User's Excel files (all stock new.xlsx = master)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List (pagination, search, `low_stock`, `out_of_stock` filters) |
| GET | `/api/items/:id` | Item detail |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Soft delete |
| GET | `/api/items/search?q=` | Smart fuzzy search |
| GET | `/api/items/categories` | Categories with counts |
| DELETE | `/api/items/categories/:id` | Delete category (ADMIN — items get uncategorized) |
| GET | `/api/items/:id/ledger` | Ledger with running balance |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (filter: `txn_type=IN,OUT,ADJUST,RETURN,REVERSAL`) |
| POST | `/api/transactions/in` | Stock IN |
| POST | `/api/transactions/out` | Stock OUT (allows negative stock) |
| POST | `/api/transactions/return` | Stock Return |
| POST | `/api/transactions/:id/reverse` | Reverse by ID |
| POST | `/api/transactions/by-no/reverse` | Reverse by txn_no (with `force` option) |
| GET/POST | `/api/transactions/suppliers` | List/Create suppliers |
| GET/POST | `/api/transactions/persons` | List/Create persons |
| GET/POST | `/api/transactions/departments` | List/Create departments |
| GET/POST | `/api/transactions/machines` | List/Create machines |
| DELETE | `/api/transactions/suppliers/:id` | Delete supplier (ADMIN, 409 if in use) |
| DELETE | `/api/transactions/persons/:id` | Delete person (ADMIN, 409 if in use) |
| DELETE | `/api/transactions/departments/:id` | Delete department (ADMIN, 409 if in use) |
| DELETE | `/api/transactions/machines/:id` | Delete machine (ADMIN, 409 if in use) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/factory-reset` | Wipe all data + files, re-create STORE ADMIN (ADMIN, type `RESET` to confirm) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report data |
| GET | `/api/reports/monthly?year=&month=` | Monthly report data |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/daily/:date?format=excel\|pdf` | Export daily report |
| GET | `/api/export/monthly/:year/:month?format=excel\|pdf` | Export monthly report |
| GET | `/api/export/items?format=excel\|pdf` | Export items list |
| GET | `/api/export/ledger/:itemId?format=excel\|pdf` | Export item ledger |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Stats + recent transactions |

### Backup
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/backup/now` | Create manual backup |
| GET | `/api/backup/list` | List backups |
| GET | `/api/backup/download/:filename` | Download backup (path traversal protected) |
| POST | `/api/backup/restore/:filename` | Restore from backup (ADMIN only, safety backup + mutex) |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import/parse` | Parse Excel file |
| POST | `/api/import/validate-items` | Validate item data |
| POST | `/api/import/items` | Import items |
| POST | `/api/import/stock` | Import stock transactions |
| POST | `/api/import/daily-report` | Import daily report |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audits` | List audits |
| POST | `/api/audits` | Start new audit |
| GET | `/api/audits/:id` | Audit detail |
| POST | `/api/audits/:id/count` | Count an item |
| POST | `/api/audits/:id/finalise` | Finalise (creates ADJUST transactions) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/consumption-trend` | Per-item consumption |
| GET | `/api/analytics/machine-consumption` | Machine comparison |
| GET | `/api/analytics/unusual-consumption` | Flag anomalies |
| GET | `/api/analytics/dead-stock` | Items with no movement |
| GET | `/api/analytics/stock-value-trend` | 12-month trend |

### Reorder
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reorder/suggestions` | Suggested min_stock |
| POST | `/api/reorder/accept/:itemId` | Accept suggestion |
| POST | `/api/reorder/accept-bulk` | Bulk accept |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (public) |

---

## Database Schema

13 tables:

| Table | Purpose |
|-------|---------|
| `users` | Login credentials, roles |
| `categories` | Item categories (31) |
| `items` | Main inventory (989 active items, incl. `spec` column) |
| `item_aliases` | Alternative names for search |
| `suppliers` | Vendors with lead_time_days |
| `departments` | Organization units (11) |
| `machines` | Equipment linked to departments (34 pre-seeded) |
| `persons` | People receiving material (92) |
| `transactions` | Header — type, date, creator (980 total, 882 ADJUST) |
| `transaction_items` | Line items — item, quantity, rate |
| `stock_audits` | Audit sessions |
| `stock_audit_lines` | Item counts within audits |

> Counts are from the working DB after running `dedupe-items.js` + `fix-recalc-mismatch.js`
> (2026-10-01). They will shift after the next master-Excel import (`reimport-clean.js`).

**Stock calculation:** `current_stock` maintained by `recalculateStock()` — IN/RETURN add, OUT subtract, ADJUST/REVERSAL signed. Correct type-aware calculation (not raw sum). Manual edits from the item modal and the maintenance scripts always go through signed ADJUST transactions, so displayed stock and ledger never drift.

---

## Security Features

- **JWT persisted to disk** — survives server restarts without invalidating tokens
- **Path traversal protection** on backup download endpoint
- **CSV injection prevention** — sanitizes formula characters in error exports
- **Filename header injection prevention** — sanitizes Content-Disposition values
- **CORS restricted** — whitelist-based origin validation
- **JSON body size limit** — 10MB max to prevent OOM
- **Role-based access control** on all routes
- **Auth required on all mutations** — no silent userId fallback
- **TOCTOU-safe reversals** — original fetched inside transaction block
- **Service worker disabled in dev mode** — prevents stale CSS on hard refresh
- **Prisma singleton with hot-reload protection** — no connection leaks
- **Graceful shutdown** — Prisma disconnects cleanly on SIGINT/SIGTERM
- **Atomic stock operations** — all stock changes inside Prisma `$transaction`
- **Input validation** — NaN checks on all parseInt params, min_stock 0 handled

---

## Development

```bash
# TypeScript check (both must pass clean)
cd backend && npx tsc --noEmit
cd frontend && npx tsc -b --force && npx vite build

# Build frontend for single-port mode
cd frontend && npm run build

# Reset database
cd backend && npx prisma migrate reset
node src/scripts/reimport-clean.js
node src/scripts/dedupe-items.js
node src/scripts/verify-sections.js
node src/scripts/fix-recalc-mismatch.js
```

## Desktop App (Tauri)

Single app — double-click, install, use. No commands, no internet needed.

### How it works

```
Double-click .exe / .deb
  → Tauri window opens (React frontend)
  → Backend auto-starts (Node.js sidecar process)
  → Login page appears
  → Use the system
```

### Target person's experience

1. **Install** — `.exe` (Windows) or `.deb` (Linux) → double-click → "Yes" to grant permission
2. **Open** — Desktop icon "Store Management System" → double-click
3. **Login** — `STORE ADMIN` / `S123T`
4. **Use** — Everything works offline, no internet required
5. **Data** — Saved in app data folder (`%APPDATA%/Store Management System/` on Windows)

### Build

```bash
# Install Rust (one-time)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Linux build
npx tauri build
# Output: src-tauri/target/release/bundle/deb/*.deb
# Output: src-tauri/target/release/bundle/appimage/*.AppImage

# Windows build (requires Windows machine or GitHub Actions)
npx tauri build
# Output: src-tauri/target/release/bundle/nsis/*-setup.exe
```

### Architecture

| Layer | Description |
|-------|-------------|
| Tauri Window | Native desktop wrapper for React frontend |
| Frontend | React + Vite (built as static files) |
| Backend | Node.js Express (runs as sidecar — auto-started by Tauri) |
| Database | SQLite (file in app data folder) |
| Backup | Auto every 24hrs + manual via Settings |

## Distribution

| Platform | File | Install |
|----------|------|---------|
| Windows | `Store.Management.System_1.0.0_x64-setup.exe` | Double-click → Install |
| Ubuntu/Debian | `Store.Management.System_1.0.0_amd64.deb` | `sudo dpkg -i *.deb` |
| Fedora/RHEL/openSUSE | `Store.Management.System-1.0.0-1.x86_64.rpm` | `sudo dnf install ./*.rpm` (Fedora pe AppImage ki jagah yeh — niche note) |
| Any Linux | `Store.Management.System_1.0.0_amd64.AppImage` | `chmod +x *.AppImage` → Double-click |

> **Fedora note:** AppImage known WebKitGTK issue se blank window dikha sakta hai —
> Fedora/RHEL pe **.rpm** use karein (distro ka apna WebKitGTK = stable rendering).

**What the user gets:**
- Desktop icon — "Store Management System"
- Double-click → app opens → login → use
- No internet, no commands, no Node.js install needed
- All data saved locally in app data folder
- Auto backup every 24 hours

---

## License

Private — For internal use only.
