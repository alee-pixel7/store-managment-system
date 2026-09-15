# Store Management System

A complete inventory/store management system for machine-parts stores, built with React + Vite + Tailwind (frontend) and Node.js + Express + Prisma + SQLite (backend). Runs locally on PC with WiFi access.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Recharts |
| Backend | Node.js, Express, Prisma ORM |
| Database | SQLite |
| Auth | JWT (12hr expiry), bcryptjs |
| PDF | PDFKit |
| Desktop | Tauri 2 (optional — Windows installer) |

## Features

### Core Inventory
- **Items Management** — 1,019 items across 31 categories, smart fuzzy search, aliases
- **Stock IN** — Receipts with supplier, invoice, rate tracking
- **Stock OUT / Issue** — Issues with person, machine, purpose; negative stock confirmation dialog
- **Stock Return** — Return transactions with item search
- **Stock Reversal** — Corrections without deleting original transactions
- **Item Ledger** — Running balance with date range and type filters

### Reports
- **Daily Report** — Receipts, issues, items below minimum stock (printable A4)
- **Monthly Report** — Dept/machine consumption, top 20 items, out of stock days
- **Export** — Excel (ExcelJS) and PDF (PDFKit) export on every report

### Dashboard
- Total items, low stock, out of stock, stock value
- Today's IN/OUT counts and quantities
- Low stock alerts (clickable to item detail)
- Recent activity feed with type badges
- Premium dark industrial design with depth layers and accent colors

### Analytics & Intelligence
- **Consumption Trends** — Per-item line charts over 12 months
- **Machine-wise Consumption** — Bar chart comparison with month selector
- **Unusual Consumption Flags** — Machines >50% above 6-month average
- **Dead Stock Report** — Items with no movement in 90/180/365 days + tied-up value
- **Stock Value Trend** — 12-month stock value line chart
- **Smart Reorder Points** — Suggested min_stock based on consumption + lead time

### Physical Stock Audit
- Start audit → snapshot system quantities → mobile-friendly count screen
- Variance report → finalise → auto-generate ADJUST transactions

### System
- **Role-based access** — ADMIN, STORE_INCHARGE, ASSISTANT, VIEWER
- **Excel Import** — Multi-sheet import with column mapping, daily report import
- **Automatic Backup** — Daily backups, 30-day retention, monthly kept permanently
- **Scheduled Reports** — Configurable daily PDF generation + optional email delivery
- **Mobile / PWA** — Responsive layouts, bottom nav, offline fallback, installable
- **Dark Industrial Theme** — 4-layer depth system, amber accent `#FFA940`, edge highlights
- **Print Stylesheet** — Clean A4 layout, no navigation/buttons in print

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup Database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 3. Import Real Data (optional)

Place Excel files in `exel file/` directory, then run:

```bash
cd backend
node src/scripts/reimport-clean.js
```

This imports items from all Excel files and creates opening stock + daily report transactions.

### 4. Start Development Servers

```bash
# Option A — One command (concurrently)
cd ..
npm run dev

# Option B — Two terminals
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

### 5. Login

Open `http://localhost:3000` and login with:
- **Username:** `STORE ADMIN`
- **Password:** `S123T`

### Phone Access (WiFi)

Backend listens on `0.0.0.0:5000`. Open in phone browser:
```
http://<your-PC-IP>:3000
```
Find your PC IP: `ip addr show` or `hostname -I`

## Desktop App (Tauri)

### Prerequisites for Building Desktop App

- **Windows 10/11** (for building Windows installer)
- **Rust** — Install via [rustup.rs](https://rustup.rs/)
- **Visual Studio C++ Build Tools** — For Windows compilation

### Build

```bash
npm install
npm run tauri:build
```

Installer output:
```
src-tauri/target/release/bundle/nsis/Store Management System_1.0.0_x64-setup.exe
```

### Development Mode

```bash
npm run tauri:dev
```

### How It Works

1. **Backend as Sidecar** — Express backend runs as a sidecar process managed by Tauri
2. **Data Directory** — SQLite and backups stored in `%APPDATA%/com.storemanagement.app/`
3. **Loading Screen** — Shows while backend starts (polls health check)
4. **LAN Mode** — Backend listens on `0.0.0.0:5000` so phones can connect

## Theme

Dark industrial design — "control panel of good machinery":

| Token | Color | Usage |
|-------|-------|-------|
| `bg-base` | `#0D0F14` | Page background (deepest) |
| `bg-surface` | `#161A21` | Cards, panels |
| `bg-elevated` | `#1F242D` | Modals, table headers |
| `bg-raised` | `#272D38` | Highest depth |
| `accent` | `#FFA940` | Buttons, active nav, links (warm amber-orange) |
| `accent-dim` | `rgba(255,169,64,0.12)` | Accent backgrounds |
| `edge-light` | `rgba(255,255,255,0.06)` | 3D edge highlights |
| `edge-dark` | `rgba(0,0,0,0.40)` | 3D shadows |
| Status ok | `#3FB950` | Stock ok |
| Status low | `#D9A017` | Low stock (desaturated amber) |
| Status danger | `#E5484D` | Out of stock |

Defined as CSS custom properties + Tailwind `@theme` in `frontend/src/index.css`.

## Database

Current data: **1,019 items**, **31 categories**, **756 transactions**, **92 persons**

### Categories (31)

**Machine-Specific Parts:**
3 Layer Extruder (107), Bag Making (90), Shanxi Barren (70), Comexi Lamination (59), Slitting (50), Worldly Gravoure (42), UV Reborn (46), Sinomech (45), Mono Layer Extruder (21), Diapper Cutting (21), Metalizer (12)

**Electrical Components:**
Breakers & Fuses (61), Contactors & Relays (65), PLCs & Controllers (10), Sensors & Proximity (1), Electrical - Power (21), Electrical - Wiring (17)

**Mechanical Components:**
Bearings (27), Belts & Chains (16), Pneumatic & Valves (26), Oil Seals & O-Rings (2)

**Consumables & General:**
PPRC & GI Fittings (91), General Store (43), Cloth & Wrapping (27), Tape & Adhesives (13), Lubricants & Chemicals (14), Cutting & Grinding (13), Packaging & Storage (5), Printing & Copying (4)

## Project Structure

```
store management system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (12 tables)
│   │   ├── dev.db                 # SQLite database
│   │   ├── seed.ts                # Admin user only (no dummy data)
│   │   └── migrations/            # Prisma migrations
│   ├── src/
│   │   ├── index.ts               # Express entry point
│   │   ├── lib/prisma.ts          # Prisma client
│   │   ├── middleware/auth.ts     # JWT auth + role checks
│   │   ├── services/              # Business logic (17 services)
│   │   ├── controllers/           # HTTP handlers (14 controllers)
│   │   ├── routes/                # API routes (12 route files)
│   │   ├── scripts/               # Import scripts (reimport-clean.js, etc.)
│   │   └── utils/stock.ts         # Stock calculation helpers
│   └── backups/                   # Automatic backups
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app with routing
│   │   ├── index.css              # Theme (CSS vars + Tailwind @theme)
│   │   ├── api/                   # API clients (13 files)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── hooks/                 # useDebounce, useIsMobile
│   │   └── components/
│   │       ├── Auth/              # LoginPage
│   │       ├── Dashboard/         # DashboardPage, StatCards, LowStockAlert, RecentActivity
│   │       ├── Items/             # ItemsPage, ItemsTable, ItemDetailPage, ItemModal, ItemLedger, Pagination, AliasInput
│   │       ├── Transactions/      # StockInPage, StockOutPage, StockReturnPage, StockInForm, StockOutForm, StockReturnForm, ItemSearch, SupplierSelect, PersonSelect, DepartmentSelect, MachineSelect, ReverseConfirmModal
│   │       ├── Reports/           # DailyReportPage, MonthlyReportPage
│   │       ├── Import/            # ImportWizard, ColumnMapper, PreviewTable
│   │       ├── Settings/          # BackupSettings, SchedulerSettings
│   │       ├── Audit/             # AuditListPage, AuditCountPage
│   │       ├── Analytics/         # AnalyticsPage (recharts)
│   │       ├── Reorder/           # ReorderPointsPage
│   │       └── Layout/            # MobileNav, LoadingScreen
│   └── dist/                      # Production build
│
├── src-tauri/                     # Tauri desktop app
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   ├── src/lib.rs, main.rs
│   └── icons/
│
└── exel file/                     # User's Excel files (3 files imported)
    ├── BREAKER,CONACTOR,RELAY.xlsx  # 14 sheets, 743 items
    ├── New XLSX Worksheet.xlsx      # PPRC + GI fittings, 84 items
    └── DAILY REPORT.xlsx            # 740 transaction rows
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List items (pagination, search, filters) |
| GET | `/api/items/:id` | Get item detail |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Soft delete item |
| GET | `/api/items/search` | Smart fuzzy search |
| GET | `/api/items/categories` | List categories with item counts |
| GET | `/api/items/:id/ledger` | Item ledger with running balance |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (filter by type: IN,OUT,ADJUST,RETURN,REVERSAL) |
| POST | `/api/transactions/in` | Stock IN |
| POST | `/api/transactions/out` | Stock OUT |
| POST | `/api/transactions/return` | Stock Return |
| POST | `/api/transactions/:id/reverse` | Reverse transaction |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |
| GET | `/api/reports/monthly?year=&month=` | Monthly report |

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
| GET | `/api/dashboard/summary` | Dashboard stats |

### Backup
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/backup/now` | Create manual backup |
| GET | `/api/backup/list` | List backups |
| GET | `/api/backup/download/:filename` | Download backup |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import/parse` | Parse Excel file (multi-sheet) |
| POST | `/api/import/validate-items` | Validate item data |
| POST | `/api/import/items` | Import items |
| POST | `/api/import/stock` | Import stock transactions |
| POST | `/api/import/daily-report` | Import daily report with fuzzy matching |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audits` | List audits |
| POST | `/api/audits` | Start new audit |
| GET | `/api/audits/:id` | Audit summary |
| POST | `/api/audits/:id/count` | Count an item |
| GET | `/api/audits/:id/search` | Search items for counting |
| GET | `/api/audits/:id/variance` | Variance report |
| POST | `/api/audits/:id/finalise` | Finalise audit |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/consumption-trend` | Per-item consumption over time |
| GET | `/api/analytics/machine-consumption` | Machine-wise comparison |
| GET | `/api/analytics/unusual-consumption` | Flag unusual consumption |
| GET | `/api/analytics/reorder-interval` | Average days between reorders |
| GET | `/api/analytics/dead-stock` | Dead stock report |
| GET | `/api/analytics/stock-value-trend` | 12-month stock value trend |

### Reorder
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reorder/suggestions` | Suggested min_stock per item |
| POST | `/api/reorder/accept/:itemId` | Accept one suggestion |
| POST | `/api/reorder/accept-bulk` | Accept multiple suggestions |

### Scheduler
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduler/status` | Scheduler status |
| PUT | `/api/scheduler/settings` | Update settings |
| POST | `/api/scheduler/run-now` | Generate report now |
| GET | `/api/scheduler/reports` | List generated reports |
| GET | `/api/scheduler/queue` | Email queue |
| POST | `/api/scheduler/queue/:id/retry` | Retry failed email |
| POST | `/api/scheduler/queue/clear` | Clear queue |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (public) |

## Role Permissions

| Role | Can Do |
|------|--------|
| **ADMIN** | Everything + Settings + Scheduler + Delete items |
| **STORE_INCHARGE** | Stock ops + Reversals + Items CRUD + Reorder accept |
| **ASSISTANT** | Stock IN/OUT + View reports |
| **VIEWER** | Read only |

## Database Schema

12 tables:
- `users` — Login credentials, roles
- `categories` — Item categories (31)
- `items` — Main inventory (item_code, name, brand, stock, min_stock)
- `item_aliases` — Alternative names for search
- `suppliers` — Vendors (with lead_time_days)
- `departments` — Org units
- `machines` — Equipment
- `persons` — People receiving material (92)
- `transactions` — Header (IN/OUT/RETURN/ADJUST/REVERSAL)
- `transaction_items` — Line items per transaction
- `stock_audits` — Audit sessions
- `stock_audit_lines` — Individual item counts within audits

## Backup System

- **Auto on startup** + every 24 hours
- **Location:** `backend/backups/store-YYYY-MM-DD.db`
- **Retention:** Last 30 daily backups
- **Monthly:** First backup of each month kept permanently
- **Manual:** POST `/api/backup/now` (ADMIN only)

## Import Scripts

| Script | Purpose |
|--------|---------|
| `backend/src/scripts/reimport-clean.js` | Full reimport — wipes DB, imports all 3 Excel files with correct column mappings, creates categories, ADJUST + OUT transactions |
| `backend/src/scripts/import-data.js` | First-pass import (legacy) |
| `backend/src/scripts/import-pass2.js` | Adds missing daily report items (legacy) |

## Environment Variables

```bash
# backend/.env
DATABASE_URL="file:./dev.db"
PORT=5000
JWT_SECRET="your-secret-key"

# Optional — for email delivery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
SMTP_FROM=your@email.com
```

## Development

```bash
# Run TypeScript compiler check
cd backend && npx tsc --noEmit

# Build frontend
cd frontend && npx vite build

# Reset database and reimport
cd backend && npx prisma migrate reset
node src/scripts/reimport-clean.js

# Run both servers
npm run dev
```

## License

Private — For internal use only.
