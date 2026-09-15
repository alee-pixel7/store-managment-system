// Second pass: Add missing items from daily report and re-import transactions
const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE = path.resolve(__dirname, '../../../exel file');

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

function parseQtyUnit(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(PCS|KG|MTR|LTR|SET|NOS|BOX|PAIR)?$/i);
  if (match) return { quantity: parseFloat(match[1]), unit: (match[2] || 'PCS').toUpperCase() };
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) return { quantity: num, unit: 'PCS' };
  return null;
}

// Normalize string for fuzzy matching
function normalize(str) {
  return String(str || '').toLowerCase().replace(/[\s\-_\[\]\(\)\\\/]/g, '');
}

// Category mapping based on item name keywords
function guessCategory(name) {
  const n = normalize(name);
  if (n.includes('bearing') || n.includes('beaing')) return 'Bearings';
  if (n.includes('breaker') || n.includes('beaker')) return 'Breaker';
  if (n.includes('relay') || n.includes('overload')) return 'Relay';
  if (n.includes('contactor') || n.includes('conector')) return 'Contactor';
  if (n.includes('belt')) return 'Belts';
  if (n.includes('capistor') || n.includes('capacitor') || n.includes('caapist')) return 'Electrical - Capacitors';
  if (n.includes('fuse') || n.includes('fuser')) return 'Electrical - Fuses';
  if (n.includes('ssr') || n.includes('temperture') || n.includes('temperat') || n.includes('thermo')) return 'Electrical - Temperature';
  if (n.includes('switch') || n.includes('socket') || n.includes('button') || n.includes('plug')) return 'Electrical - Switches';
  if (n.includes('solenoid') || n.includes('pneumatic') || n.includes('cylider') || n.includes('regulator')) return 'Pneumatic';
  if (n.includes('blade') || n.includes('knive') || n.includes('cutting')) return 'Cutting Tools';
  if (n.includes('tape') || n.includes('cork')) return 'Tape & Adhesives';
  if (n.includes('cloth') || n.includes('adhsive') || n.includes('masking') || n.includes('white cloth')) return 'Cloth & Wrapping';
  if (n.includes('oil') || n.includes('grease') || n.includes('wd40') || n.includes('wd 40') || n.includes('silcon')) return 'Lubricants';
  if (n.includes('pprc') || n.includes('gi ') || n.includes('gi\\') || n.includes('ball value') || n.includes('gate value')) return 'Fittings';
  if (n.includes('sick') || n.includes('encoder') || n.includes('sensor') || n.includes('patlite')) return 'Sensors';
  if (n.includes('fan') || n.includes('heater') || n.includes('led') || n.includes('light') || n.includes('tube light')) return 'Electrical - Lighting';
  if (n.includes('wire') || n.includes('cable') || n.includes('socket')) return 'Electrical - Wiring';
  if (n.includes('drill') || n.includes('grinding') || n.includes('disc') || n.includes('brush') || n.includes('screw')) return 'Tools';
  if (n.includes('waste') || n.includes('bag') || n.includes('roll')) return 'Packaging';
  if (n.includes('nozel') || n.includes('nozzle') || n.includes('glue')) return 'Nozzles & Glue';
  if (n.includes('clampe') || n.includes('clamp') || n.includes('jubilee')) return 'Clamps & Fasteners';
  if (n.includes('sealing') || n.includes('shrink') || n.includes('wrapping')) return 'Packaging';
  if (n.includes('sleeve') || n.includes('treat rod') || n.includes('rubber')) return 'Rubber & Sleeves';
  if (n.includes('plastic ring') || n.includes('connector') || n.includes('pipe')) return 'Piping';
  if (n.includes('load cell') || n.includes('display') || n.includes('meter') || n.includes('volume')) return 'Instruments';
  if (n.includes('router') || n.includes('wifi') || n.includes('power supply')) return 'Electronics';
  if (n.includes('solar') || n.includes('y con') || n.includes('gear')) return 'Misc';
  if (n.includes('battery') || n.includes('cell')) return 'Electrical - Power';
  if (n.includes('carbon') || n.includes('oxide') || n.includes('fish eye')) return 'Printing';
  if (n.includes('samad') || n.includes('namada') || n.includes('treat') || n.includes('carbon')) return 'Printing';
  if (n.includes('died plug') || n.includes('flex') || n.includes('coupler')) return 'Piping';
  return 'General Store';
}

async function main() {
  console.log('🔍 Second pass: Adding missing items and re-importing daily report...\n');

  // Step 1: Delete existing OUT transactions (daily report ones)
  console.log('🗑️  Removing previous daily report transactions...');
  await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
  await prisma.$executeRaw`DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE txn_type = 'OUT')`;
  await prisma.$executeRaw`DELETE FROM transactions WHERE txn_type = 'OUT'`;
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  console.log('  ✅ Old OUT transactions removed\n');

  // Step 2: Get all existing items with their normalized names
  const allItems = await prisma.items.findMany({
    include: { item_aliases: { select: { alias_name: true } } },
  });
  const existingNames = new Map(); // normalized name -> item
  for (const item of allItems) {
    existingNames.set(normalize(item.item_name), item);
    // Also try matching with common typo fixes
    const fixed = normalize(item.item_name)
      .replace(/bearin/g, 'bearin')
      .replace(/bearing/g, 'bearing');
    existingNames.set(fixed, item);
    for (const alias of item.item_aliases) {
      existingNames.set(normalize(alias.alias_name), item);
    }
  }

  // Step 3: Parse daily report to find unmatched items
  const filePath = path.join(BASE, 'DAILY REPORT.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const unmatchedNames = new Map(); // name -> count of occurrences
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
    const itemName = String(row[2] || '').trim();
    if (!itemName) continue;

    const normalizedName = normalize(itemName);
    let found = existingNames.has(normalizedName);

    // Try typo-tolerant matching
    if (!found) {
      for (const [key, item] of existingNames) {
        if (key.includes(normalizedName) || normalizedName.includes(key)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      const count = (unmatchedNames.get(itemName) || 0) + 1;
      unmatchedNames.set(itemName, count);
    }
  }

  console.log(`📊 Unmatched unique items: ${unmatchedNames.size}`);

  // Step 4: Create categories and items for unmatched names
  const categories = new Map();
  let created = 0;
  let itemCode = (await prisma.items.count()) + 1;

  for (const [itemName, count] of unmatchedNames) {
    const catName = guessCategory(itemName);
    if (!categories.has(catName)) {
      const cat = await prisma.categories.upsert({
        where: { name: catName },
        update: {},
        create: { name: catName },
      });
      categories.set(catName, cat);
    }
    const cat = categories.get(catName);

    const prefix = catName.replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase();
    const code = `${prefix}-${String(itemCode++).padStart(3, '0')}`;

    try {
      await prisma.items.create({
        data: {
          item_code: code,
          item_name: itemName,
          category_id: cat.id,
          unit: 'PCS',
          min_stock: 0,
          current_stock: 0,
        },
      });
      created++;
    } catch (e) {
      console.log(`  ⚠️ Failed to create: ${itemName} - ${e.message}`);
    }
  }

  console.log(`✅ Created ${created} new items in ${categories.size} categories\n`);

  // Step 5: Rebuild fuzzy matching index
  const allItemsUpdated = await prisma.items.findMany({
    include: { item_aliases: { select: { alias_name: true } } },
  });
  const nameIndex = new Map();
  for (const item of allItemsUpdated) {
    nameIndex.set(normalize(item.item_name), item);
    for (const alias of item.item_aliases) {
      nameIndex.set(normalize(alias.alias_name), item);
    }
  }

  // Step 6: Re-import daily report transactions
  console.log('📝 Re-importing daily report transactions...');
  const headerRow = 3;
  const allPersons = await prisma.persons.findMany({ select: { id: true, name: true } });

  // Group by date for batch transaction creation
  const rowsByDate = new Map();
  let matched = 0, unmatched = 0, failed = 0;
  const unmatchedItems = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    const itemName = String(row[2] || '').trim();
    const dateValue = row[1];
    const machineName = String(row[3] || '').trim();
    const buyerName = String(row[4] || '').trim();
    const reason = String(row[5] || '').trim();
    const totalAmount = String(row[6] || '').trim();

    if (!itemName && !totalAmount) continue;

    const txnDate = parseDate(dateValue);
    if (!txnDate) { failed++; continue; }

    const parsed = parseQtyUnit(totalAmount);
    if (!parsed || parsed.quantity <= 0) { failed++; continue; }

    // Fuzzy match item
    const normalizedSearch = normalize(itemName);
    let matchedItem = nameIndex.get(normalizedSearch);

    if (!matchedItem) {
      // Typo-tolerant: find closest
      let bestLen = Infinity;
      for (const [key, item] of nameIndex) {
        if (key === normalizedSearch) { matchedItem = item; break; }
        // Check containment
        if (key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
          if (Math.abs(key.length - normalizedSearch.length) < bestLen) {
            bestLen = Math.abs(key.length - normalizedSearch.length);
            matchedItem = item;
          }
        }
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

      // Update stock
      for (const item of items) {
        const current = await prisma.items.findUnique({ where: { id: item.itemId }, select: { current_stock: true } });
        if (current) {
          await prisma.items.update({
            where: { id: item.itemId },
            data: { current_stock: Math.max(0, current.current_stock - item.quantity) },
          });
        }
      }

      txnCount++;
    } catch (e) {
      console.log(`  ⚠️ Failed to create transaction: ${e.message}`);
    }
  }

  console.log(`  ✅ Created ${txnCount} OUT transactions`);
  console.log(`  📊 Matched: ${matched}, Unmatched: ${unmatched}, Failed: ${failed}`);

  if (unmatchedItems.length > 0) {
    console.log(`\n  ⚠️ Remaining unmatched (${unmatchedItems.length}):`);
    unmatchedItems.slice(0, 15).forEach(u => console.log(`    Row ${u.row}: "${u.item_name}" (${u.buyer_name})`));
  }

  // Final summary
  const totalItems = await prisma.items.count();
  const totalCats = await prisma.categories.count();
  const totalTxns = await prisma.transactions.count();
  const totalPersons = await prisma.persons.count();

  console.log(`\n🎉 Second pass complete!`);
  console.log(`📊 Summary:`);
  console.log(`   Items: ${totalItems}`);
  console.log(`   Categories: ${totalCats}`);
  console.log(`   Transactions: ${totalTxns}`);
  console.log(`   Persons: ${totalPersons}`);
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
