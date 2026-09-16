# Store Management System

Complete inventory management system for machine-parts stores. Replaces Excel-based tracking with a modern web application. Runs locally on PC with WiFi access for phone use.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, framer-motion, Recharts |
| Backend | Node.js, Express, Prisma ORM |
| Database | SQLite |
| Auth | JWT (12hr expiry, persisted secret), bcryptjs |
| PDF | PDFKit (premium gold-themed exports) |
| Excel | ExcelJS |
| Desktop | Tauri 2 (optional — Windows installer) |

## Login

| Field | Value |
|-------|-------|
| URL | `http://localhost:3000` |
| Username | `STORE ADMIN` |
| Password | `S123T` |

Phone access: `http://<your-PC-IP>:3000`

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
- View item detail with full transaction history (ledger)
- Smart fuzzy search — matches code, name, brand, aliases (ignores spaces, dashes, case)
- 31 categories with item counts
- Export items list as Excel or PDF

### 3. Stock IN (Receipts)

- Record incoming stock from suppliers
- Fields: Date, Supplier, Invoice Number, Remarks
- Multiple line items per transaction (Item search, Quantity, Rate, Remarks)
- Auto-generates `IN-2026-0001` format
- **Premium form:** glass card, icon-prefix inputs, gradient table header, animated toasts
- Recent 10 transactions in premium sidebar

### 4. Stock OUT (Issue)

- Issue stock to people/departments
- Fields: Date, Issued To, Department, Machine, Purpose, Remarks
- **Negative stock allowed** with glass confirmation dialog (spring animation)
- Auto-generates `OUT-2026-0001` format
- **Premium form:** same design as Stock In with danger-themed accents

### 5. Stock Return

- Record items returned by people/departments back into stock
- Fields: Date, Supplier (optional), Remarks
- Multiple line items per transaction
- Auto-generates `RETURN-2026-0001` format
- **Premium form:** amber-themed, glass cards, gradient save button

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

### 8. Export (Premium PDFs)

**Gold-themed PDF design:**
- Gold gradient header bar with store name + subtitle
- Colored section headers (green for receipts, red for issues, amber for alerts)
- Per-section table header colors
- Warm gold-tinted alternating rows
- 2x2 summary cards with big numbers
- Gold accent lines + premium footer with page numbers

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

### 11. Analytics (6 Views)

| View | What it shows |
|------|---------------|
| Consumption Trends | Per-item line chart over 12 months |
| Machine-wise Consumption | Bar chart comparing machines |
| Unusual Consumption | Machines >50% above 6-month average |
| Dead Stock | Items with no movement (90/180/365 days) |
| Stock Value Trend | 12-month stock value line chart |
| Smart Reorder Points | Suggested min_stock based on consumption + lead time |

### 12. Backup System

- Automatic backup on startup + every 24 hours
- Max 3 backups per day, 30-day retention
- Manual backup via Settings
- Download backup files
- **Path traversal protection** on download endpoint

### 13. Authentication & Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Everything + Settings + Delete items |
| STORE_INCHARGE | Stock ops + Reversals + Items CRUD + Reorder accept |
| ASSISTANT | Stock IN/OUT + View reports |
| VIEWER | Read only |

- JWT persisted to disk (survives server restarts)
- 12hr token expiry
- Role-based access control on all routes

### 14. Premium Dark Industrial Theme

**Design system — "control panel of good machinery":**

| Element | Color | Usage |
|---------|-------|-------|
| Base | `#0B0D11` | Page background |
| Surface | `#14161C` | Cards, panels |
| Elevated | `#1C1F26` | Modals, table headers |
| Accent | `#E8A035` | Buttons, active nav, links (gold) |
| OK | `#4ADE80` | Stock ok (green) |
| Low | `#F59E0B` | Low stock (amber) |
| Danger | `#EF4444` | Out of stock (red) |

**Features:**
- Glass morphism (backdrop-blur) on cards, dialogs, toasts
- framer-motion page transitions, stagger animations, spring dialogs
- Animated number count-up on stat cards
- LayoutGroup animated nav underline with layoutId
- Mobile responsive with bottom navigation + animated indicator
- Print stylesheet (clean A4, no UI elements)
- Service worker disabled in dev mode (prevents stale CSS)

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

### 5. Login

Open `http://localhost:3000`:
- Username: `STORE ADMIN`
- Password: `S123T`

### Phone Access (WiFi)

Backend listens on `0.0.0.0:5000`. Open in phone browser:
```
http://<your-PC-IP>:3000
```

Find your PC IP: `ip addr show` or `hostname -I`

---

## Project Structure

```
store management system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (13 tables)
│   │   ├── dev.db                 # SQLite database
│   │   └── seed.ts                # Admin user only
│   ├── src/
│   │   ├── index.ts               # Express entry + graceful shutdown
│   │   ├── lib/prisma.ts          # Prisma singleton client
│   │   ├── middleware/auth.ts     # JWT auth + role checks
│   │   ├── services/
│   │   │   ├── itemService.ts
│   │   │   ├── transactionService.ts   # Stock IN/OUT/Return/Reversal (by ID + by txn_no)
│   │   │   ├── reportService.ts        # Daily report (correct stock calculation)
│   │   │   ├── monthlyReportService.ts # Monthly report (correct stock calculation)
│   │   │   ├── dashboardService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── reorderService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── backupService.ts        # Path traversal protected
│   │   │   ├── importService.ts
│   │   │   ├── pdfExportService.ts     # Premium gold-themed PDFs
│   │   │   ├── excelExportService.ts
│   │   │   └── authService.ts          # Persisted JWT secret
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── validations/
│   │   ├── utils/stock.ts              # recalculateStock, generateTxnNo
│   │   └── scripts/                    # Import scripts
│   └── backups/                        # Automatic backups
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Nav, routing, AnimatePresence
│   │   ├── index.css                   # @theme block + glass utilities
│   │   ├── lib/motion.ts               # Animation presets
│   │   ├── api/                        # API clients (authFetch wrapper)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── hooks/                      # useDebounce, useIsMobile
│   │   └── components/
│   │       ├── Auth/LoginPage.tsx       # Premium login
│   │       ├── Dashboard/              # Premium dashboard (4+2 layout)
│   │       ├── Items/                  # Items page + detail + ledger
│   │       ├── Transactions/           # Stock In/Out/Return (premium forms)
│   │       ├── Reports/                # Daily + Monthly (with reverse)
│   │       ├── Import/ImportWizard.tsx
│   │       ├── Settings/BackupSettings.tsx
│   │       ├── Audit/                  # Physical audit
│   │       ├── Analytics/AnalyticsPage.tsx
│   │       ├── Reorder/ReorderPointsPage.tsx
│   │       └── Layout/                 # MobileNav, LoadingScreen
│   └── public/
│       ├── sw.js                       # Service worker (dev-aware)
│       ├── manifest.json               # Dark theme PWA manifest
│       └── offline.html                # Dark offline page
│
├── src-tauri/                          # Tauri desktop (optional)
└── exel file/                          # User's Excel files
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
| `items` | Main inventory (1,019 items) |
| `item_aliases` | Alternative names for search |
| `suppliers` | Vendors with lead_time_days |
| `departments` | Organization units |
| `machines` | Equipment linked to departments |
| `persons` | People receiving material (92) |
| `transactions` | Header — type, date, creator |
| `transaction_items` | Line items — item, quantity, rate |
| `stock_audits` | Audit sessions |
| `stock_audit_lines` | Item counts within audits |

**Stock calculation:** `current_stock` maintained by `recalculateStock()` — IN/RETURN add, OUT subtract, ADJUST/REVERSAL signed. Correct type-aware calculation (not raw sum).

---

## Security Features

- **JWT persisted to disk** — survives server restarts without invalidating tokens
- **Path traversal protection** on backup download endpoint
- **Role-based access control** on all routes
- **Service worker disabled in dev mode** — prevents stale CSS on hard refresh
- **Prisma singleton** — single connection pool, no leaks
- **Graceful shutdown** — Prisma disconnects cleanly on SIGINT/SIGTERM
- **Atomic stock operations** — all stock changes inside Prisma `$transaction`

---

## Development

```bash
# TypeScript check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Build frontend
cd frontend && npx vite build

# Reset database
cd backend && npx prisma migrate reset
node src/scripts/reimport-clean.js
```

## Desktop App (Tauri)

Requires Windows + Rust toolchain.

```bash
npm install
npm run tauri:build
```

---

## License

Private — For internal use only.
