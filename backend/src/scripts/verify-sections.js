// ============================================================
// verify-sections.js — Compare Excel master vs DB
//
// Verifies, for `exel file/all stock new.xlsx` (16 sheets):
//   1. Every sheet is present and readable
//   2. Category column values match the app's category names
//   3. Heading rows are not counted as items
//   4. Stock sums (REMAINING column) match DB current_stock
//      per section, and in total
//
// Column detection is adaptive: the header row is found by
// looking for Category / Remaining-like column names, so minor
// layout shifts don't break the check.
//
// Usage:  node src/scripts/verify-sections.js
// ============================================================

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXCEL_PATH = path.resolve(__dirname, '../../../exel file/all stock new.xlsx');

// Column-name patterns
const CAT_RE = /^categor/i;
const REMAIN_RE = /^(remain|stock|balanc|qty|quantity)/i;
const NAME_RE = /^(item|material|description|product|name)/i;
const CODE_RE = /^(item.?code|code|sl|s\.?l)/i;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[\s\-_[\](){}\\/,.'"]+/g, '');
}

function isNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'string') return false;
  return /^-?\d+([.,]\d+)?$/.test(v.trim());
}

function toNum(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[, ]/g, '.').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Find header row index in a sheet (first row with >= 2 recognized columns). */
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i] || [];
    const texts = cells.filter((c) => typeof c === 'string' && c.trim().length > 0);
    if (texts.length < 2) continue;
    const hasCat = cells.some((c) => typeof c === 'string' && CAT_RE.test(c.trim()));
    const hasRemain = cells.some((c) => typeof c === 'string' && REMAIN_RE.test(c.trim()));
    if (hasCat && hasRemain) return i;
  }
  // Fallback: first row with >= 3 non-empty string cells
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const texts = (rows[i] || []).filter((c) => typeof c === 'string' && c.trim().length > 0);
    if (texts.length >= 3) return i;
  }
  return -1;
}

function mapColumns(headerRow) {
  const map = { cat: -1, remain: -1, name: -1, code: -1 };
  headerRow.forEach((c, i) => {
    if (typeof c !== 'string') return;
    const t = c.trim();
    if (map.cat < 0 && CAT_RE.test(t)) map.cat = i;
    else if (map.remain < 0 && REMAIN_RE.test(t)) map.remain = i;
    else if (map.name < 0 && NAME_RE.test(t)) map.name = i;
    else if (map.code < 0 && CODE_RE.test(t)) map.code = i;
  });
  return map;
}

async function main() {
  console.log('\n📋 verify-sections.js — Excel master vs DB\n');

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Master Excel not found:\n   ${EXCEL_PATH}`);
    console.error('\n   Add "all stock new.xlsx" to the "exel file/" folder and re-run.');
    console.error('   (Reimport cycle: reimport-clean.js -> dedupe-items.js -> verify-sections.js -> fix-recalc-mismatch.js)');
    process.exit(2);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  console.log(`   File: ${path.basename(EXCEL_PATH)}`);
  console.log(`   Sheets: ${wb.SheetNames.length} (${wb.SheetNames.join(', ')})\n`);

  // ===== 1. Read Excel: categories + stock per normalized category =====
  const excelByCat = new Map(); // norm(cat) -> { name, rows, stock }
  const sheetReport = [];
  let excelTotalStock = 0;
  let excelTotalRows = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const headerIdx = findHeaderRow(rows);
    if (headerIdx < 0) {
      sheetReport.push({ sheet: sheetName, status: 'NO HEADER', rows: 0 });
      continue;
    }
    const cols = mapColumns(rows[headerIdx]);
    if (cols.cat < 0 || cols.remain < 0) {
      sheetReport.push({
        sheet: sheetName,
        status: `MISSING COLS (cat=${cols.cat}, remain=${cols.remain})`,
        rows: 0,
      });
      continue;
    }

    let sheetRows = 0;
    let sheetStock = 0;
    const sheetCats = new Set();

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const catRaw = r[cols.cat];
      const nameRaw = cols.name >= 0 ? r[cols.name] : null;

      // Heading-row rule: category cell empty AND no item name => heading, not an item
      const hasCat = typeof catRaw === 'string' && catRaw.trim().length > 0;
      const hasName = typeof nameRaw === 'string' && nameRaw.trim().length > 0;
      if (!hasCat && !hasName) continue;

      // Section heading rows often repeat the category with no stock/name
      const remain = r[cols.remain];
      const stock = isNumeric(remain) ? toNum(remain) : 0;
      const nameLooksLikeItem = hasName && !CAT_RE.test(String(nameRaw));

      if (!hasCat && !nameLooksLikeItem) continue; // pure heading row
      if (hasName && stock === 0 && !isNumeric(remain) && !nameLooksLikeItem) continue;

      const catKey = norm(hasCat ? catRaw : '(unnamed)');
      if (!excelByCat.has(catKey)) {
        excelByCat.set(catKey, { name: String(catRaw || '(unnamed)').trim(), rows: 0, stock: 0 });
      }
      const entry = excelByCat.get(catKey);
      entry.rows += 1;
      entry.stock += stock;
      if (hasCat) sheetCats.add(String(catRaw).trim());

      sheetRows++;
      sheetStock += stock;
    }

    excelTotalRows += sheetRows;
    excelTotalStock += sheetStock;
    sheetReport.push({
      sheet: sheetName,
      status: 'OK',
      rows: sheetRows,
      stock: sheetStock,
      categories: sheetCats.size,
    });
  }

  console.log('   --- Excel sheets ---');
  for (const s of sheetReport) {
    if (s.status === 'OK') {
      console.log(`   ✅ ${s.sheet.padEnd(24)} rows=${String(s.rows).padStart(5)} stock=${s.stock} cats=${s.categories}`);
    } else {
      console.log(`   ❌ ${s.sheet.padEnd(24)} ${s.status}`);
    }
  }

  // ===== 2. Read DB =====
  const dbItems = await prisma.items.findMany({
    where: { is_active: true },
    select: { current_stock: true, category: { select: { name: true } } },
  });
  const dbByCat = new Map();
  let dbTotalStock = 0;
  let dbTotalRows = 0;
  for (const it of dbItems) {
    const key = norm(it.category?.name || '(uncategorized)');
    if (!dbByCat.has(key)) dbByCat.set(key, { name: it.category?.name || '(uncategorized)', rows: 0, stock: 0 });
    const e = dbByCat.get(key);
    e.rows += 1;
    e.stock += it.current_stock;
    dbTotalStock += it.current_stock;
    dbTotalRows += 1;
  }

  // ===== 3. Compare =====
  console.log('\n   --- Category comparison (Excel vs DB) ---');
  const allKeys = new Set([...excelByCat.keys(), ...dbByCat.keys()]);
  let catMismatch = 0;
  let stockMismatch = 0;
  const problems = [];

  for (const key of [...allKeys].sort()) {
    const x = excelByCat.get(key);
    const d = dbByCat.get(key);
    if (!x) {
      catMismatch++;
      problems.push(`   ⚠️ DB-only category: "${d.name}" (DB rows=${d.rows}, stock=${d.stock})`);
      continue;
    }
    if (!d) {
      catMismatch++;
      problems.push(`   ⚠️ Excel-only category: "${x.name}" (Excel rows=${x.rows}, stock=${x.stock})`);
      continue;
    }
    const stockDelta = d.stock - x.stock;
    if (Math.abs(stockDelta) > 0.001) {
      stockMismatch++;
      problems.push(
        `   ⚠️ Stock drift in "${x.name}": Excel=${x.stock} DB=${d.stock} (Δ${stockDelta > 0 ? '+' : ''}${stockDelta})`
      );
    }
  }

  if (problems.length) console.log(problems.join('\n'));
  else console.log('   ✅ All categories and stock match');

  console.log('\n   --- Totals ---');
  console.log(`   Excel: ${excelTotalRows} item rows | stock=${excelTotalStock} | categories=${excelByCat.size}`);
  console.log(`   DB   : ${dbTotalRows} active items | stock=${dbTotalStock} | categories=${dbByCat.size}`);

  const totalsMatch = Math.abs(dbTotalStock - excelTotalStock) < 0.001;
  const catsMatch = catMismatch === 0;
  const stockOk = stockMismatch === 0;

  if (catsMatch && stockOk && totalsMatch && excelTotalRows > 0) {
    console.log('\n✅ Self-verify PASSED: sections, categories and stock all match.');
    process.exit(0);
  } else {
    console.error('\n❌ Self-verify FAILED:');
    if (excelTotalRows === 0) console.error('   - No item rows detected in Excel (check heading rules/column names)');
    if (!catsMatch) console.error(`   - ${catMismatch} category mismatches`);
    if (!stockOk) console.error(`   - ${stockMismatch} categories with stock drift`);
    if (!totalsMatch) console.error(`   - Total stock drift: Excel=${excelTotalStock} DB=${dbTotalStock}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
