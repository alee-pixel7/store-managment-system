# Store Management System

Complete inventory management system for machine-parts stores. Replaces Excel-based tracking with a modern web application. Runs locally on PC with WiFi access for phone use.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Recharts |
| Backend | Node.js, Express, Prisma ORM |
| Database | SQLite |
| Auth | JWT (12hr expiry), bcryptjs |
| PDF | PDFKit |
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

### 1. Dashboard

**What it shows:**
- Total active items count
- Low stock items count (items where `current_stock <= min_stock`)
- Out of stock items count (`current_stock = 0`)
- Total stock value (sum of all items' stock)
- Today's Stock In transactions count + total quantity
- Today's Issue transactions count + total quantity
- Recent 10 transactions (clickable — navigates to relevant page)
- Low stock alert list (clickable — opens item detail)

**What's clickable:**
- All 6 stat cards navigate to relevant pages
- "Stock In" / "Issue" buttons in header
- Recent Activity transactions → Stock In/Out/Return pages
- Low Stock Alert items → Item Detail page

---

### 2. Items Management

**What it does:**
- View all 1,019 items in a searchable, filterable table
- Add new items with code, name, category, brand, unit, min stock, rack location
- Edit existing items
- Soft delete (deactivate) items
- View item detail with full transaction history (ledger)
- Export items list as Excel or PDF

**Search:**
- Smart fuzzy search — matches item code, name, brand, aliases
- Ignores spaces, dashes, case
- Example: typing "Siemens relay" finds "SIEMEN RELAY"

**Filters:**
- Category dropdown (31 categories)
- Low Stock Only checkbox
- Out of Stock checkbox

**Item Detail page shows:**
- Item info (code, name, brand, unit, stock, min stock, rack location)
- Aliases (alternative names)
- Transaction ledger with running balance
- Date range and type filters on ledger

**Categories (31):**

| Category | Items | Category | Items |
|----------|-------|----------|-------|
| 3 Layer Extruder | 107 | PPRC & GI Fittings | 91 |
| Bag Making | 90 | General Store | 43 |
| Shanxi Barren | 70 | Cloth & Wrapping | 27 |
| Contactors & Relays | 65 | Bearings | 27 |
| Breakers & Fuses | 61 | Pneumatic & Valves | 26 |
| Comexi Lamination | 59 | Electrical - Power | 21 |
| Slitting | 50 | Mono Layer Extruder | 21 |
| UV Reborn | 46 | Diapper Cutting | 21 |
| Sinomech | 45 | Electrical - Wiring | 17 |
| Worldly Gravoure | 42 | Belts & Chains | 16 |
| Lubricants & Chemicals | 14 | Cutting & Grinding | 13 |
| Tape & Adhesives | 13 | Metalizer | 12 |
| PLCs & Controllers | 10 | Packaging & Storage | 5 |
| Printing & Copying | 4 | Sensors & Proximity | 1 |
| Oil Seals & O-Rings | 2 | | |

---

### 3. Stock IN (Receipts)

**What it does:**
- Record incoming stock from suppliers
- Fields: Date, Supplier, Invoice Number, Remarks
- Add multiple line items per transaction
- Each line: Item (search), Quantity, Rate, Line Remarks
- Auto-generates transaction number (format: `IN-2026-0001`)
- Updates `current_stock` automatically
- Records `last_rate` on item for future reference

**Recent Stock In sidebar:**
- Shows last 10 stock-in transactions
- Click any to see details

---

### 4. Stock OUT (Issue)

**What it does:**
- Issue stock to people/departments
- Fields: Date, Issued To (Person), Department, Machine, Purpose, Remarks
- Add multiple line items per transaction
- Each line: Item (search), Quantity, Line Remarks
- **Negative stock allowed** with confirmation dialog
- Auto-generates transaction number (format: `OUT-2026-0001`)
- Updates `current_stock` automatically

**Negative Stock Warning:**
- When issuing more than available stock, an amber confirmation dialog appears
- Shows item name, current stock, and requested quantity
- Must confirm to proceed

**Recent Issues sidebar:**
- Shows last 10 issue transactions

---

### 5. Stock Return

**What it does:**
- Record items returned by people/departments back into stock
- Fields: Date, Supplier (optional), Remarks
- Add multiple line items per transaction
- Each line: Item (search), Quantity
- Auto-generates transaction number (format: `RET-2026-0001`)
- Updates `current_stock` automatically

**Recent Returns sidebar:**
- Shows last 10 return transactions

---

### 6. Stock Reversal

**What it does:**
- Correct mistakes without deleting original transactions
- Creates a REVERSAL transaction that offsets the original
- Original transaction is marked as `is_reversed = true`
- Stock is recalculated correctly

**How to reverse:**
- Go to Items → click item code → Item Detail → Ledger
- Click "Reverse" on any transaction
- Confirm in the dialog
- System creates a REVERSAL entry

**Important:** Stock is NEVER allowed to go negative during reversal. If reversal would cause negative stock, it's blocked.

---

### 7. Item Ledger

**What it shows:**
- Complete transaction history for any item
- Running balance after each transaction
- Columns: Date, Txn No, Type, In Qty, Out Qty, Running Balance, Rate, Party, Purpose, Remarks
- Filtered by date range and transaction type

**Access:** Items → click item code → Item Detail → Ledger tab

---

### 8. Daily Report

**What it does:**
- Generate report for any specific date
- Shows:
  - **Summary:** Total receipts, issues, returns, transactions
  - **Receipts (Stock IN):** Item, qty, rate, total, supplier, invoice
  - **Issues (Stock OUT):** Item, qty, issued to, dept, machine, purpose
  - **Items Below Minimum:** Items that crossed below min_stock that day
- Export as Excel or PDF
- Print-friendly A4 layout

**Access:** Reports → Daily Report

---

### 9. Monthly Report

**What it does:**
- Generate report for any month/year
- Shows:
  - **Summary:** Opening stock value, closing stock value, net change
  - **Department Consumption:** Which department consumed what
  - **Machine Consumption:** Which machine consumed what
  - **Top 20 Consumed Items:** Most issued items
  - **Out of Stock Days:** Items that hit zero stock
- Export as Excel or PDF
- Print-friendly A4 layout

**Access:** Reports → Monthly Report

---

### 10. Export (Excel & PDF)

**Available exports:**
| Export | Format | Access |
|--------|--------|--------|
| Items List | Excel / PDF | Items page → Excel/PDF button |
| Daily Report | Excel / PDF | Daily Report page → Excel/PDF button |
| Monthly Report | Excel / PDF | Monthly Report page → Excel/PDF button |
| Item Ledger | Excel / PDF | Item Detail → Ledger → Excel/PDF button |

**PDF features:**
- Dynamic row heights (no text overlap)
- Custom column widths (Name column wider for long item names)
- Category column included in items PDF
- Alternating row backgrounds
- Page numbers
- Print stylesheet (hides nav/buttons)

---

### 11. Import System

**Multi-sheet Excel import:**
- Upload Excel file with multiple sheets
- Preview each sheet's data
- Map columns to system fields
- Validate before importing
- Import items with categories

**Daily Report import:**
- Upload DAILY REPORT.xlsx
- Fuzzy matches item codes/names
- Creates transactions automatically

**How to import:**
1. Go to Import page
2. Upload Excel file
3. Select sheet (if multi-sheet)
4. Map columns
5. Preview and confirm

---

### 12. Physical Stock Audit

**Workflow:**
1. Start Audit → system snapshots current stock quantities
2. Count items physically (mobile-friendly screen)
3. Enter counted quantity for each item
4. System calculates variance (counted - system)
5. Finalise → auto-generates ADJUST transactions for differences

**Access:** Audit → Start New Audit

**Features:**
- Search items while counting
- Color-coded variance (green = match, red = mismatch)
- Skip items (count later)
- Final audit report

---

### 13. Analytics

**6 analytics views:**

| View | What it shows |
|------|---------------|
| **Consumption Trends** | Per-item line chart over 12 months |
| **Machine-wise Consumption** | Bar chart comparing machines |
| **Unusual Consumption** | Machines >50% above 6-month average |
| **Dead Stock** | Items with no movement in 90/180/365 days + tied-up value |
| **Stock Value Trend** | 12-month stock value line chart |
| **Smart Reorder Points** | Suggested min_stock based on consumption + lead time |

**Smart Reorder Points — How it works:**
- Analyzes last 6 months of OUT transactions
- Formula: `suggestedMin = (avg monthly consumption × lead time / 30) + safety buffer`
- Safety buffer uses 1.5σ (93% service level)
- Shows: Current Min, Suggested Min, Diff, Avg Monthly, Lead Time
- Click "Accept" to update an item's min_stock
- Bulk accept available for multiple items

---

### 14. Backup System

**What it does:**
- Automatic backup on server startup
- Automatic backup every 24 hours
- Manual backup via Settings page
- Max 3 backups per day (oldest deleted automatically)
- 30-day retention (older backups deleted)
- First backup of each month kept permanently

**Location:** `backend/backups/`

**Download:** Settings → Backup → click "Download" next to any backup

---

### 15. Authentication & Roles

**Roles:**

| Role | Permissions |
|------|-------------|
| **ADMIN** | Everything + Settings + Delete items |
| **STORE_INCHARGE** | Stock ops + Reversals + Items CRUD + Reorder accept |
| **ASSISTANT** | Stock IN/OUT + View reports |
| **VIEWER** | Read only |

**Auth flow:**
- Login returns JWT token (12hr expiry)
- Token stored in localStorage
- All API requests include `Authorization: Bearer <token>`
- 401 response → auto logout

---

### 16. Dark Industrial Theme

**Design system — "control panel of good machinery":**

| Element | Color | Usage |
|---------|-------|-------|
| Base | `#0D0F14` | Page background (deepest) |
| Surface | `#161A21` | Cards, panels |
| Elevated | `#1F242D` | Modals, table headers |
| Raised | `#272D38` | Highest depth |
| Accent | `#FFA940` | Buttons, active nav, links |
| OK | `#3FB950` | Stock ok |
| Low | `#D9A017` | Low stock |
| Danger | `#E5484D` | Out of stock |

**Features:**
- 4-layer depth system with edge highlights
- CSS custom properties + Tailwind `@theme`
- Mobile responsive with bottom navigation
- Print stylesheet (clean A4, no UI elements)

---

### 17. Mobile / PWA

**Mobile features:**
- Bottom navigation bar (Home, Issue, Return, Reports, Audit, Analytics)
- Touch-friendly inputs (min 44px height)
- Responsive grid layouts
- Safe area padding for notched phones
- Installable as PWA

---

## Quick Start

### Prerequisites
- Node.js 18+
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

Place Excel files in `exel file/` directory, then:

```bash
cd backend
node src/scripts/reimport-clean.js
```

### 4. Start Development Servers

```bash
# Option A — One command
cd ..
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
│   │   ├── seed.ts                # Admin user only
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts               # Express entry point
│   │   ├── lib/prisma.ts          # Prisma client
│   │   ├── middleware/auth.ts     # JWT auth + role checks
│   │   ├── services/              # Business logic
│   │   │   ├── itemService.ts         # Item CRUD + search
│   │   │   ├── transactionService.ts  # Stock IN/OUT/Return/Reversal
│   │   │   ├── reportService.ts       # Daily report data
│   │   │   ├── monthlyReportService.ts # Monthly report data
│   │   │   ├── dashboardService.ts    # Dashboard summary
│   │   │   ├── analyticsService.ts    # Analytics calculations
│   │   │   ├── reorderService.ts      # Smart reorder points
│   │   │   ├── auditService.ts        # Physical audit
│   │   │   ├── backupService.ts       # Database backup
│   │   │   ├── importService.ts       # Excel import
│   │   │   ├── pdfExportService.ts    # PDF generation
│   │   │   ├── excelExportService.ts  # Excel generation
│   │   │   ├── authService.ts         # Login, JWT
│   │   │   └── stock.ts              # Stock calculation helpers
│   │   ├── controllers/           # HTTP handlers
│   │   ├── routes/                # API routes
│   │   ├── scripts/               # Import scripts
│   │   └── validations/           # Input validation
│   ├── backups/                   # Automatic backups
│   └── reports/                   # Generated report PDFs
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app with routing
│   │   ├── index.css              # Theme (CSS vars + Tailwind @theme)
│   │   ├── api/                   # API clients
│   │   │   ├── fetch.ts               # Auth-aware fetch wrapper
│   │   │   ├── items.ts               # Items API
│   │   │   ├── transactions.ts        # Transactions API
│   │   │   ├── reports.ts             # Reports API
│   │   │   ├── dashboard.ts           # Dashboard API
│   │   │   ├── analytics.ts           # Analytics API
│   │   │   ├── reorder.ts             # Reorder API
│   │   │   ├── backup.ts              # Backup API
│   │   │   ├── import.ts              # Import API
│   │   │   ├── export.ts              # Export/download API
│   │   │   └── audit.ts               # Audit API
│   │   ├── contexts/AuthContext.tsx
│   │   ├── hooks/                 # useDebounce, useIsMobile
│   │   └── components/
│   │       ├── Auth/              # LoginPage
│   │       ├── Dashboard/         # DashboardPage, StatCards, LowStockAlert, RecentActivity
│   │       ├── Items/             # ItemsPage, ItemsTable, ItemDetailPage, ItemModal, ItemLedger, Pagination
│   │       ├── Transactions/      # StockInPage, StockOutPage, StockReturnPage, Forms, Selects
│   │       ├── Reports/           # DailyReportPage, MonthlyReportPage
│   │       ├── Import/            # ImportWizard
│   │       ├── Settings/          # BackupSettings
│   │       ├── Audit/             # AuditListPage, AuditCountPage
│   │       ├── Analytics/         # AnalyticsPage
│   │       ├── Reorder/           # ReorderPointsPage
│   │       └── Layout/            # MobileNav, LoadingScreen
│   └── dist/                      # Production build
│
├── src-tauri/                     # Tauri desktop app (optional)
│
└── exel file/                     # User's Excel files (3 files)
    ├── BREAKER,CONACTOR,RELAY.xlsx  # 14 sheets, 743 items
    ├── New XLSX Worksheet.xlsx      # PPRC + GI fittings, 84 items
    └── DAILY REPORT.xlsx            # 740 transaction rows
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
| GET | `/api/items` | List items (pagination, search, filters: `low_stock`, `out_of_stock`) |
| GET | `/api/items/:id` | Get item detail with recent transactions |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Soft delete (deactivate) |
| GET | `/api/items/search?q=` | Smart fuzzy search |
| GET | `/api/items/categories` | List categories with item counts |
| GET | `/api/items/:id/ledger` | Item ledger with running balance |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (filter: `txn_type=IN,OUT,ADJUST,RETURN,REVERSAL`) |
| POST | `/api/transactions/in` | Stock IN |
| POST | `/api/transactions/out` | Stock OUT (allows negative stock) |
| POST | `/api/transactions/return` | Stock Return |
| POST | `/api/transactions/:id/reverse` | Reverse a transaction |

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
| GET | `/api/dashboard/summary` | Dashboard stats + recent transactions |

### Backup
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/backup/now` | Create manual backup |
| GET | `/api/backup/list` | List backups |
| GET | `/api/backup/download/:filename` | Download backup file |

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
| POST | `/api/audits/:id/finalise` | Finalise audit (creates ADJUST transactions) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/consumption-trend` | Per-item consumption over time |
| GET | `/api/analytics/machine-consumption` | Machine-wise comparison |
| GET | `/api/analytics/unusual-consumption` | Flag unusual consumption (>50% above avg) |
| GET | `/api/analytics/reorder-interval` | Average days between reorders |
| GET | `/api/analytics/dead-stock` | Items with no movement (90/180/365 days) |
| GET | `/api/analytics/stock-value-trend` | 12-month stock value trend |

### Reorder
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reorder/suggestions` | Suggested min_stock per item |
| POST | `/api/reorder/accept/:itemId` | Accept one suggestion |
| POST | `/api/reorder/accept-bulk` | Accept multiple suggestions |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (public, no auth) |

---

## Database Schema

13 tables:

| Table | Purpose |
|-------|---------|
| `users` | Login credentials, roles (ADMIN, STORE_INCHARGE, ASSISTANT, VIEWER) |
| `categories` | Item categories (31) |
| `items` | Main inventory — item_code, name, brand, unit, stock, min_stock, rack_location |
| `item_aliases` | Alternative names for fuzzy search |
| `suppliers` | Vendors with lead_time_days |
| `departments` | Organization units |
| `machines` | Equipment linked to departments |
| `persons` | People receiving material (92) |
| `transactions` | Header — type (IN/OUT/RETURN/ADJUST/REVERSAL), date, creator |
| `transaction_items` | Line items — item, quantity, rate per transaction |
| `stock_audits` | Audit sessions |
| `stock_audit_lines` | Individual item counts within audits |

**Stock calculation:** `current_stock` on items is maintained by `recalculateStock()` which sums all transaction_items (IN/RETURN add, OUT subtract, ADJUST/REVERSAL signed).

---

## Development

```bash
# TypeScript check
cd backend && npx tsc --noEmit

# Build frontend
cd frontend && npx vite build

# Reset database and reimport
cd backend && npx prisma migrate reset
node src/scripts/reimport-clean.js

# Run both servers
npm run dev
```

## Desktop App (Tauri)

Requires Windows + Rust toolchain.

```bash
npm install
npm run tauri:build
```

Output: `src-tauri/target/release/bundle/nsis/Store Management System_1.0.0_x64-setup.exe`

---

## License

Private — For internal use only.
