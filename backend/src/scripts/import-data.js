// Import Script — Reads all Excel files and imports real data
// Run with: cd backend && node dist/scripts/import-data.js

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE = path.resolve(__dirname, '../../../exel file');

// ============================================================
// HELPER: Generate item code from sheet prefix + number
// ============================================================
function generateItemCode(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// ============================================================
// HELPER: Detect header row (first row with ≥2 non-empty strings)
// ============================================================
function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim().length > 0);
    if (nonEmpty.length >= 2) return i;
  }
  return 0;
}

// ============================================================
// HELPER: Get column index by fuzzy header matching
// ============================================================
function findColumn(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toLowerCase().replace(/[\s\-_]/g, '');
    for (const alias of aliases) {
      if (h === alias || h.includes(alias) || alias.includes(h)) return i;
    }
  }
  return -1;
}

// ============================================================
// HELPER: Parse quantity from "1 PCS", "5 PCS", "2PCS" etc
// ============================================================
function parseQtyUnit(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(PCS|KG|MTR|LTR|SET|NOS|BOX|PAIR)?$/i);
  if (match) return { quantity: parseFloat(match[1]), unit: (match[2] || 'PCS').toUpperCase() };
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) return { quantity: num, unit: 'PCS' };
  return null;
}

// ============================================================
// HELPER: Parse date (Excel serial, backslash, slash, standard)
// ============================================================
function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    const epoch = new Date(1900, 0, 1);
    const d = new Date(epoch.getTime() + (value - 2) * 86400000);
    if (!isNaN(d.getTime())) return d;
  }
  const str = String(value).trim();
  const bsMatch = str.match(/^(\d{1,2})\\(\d{1,2})\\(\d{2,4})$/);
  if (bsMatch) {
    const m = parseInt(bsMatch[1]), day = parseInt(bsMatch[2]);
    let y = parseInt(bsMatch[3]); if (y < 100) y += 2000;
    const d = new Date(y, m - 1, day);
    if (!isNaN(d.getTime())) return d;
  }
  const slMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slMatch) {
    const m = parseInt(slMatch[1]), day = parseInt(slMatch[2]);
    let y = parseInt(slMatch[3]); if (y < 100) y += 2000;
    const d = new Date(y, m - 1, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// ============================================================
// STEP 1: WIPE SAMPLE DATA
// ============================================================
async function wipeSampleData() {
  console.log('\n🗑️  Wiping sample data...');
  await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
  await prisma.$executeRaw`DELETE FROM transaction_items`;
  await prisma.$executeRaw`DELETE FROM transactions`;
  await prisma.$executeRaw`DELETE FROM item_aliases`;
  await prisma.$executeRaw`DELETE FROM items`;
  await prisma.$executeRaw`DELETE FROM categories`;
  await prisma.$executeRaw`DELETE FROM departments`;
  await prisma.$executeRaw`DELETE FROM machines`;
  await prisma.$executeRaw`DELETE FROM persons`;
  await prisma.$executeRaw`DELETE FROM suppliers`;
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  console.log('✅ Sample data wiped');
}

// ============================================================
// STEP 2: IMPORT ITEMS FROM BREAKER,CONACTOR,RELAY.xlsx
// ============================================================
async function importItemsFromFile1() {
  console.log('\n📦 Importing items from BREAKER,CONACTOR,RELAY.xlsx...');
  const filePath = path.join(BASE, 'BREAKER,CONACTOR,RELAY.xlsx');
  const wb = XLSX.readFile(filePath);

  let totalImported = 0;
  let totalSkipped = 0;
  const sheetPrefixes = {
    'BREAKER RELAY ETC': null, // handled specially (3 side-by-side tables)
    'SHANXI BARREN': 'SHX',
    'WORLDLY GRAVOURE': 'WRG',
    'SINOMECH': 'SNC',
    'BAG MAKING': 'BGM',
    'COMEXI LAMINATION': 'CML',
    'METALIZER': 'MTZ',
    'SLITTINGS': 'SLT',
    'BELTS': 'BLT',
    'UV REBORN MACHINE': 'UVB',
    'PNEUMATIC': 'PNT',
    'DIAPPER CUTTING': 'DPC',
    '3 LAYER EXTRUDER': '3LE',
    'MONO LAYER EXTRUDER': 'MLE',
  };

  // Special handling for BREAKER RELAY ETC (3 side-by-side tables)
  const brkWs = wb.Sheets['BREAKER RELAY ETC'];
  if (brkWs) {
    const brkData = XLSX.utils.sheet_to_json(brkWs, { header: 1 });
    const headerRow = detectHeaderRow(brkData);
    const headers = brkData[headerRow] || [];

    // Table 1: Breaker (cols 1-6)
    const breakerCat = await prisma.categories.upsert({
      where: { name: 'Breaker' },
      update: {},
      create: { name: 'Breaker' },
    });

    // Table 2: Contactor (cols 9-14)
    const contactorCat = await prisma.categories.upsert({
      where: { name: 'Contactor' },
      update: {},
      create: { name: 'Contactor' },
    });

    // Table 3: Relay (cols 17-22)
    const relayCat = await prisma.categories.upsert({
      where: { name: 'Relay' },
      update: {},
      create: { name: 'Relay' },
    });

    let brkCode = 1, cntCode = 1, rlyCode = 1;
    const existingCodes = new Set();

    for (let i = headerRow + 1; i < brkData.length; i++) {
      const row = brkData[i];
      if (!row) continue;

      // Breaker table (cols 1-6)
      const brkName = row[2];
      if (brkName && typeof brkName === 'string' && brkName.trim().length > 1) {
        const code = generateItemCode('BRK', brkCode++);
        if (!existingCodes.has(code)) {
          const stock = Number(row[4]) || 0;
          await prisma.items.create({
            data: {
              item_code: code,
              item_name: brkName.trim(),
              category_id: breakerCat.id,
              brand: row[3] ? String(row[3]).trim() : null,
              unit: 'PCS',
              min_stock: 0,
              current_stock: stock,
              notes: row[3] ? `Ampere: ${String(row[3]).trim()}` : null,
            },
          });
          existingCodes.add(code);
          totalImported++;
        }
      }

      // Contactor table (cols 9-14)
      const cntName = row[10];
      if (cntName && typeof cntName === 'string' && cntName.trim().length > 1) {
        const code = generateItemCode('CNT', cntCode++);
        if (!existingCodes.has(code)) {
          const stock = Number(row[13]) || 0;
          await prisma.items.create({
            data: {
              item_code: code,
              item_name: cntName.trim(),
              category_id: contactorCat.id,
              brand: row[11] ? String(row[11]).trim() : null,
              unit: 'PCS',
              min_stock: 0,
              current_stock: stock,
              notes: row[11] ? `Ampere: ${String(row[11]).trim()}` : null,
            },
          });
          existingCodes.add(code);
          totalImported++;
        }
      }

      // Relay table (cols 17-22)
      const rlyName = row[18];
      if (rlyName && typeof rlyName === 'string' && rlyName.trim().length > 1) {
        const code = generateItemCode('RLY', rlyCode++);
        if (!existingCodes.has(code)) {
          const stock = Number(row[21]) || 0;
          await prisma.items.create({
            data: {
              item_code: code,
              item_name: rlyName.trim(),
              category_id: relayCat.id,
              brand: row[19] ? String(row[19]).trim() : null,
              unit: 'PCS',
              min_stock: 0,
              current_stock: stock,
              notes: row[19] ? `Range: ${String(row[19]).trim()}` : null,
            },
          });
          existingCodes.add(code);
          totalImported++;
        }
      }
    }
    console.log(`  ✅ BREAKER RELAY ETC: ${totalImported} items (Breaker + Contactor + Relay)`);
  }

  // Handle remaining sheets (skip BREAKER RELAY ETC)
  for (const sheetName of wb.SheetNames) {
    if (sheetName === 'BREAKER RELAY ETC') continue;

    const prefix = sheetPrefixes[sheetName] || sheetName.substring(0, 3).toUpperCase();
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 2) continue;

    const headerRow = detectHeaderRow(data);
    const headers = data[headerRow] || [];

    // Find column indices
    const nameCol = findColumn(headers, ['partsname', 'partname', 'name', 'parsname']);
    const specCol = findColumn(headers, ['specification', 'spcification', 'specification', 'specification', 'spcification', 'speciition', 'spec']);
    const stockCol = findColumn(headers, ['remaning', 'remining', 'remanings', 'remanning', 'remannings', 'totalremaningstock']);
    const issueCol = findColumn(headers, ['issue']);
    const stockOrigCol = findColumn(headers, ['stock']);

    // Create category
    const cat = await prisma.categories.upsert({
      where: { name: sheetName.trim() },
      update: {},
      create: { name: sheetName.trim() },
    });

    let itemCode = 1;
    let sheetImported = 0;
    let sheetSkipped = 0;
    const existingCodes = new Set();

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
      if (!name || name.length < 2) continue;

      // Skip header-like rows
      if (name.match(/^sr\s/i) || name.match(/^stock|^issue|^reman|^pars|^parts|^part\s/i)) continue;

      const code = generateItemCode(prefix, itemCode++);
      if (existingCodes.has(code)) continue;

      // Get stock: prefer REMANING, fallback to STOCK - ISSUE
      let stock = 0;
      if (stockCol >= 0) {
        stock = Number(row[stockCol]) || 0;
      } else if (stockOrigCol >= 0 && issueCol >= 0) {
        const orig = Number(row[stockOrigCol]) || 0;
        const issued = Number(row[issueCol]) || 0;
        stock = orig - issued;
      }

      const spec = specCol >= 0 ? String(row[specCol] || '').trim() : '';

      try {
        await prisma.items.create({
          data: {
            item_code: code,
            item_name: name,
            category_id: cat.id,
            brand: null,
            unit: 'PCS',
            min_stock: 0,
            current_stock: stock,
            notes: spec || null,
          },
        });
        existingCodes.add(code);
        sheetImported++;
        totalImported++;
      } catch (e) {
        sheetSkipped++;
        totalSkipped++;
      }
    }

    console.log(`  ✅ ${sheetName}: ${sheetImported} items`);
  }

  console.log(`\n📊 Total items imported: ${totalImported}, skipped: ${totalSkipped}`);
  return totalImported;
}

// ============================================================
// STEP 3: IMPORT ITEMS FROM New XLSX Worksheet.xlsx
// ============================================================
async function importItemsFromFile2() {
  console.log('\n📦 Importing items from New XLSX Worksheet.xlsx...');
  const filePath = path.join(BASE, 'New XLSX Worksheet.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (data.length < 2) {
    console.log('  ⚠️ No data found');
    return 0;
  }

  const headerRow = detectHeaderRow(data);
  const headers = data[headerRow] || [];

  // This file has side-by-side tables. Table 1 starts at col 1, Table 2 at col 11
  // Table 1: PPRC FITTING (cols 1-4)
  // Table 2: G.I FITTING (cols 11-14)

  const pprcCat = await prisma.categories.upsert({
    where: { name: 'PPRC FITTING' },
    update: {},
    create: { name: 'PPRC FITTING' },
  });

  const giCat = await prisma.categories.upsert({
    where: { name: 'G.I FITTING' },
    update: {},
    create: { name: 'G.I FITTING' },
  });

  let pprcCode = 1, giCode = 1;
  let totalImported = 0;
  const existingCodes = new Set();

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    // PPRC FITTING (cols 1-4)
    const pprcName = row[1];
    if (pprcName && typeof pprcName === 'string' && pprcName.trim().length > 1) {
      const code = generateItemCode('PPR', pprcCode++);
      if (!existingCodes.has(code)) {
        const stock = Number(row[2]) || 0;
        await prisma.items.create({
          data: {
            item_code: code,
            item_name: pprcName.trim(),
            category_id: pprcCat.id,
            unit: 'PCS',
            min_stock: 0,
            current_stock: stock,
          },
        });
        existingCodes.add(code);
        totalImported++;
      }
    }

    // G.I FITTING (cols 11-14)
    const giName = row[11];
    if (giName && typeof giName === 'string' && giName.trim().length > 1) {
      const code = generateItemCode('GIF', giCode++);
      if (!existingCodes.has(code)) {
        const stock = Number(row[12]) || 0;
        await prisma.items.create({
          data: {
            item_code: code,
            item_name: giName.trim(),
            category_id: giCat.id,
            unit: 'PCS',
            min_stock: 0,
            current_stock: stock,
          },
        });
        existingCodes.add(code);
        totalImported++;
      }
    }
  }

  console.log(`  ✅ PPRC FITTING + G.I FITTING: ${totalImported} items`);
  return totalImported;
}

// ============================================================
// STEP 4: CREATE ADJUST TRANSACTIONS FOR OPENING STOCK
// ============================================================
async function createAdjustTransactions() {
  console.log('\n📝 Creating ADJUST transactions for opening stock...');
  const items = await prisma.items.findMany({
    where: { current_stock: { gt: 0 } },
    select: { id: true, item_code: true, item_name: true, current_stock: true },
  });

  const year = new Date().getFullYear();
  let txnCount = 0;

  for (const item of items) {
    const txnNo = `ADJUST-${year}-${String(txnCount + 1).padStart(4, '0')}`;
    try {
      await prisma.transactions.create({
        data: {
          txn_no: txnNo,
          txn_type: 'ADJUST',
          txn_date: new Date(),
          purpose: 'Opening stock import',
          remarks: `Imported from Excel: ${item.item_code}`,
          created_by: 1, // admin user
          transaction_items: {
            create: {
              item_id: item.id,
              quantity: item.current_stock,
              line_remarks: 'Opening stock from Excel import',
            },
          },
        },
      });
      txnCount++;
    } catch (e) {
      console.log(`  ⚠️ Failed to create ADJUST for ${item.item_code}: ${e.message}`);
    }
  }

  console.log(`  ✅ Created ${txnCount} ADJUST transactions`);
  return txnCount;
}

// ============================================================
// STEP 5: IMPORT DAILY REPORT TRANSACTIONS
// ============================================================
async function importDailyReport() {
  console.log('\n📝 Importing daily report transactions...');
  const filePath = path.join(BASE, 'DAILY REPORT.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Header is at row 3
  const headerRow = 3;
  const headers = data[headerRow] || [];
  console.log(`  Headers: ${JSON.stringify(headers)}`);

  // Get all items for fuzzy matching
  const allItems = await prisma.items.findMany({
    include: { item_aliases: { select: { alias_name: true } } },
  });

  // Get all persons
  const allPersons = await prisma.persons.findMany({ select: { id: true, name: true } });

  // Find column indices
  const dateCol = 1;
  const itemCol = 2;
  const machineCol = 3;
  const buyerCol = 4;
  const reasonCol = 5;
  const amountCol = 6;

  // Group rows by date for batch import
  const rowsByDate = new Map();
  let matched = 0, unmatched = 0, failed = 0;
  const unmatchedItems = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    const itemName = String(row[itemCol] || '').trim();
    const dateValue = row[dateCol];
    const machineName = String(row[machineCol] || '').trim();
    const buyerName = String(row[buyerCol] || '').trim();
    const reason = String(row[reasonCol] || '').trim();
    const totalAmount = String(row[amountCol] || '').trim();

    if (!itemName && !totalAmount) continue;

    const txnDate = parseDate(dateValue);
    if (!txnDate) { failed++; continue; }

    const parsed = parseQtyUnit(totalAmount);
    if (!parsed || parsed.quantity <= 0) { failed++; continue; }

    // Fuzzy match item
    const normalizedSearch = itemName.toLowerCase().replace(/[\s\-_]/g, '');
    let matchedItem = null;

    for (const item of allItems) {
      if (item.item_name.toLowerCase() === itemName.toLowerCase()) { matchedItem = item; break; }
      const normalizedName = item.item_name.toLowerCase().replace(/[\s\-_]/g, '');
      if (normalizedName === normalizedSearch) { matchedItem = item; break; }
      for (const alias of item.item_aliases) {
        if (alias.alias_name.toLowerCase() === itemName.toLowerCase()) { matchedItem = item; break; }
      }
      if (matchedItem) break;
      if (item.item_name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.item_name.toLowerCase())) {
        matchedItem = item;
      }
    }

    if (!matchedItem) {
      unmatched++;
      unmatchedItems.push({ row: i + 1, item_name: itemName, buyer_name: buyerName });
      continue;
    }

    matched++;

    // Find or create person
    let personId = null;
    if (buyerName) {
      const existingPerson = allPersons.find(p => p.name.toLowerCase() === buyerName.toLowerCase());
      if (existingPerson) {
        personId = existingPerson.id;
      } else {
        const newPerson = await prisma.persons.create({ data: { name: buyerName } });
        allPersons.push(newPerson);
        personId = newPerson.id;
      }
    }

    // Find machine
    let machineId = null;
    if (machineName) {
      const existingMachine = await prisma.machines.findFirst({
        where: { name: { contains: machineName } },
      });
      if (existingMachine) machineId = existingMachine.id;
    }

    const dateKey = txnDate.toISOString().split('T')[0];
    if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
    rowsByDate.get(dateKey).push({
      itemId: matchedItem.id,
      quantity: parsed.quantity,
      personId,
      machineId,
      reason,
    });
  }

  // Create transactions grouped by date
  const year = new Date().getFullYear();
  let txnCount = 0;

  for (const [, items] of rowsByDate) {
    if (items.length === 0) continue;

    try {
      const txnNo = `OUT-${year}-${String(txnCount + 1).padStart(4, '0')}`;
      const firstItem = items[0];

      await prisma.transactions.create({
        data: {
          txn_no: txnNo,
          txn_type: 'OUT',
          txn_date: new Date(),
          person_id: firstItem.personId,
          machine_id: firstItem.machineId,
          purpose: firstItem.reason || 'Daily report import',
          remarks: 'Imported from daily report Excel',
          created_by: 1,
          transaction_items: {
            create: items.map(item => ({
              item_id: item.itemId,
              quantity: item.quantity,
              line_remarks: item.reason || null,
            })),
          },
        },
      });

      // Update stock for each item
      for (const item of items) {
        const current = await prisma.items.findUnique({ where: { id: item.itemId }, select: { current_stock: true } });
        if (current) {
          await prisma.items.update({
            where: { id: item.itemId },
            data: { current_stock: current.current_stock - item.quantity },
          });
        }
      }

      txnCount++;
    } catch (e) {
      console.log(`  ⚠️ Failed to create transaction: ${e.message}`);
    }
  }

  console.log(`  ✅ Created ${txnCount} OUT transactions from daily report`);
  console.log(`  📊 Matched: ${matched}, Unmatched: ${unmatched}, Failed: ${failed}`);
  if (unmatchedItems.length > 0) {
    console.log(`  ⚠️ Unmatched items (first 10):`);
    unmatchedItems.slice(0, 10).forEach(u => console.log(`    Row ${u.row}: "${u.item_name}" (buyer: ${u.buyer_name})`));
  }

  return txnCount;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Starting data import...\n');

  // Step 1: Wipe
  await wipeSampleData();

  // Step 2: Import items from file 1
  const items1 = await importItemsFromFile1();

  // Step 3: Import items from file 2
  const items2 = await importItemsFromFile2();

  // Step 4: Create ADJUST transactions
  await createAdjustTransactions();

  // Step 5: Import daily report
  await importDailyReport();

  // Summary
  const totalItems = await prisma.items.count();
  const totalCats = await prisma.categories.count();
  const totalTxns = await prisma.transactions.count();
  const totalPersons = await prisma.persons.count();

  console.log('\n🎉 Import complete!');
  console.log(`📊 Summary:`);
  console.log(`   Items: ${totalItems}`);
  console.log(`   Categories: ${totalCats}`);
  console.log(`   Transactions: ${totalTxns}`);
  console.log(`   Persons: ${totalPersons}`);
}

main()
  .catch(e => { console.error('❌ Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
