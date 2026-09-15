// CLEAN REIMPORT - Correct column mappings + proper categories
const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = path.resolve(__dirname, '../../../exel file');

function code(prefix, n) { return `${prefix}-${String(n).padStart(3, '0')}`; }
function num(v) { return Number(v) || 0; }
function str(v) { return String(v || '').trim(); }
function normalize(s) { return String(s || '').toLowerCase().replace(/[\s\-_\[\]\(\)\\\/]/g, ''); }

function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    const d = new Date(new Date(1900, 0, 1).getTime() + (value - 2) * 86400000);
    if (!isNaN(d.getTime())) return d;
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{1,2})\\(\d{1,2})\\(\d{2,4})$/);
  if (!m) m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let y = parseInt(m[3]); if (y < 100) y += 2000;
    const d = new Date(y, parseInt(m[1]) - 1, parseInt(m[2]));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseQtyUnit(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s*(PCS|KG|MTR|LTR|SET|NOS|BOX|PAIR)?$/i);
  if (m) return { quantity: parseFloat(m[1]), unit: (m[2] || 'PCS').toUpperCase() };
  const n = parseFloat(value);
  return (!isNaN(n) && n > 0) ? { quantity: n, unit: 'PCS' } : null;
}

// ============================================================
// CATEGORY DEFINITIONS - Clean, organized structure
// ============================================================
const CATS = {
  // Machine-specific parts
  '3 Layer Extruder':       '3LE',
  'Mono Layer Extruder':    'MLE',
  'Slitting':               'SLT',
  'Bag Making':             'BGM',
  'Shanxi Barren':          'SHX',
  'Worldly Gravoure':       'WRG',
  'Sinomech':               'SNC',
  'Comexi Lamination':      'CML',
  'Metalizer':              'MTZ',
  'UV Reborn':              'UVB',
  'Diapper Cutting':        'DPC',
  // Electrical components
  'Breakers & Fuses':       'BRK',
  'Contactors & Relays':    'CNT',
  'Sensors & Proximity':    'SNS',
  'Drives & Motors':        'DRV',
  'PLCs & Controllers':     'PLC',
  // Mechanical components
  'Bearings':               'BRG',
  'Belts & Chains':         'BLT',
  'Pneumatic & Valves':     'PNT',
  'Oil Seals & O-Rings':    'SEL',
  // Consumables & general
  'PPRC & GI Fittings':     'FIT',
  'Tape & Adhesives':       'TAP',
  'Cloth & Wrapping':       'CLT',
  'Lubricants & Chemicals': 'LUB',
  'Cutting & Grinding':     'CUT',
  'Tools & Fasteners':      'TL',
  'Electrical - Wiring':    'WR',
  'Electrical - Power':     'PW',
  'Packaging & Storage':    'PKG',
  'Printing & Copying':     'PRT',
  'General Store':          'GEN',
};

async function main() {
  console.log('🚀 Clean reimport starting...\n');

  // ========== WIPE ==========
  console.log('🗑️  Wiping database...');
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
  console.log('  ✅ Wiped\n');

  // ========== CREATE CATEGORIES ==========
  console.log('📁 Creating categories...');
  const catMap = {};
  for (const [name, prefix] of Object.entries(CATS)) {
    const cat = await prisma.categories.create({ data: { name } });
    catMap[name] = { ...cat, prefix };
    console.log(`  ✅ ${name}`);
  }

  // ========== HELPER: create item ==========
  let allCodes = new Set();
  let globalCounter = 0;
  async function createItem(catName, name, spec, stock) {
    if (!name || name.length < 2) return null;
    // Skip header-like garbage
    if (/^(sr\s|stock|issue|reman|pars|parts|part\s|name|ampere|no\s)/i.test(name)) return null;
    // Skip machine-name-only items
    if (/^(SHANXI BARREN|BAG MAKING|SINOMECH)$/i.test(name)) return null;

    const cat = catMap[catName];
    if (!cat) return null;
    const c = code(cat.prefix, ++globalCounter);
    if (allCodes.has(c)) return null;
    allCodes.add(c);

    const notes = spec || null;
    return prisma.items.create({
      data: {
        item_code: c,
        item_name: name,
        category_id: cat.id,
        unit: 'PCS',
        min_stock: 0,
        current_stock: stock,
        notes,
      },
    });
  }

  // ========== IMPORT FILE 1: BREAKER,CONACTOR,RELAY.xlsx ==========
  console.log('\n📦 Importing BREAKER,CONACTOR,RELAY.xlsx...');
  const wb1 = XLSX.readFile(path.join(BASE, 'BREAKER,CONACTOR,RELAY.xlsx'));

  // --- BREAKER RELAY ETC: 3 side-by-side tables ---
  {
    const ws = wb1.Sheets['BREAKER RELAY ETC'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    let count = 0;

    for (let i = 6; i < data.length; i++) {
      const r = data[i];
      if (!r) continue;

      // Breaker: cols 2=NAME, 3=AMPERE, 4=STOCK, 5=ISSUE, 6=REMAINING
      const bName = str(r[2]);
      if (bName && bName.length > 1 && !/^(NAME|SR|FUSE HOLDER)$/i.test(bName)) {
        const stock = num(r[4]);
        const spec = str(r[3]) ? `Amp: ${str(r[3])}` : null;
        await createItem('Breakers & Fuses', bName, spec, stock);
        count++;
      }

      // Contactor: cols 10=NAME, 11=AMPERE, 12=STOCK, 13=ISSUE, 14=REMAINING
      const cName = str(r[10]);
      if (cName && cName.length > 1 && !/^(NAME|SR|COIL)/i.test(cName.substring(0, 4))) {
        // Actually keep COIL items
      }
      if (cName && cName.length > 1) {
        const stock = num(r[13]);
        const spec = str(r[11]) ? `Amp: ${str(r[11])}` : null;
        await createItem('Contactors & Relays', cName, spec, stock);
        count++;
      }

      // Relay: cols 18=NAME, 19=AMPERE, 20=STOCK, 21=ISSUE, 22=REMAINING
      const rlName = str(r[18]);
      if (rlName && rlName.length > 1 && !/^(NAME|SR|AMPERE|NO)/i.test(rlName)) {
        const stock = num(r[21]);
        const spec = str(r[19]) ? `Range: ${str(r[19])}` : null;
        await createItem('Contactors & Relays', rlName, spec, stock);
        count++;
      }
    }
    console.log(`  ✅ BREAKER RELAY ETC: ${count} items`);
  }

  // --- Other sheets: nameCol is ALWAYS col 2, specCol is col 3 ---
  // (verified from the header analysis above)
  const sheets = {
    'SHANXI BARREN': { nameCol: 2, specCol: 3, stockCol: 5, issueCol: 6, remainCol: 7, cat: 'Shanxi Barren' },
    'WORLDLY GRAVOURE': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Worldly Gravoure' },
    'SINOMECH': { nameCol: 2, specCol: 3, stockCol: 5, issueCol: 6, remainCol: 7, cat: 'Sinomech' },
    'BAG MAKING': { nameCol: 2, specCol: 3, stockCol: 4, issueCol: 5, remainCol: 6, cat: 'Bag Making' },
    'COMEXI LAMINATION': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Comexi Lamination' },
    'METALIZER': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Metalizer' },
    'SLITTINGS': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Slitting' },
    'BELTS': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Belts & Chains' },
    'UV REBORN MACHINE': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'UV Reborn' },
    'PNEUMATIC': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Pneumatic & Valves' },
    'DIAPPER CUTTING': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Diapper Cutting' },
    '3 LAYER EXTRUDER': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: '3 Layer Extruder' },
    'MONO LAYER EXTRUDER': { nameCol: 1, specCol: 2, stockCol: 3, issueCol: 4, remainCol: 5, cat: 'Mono Layer Extruder' },
  };

  for (const [sheetName, cfg] of Object.entries(sheets)) {
    const ws = wb1.Sheets[sheetName];
    if (!ws) { console.log(`  ⚠️ Sheet "${sheetName}" not found`); continue; }
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    let count = 0;
    for (let i = 6; i < data.length; i++) {
      const r = data[i];
      if (!r) continue;
      const name = str(r[cfg.nameCol]);
      if (!name || name.length < 2) continue;
      const spec = str(r[cfg.specCol]);
      const remain = num(r[cfg.remainCol]);
      const stock = remain > 0 ? remain : num(r[cfg.stockCol]) - num(r[cfg.issueCol]);
      const item = await createItem(cfg.cat, name, spec, stock);
      if (item) count++;
    }
    console.log(`  ✅ ${sheetName}: ${count} items`);
  }

  // ========== IMPORT FILE 2: New XLSX Worksheet.xlsx ==========
  console.log('\n📦 Importing New XLSX Worksheet.xlsx...');
  const wb2 = XLSX.readFile(path.join(BASE, 'New XLSX Worksheet.xlsx'));
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
  let count2 = 0;
  for (let i = 4; i < data2.length; i++) {
    const r = data2[i];
    if (!r) continue;
    // PPRC: col 1=name, 2=stock
    const pprcName = str(r[1]);
    if (pprcName && pprcName.length > 1 && !/^(PART NAME|STOCK|SR)/i.test(pprcName)) {
      await createItem('PPRC & GI Fittings', pprcName, null, num(r[2]));
      count2++;
    }
    // GI FITTING: col 11=name, 12=stock
    const giName = str(r[11]);
    if (giName && giName.length > 1 && !/^(PART NAME|STOCK|SR|G\.I|DETAIL)/i.test(giName)) {
      await createItem('PPRC & GI Fittings', giName, null, num(r[12]));
      count2++;
    }
  }
  console.log(`  ✅ PPRC & G.I FITTING: ${count2} items`);

  // ========== CLASSIFY DAILY REPORT ITEMS ==========
  console.log('\n📦 Creating items from daily report (unmatched ones)...');
  const wb3 = XLSX.readFile(path.join(BASE, 'DAILY REPORT.xlsx'));
  const ws3 = wb3.Sheets[wb3.SheetNames[0]];
  const data3 = XLSX.utils.sheet_to_json(ws3, { header: 1 });

  // Get current items for matching
  const existingItems = await prisma.items.findMany({ select: { id: true, item_name: true } });
  const existingIndex = new Map();
  for (const item of existingItems) {
    existingIndex.set(normalize(item.item_name), item);
  }

  // Classify daily report items into proper categories
  function classifyItem(name) {
    const n = normalize(name);
    if (/bearin|620[0-9]|600[0-9]|601[0-9]|630[0-9]|511[0-9]|320[0-9]/.test(n)) return 'Bearings';
    if (/break|beaker|fuse/.test(n)) return 'Breakers & Fuses';
    if (/relay|overload/.test(n) && !/solenoid|phase/.test(n)) return 'Contactors & Relays';
    if (/contactor|conector|schnider|schneider/.test(n)) return 'Contactors & Relays';
    if (/ssr|temperture|temperat|thermo|tc-|nbf/.test(n)) return 'PLCs & Controllers';
    if (/solenoid|pneumatic|cyclinder|regulator|co24|coi24|coil 24|air|nozel|nozzle|drain|auto drain|frl/.test(n)) return 'Pneumatic & Valves';
    if (/capistor|capacitor|caapist/.test(n)) return 'Electrical - Power';
    if (/sick|sensor|encoder|proximit|fish eye|patlite/.test(n)) return 'Sensors & Proximity';
    if (/switch|socket|button|bed sw|emergence|female sw|male.*sw/.test(n)) return 'Electrical - Wiring';
    if (/wire|cable|cord/.test(n)) return 'Electrical - Wiring';
    if (/led|tube light|bulb|lamp|fan motor|blower|panel fan/.test(n)) return 'Electrical - Power';
    if (/tape|cork/.test(n)) return 'Tape & Adhesives';
    if (/cloth|adhsive|masking|white cloth|oxide/.test(n)) return 'Cloth & Wrapping';
    if (/oil|grease|wd.?40|silcon|silicon|lube|comprssor oil/.test(n)) return 'Lubricants & Chemicals';
    if (/blade|knive|cutting|grind|disc|brush|screw|driver|steel brush/.test(n)) return 'Cutting & Grinding';
    if (/pprc|tee|elbow|bend|socket|ball value|gate value|flow value|died plug/.test(n)) return 'PPRC & GI Fittings';
    if (/load cell|display|meter|volume|gauge|guage|scale/.test(n)) return 'PLCs & Controllers';
    if (/clamp|jubilee|cable tie|rivet/.test(n)) return 'Tools & Fasteners';
    if (/sleeve|rubber|silicon tube|treat rod/.test(n)) return 'Oil Seals & O-Rings';
    if (/sealing|shrink|wrap|carton|bag|waste/.test(n)) return 'Packaging & Storage';
    if (/carbon|oxide|samad|namada|printing/.test(n)) return 'Printing & Copying';
    if (/pump|solar|wifi|router|power supply|battery|cell|adapter/.test(n)) return 'Electrical - Power';
    if (/belt|410 h|880/.test(n)) return 'Belts & Chains';
    if (/plastic ring|connector|pipe|coupler|tee [0-9]/.test(n)) return 'PPRC & GI Fittings';
    if (/relay with|schne|schndeider|phase relay|pilz/.test(n)) return 'Contactors & Relays';
    if (/heater/.test(n)) return 'PLCs & Controllers';
    if (/refrigerent|wd 40|cork/.test(n)) return 'Lubricants & Chemicals';
    if (/lock tite|nose piller|rivet/.test(n)) return 'Tools & Fasteners';
    if (/rubber roller/.test(n)) return 'Oil Seals & O-Rings';
    return 'General Store';
  }

  // Count unique items
  const dailyReportItems = new Map();
  for (let i = 4; i < data3.length; i++) {
    const r = data3[i];
    if (!r || !r[2]) continue;
    const name = str(r[2]);
    if (!name || dailyReportItems.has(name)) continue;
    const n = normalize(name);
    // Skip if already exists
    if (existingIndex.has(n)) continue;
    dailyReportItems.set(name, classifyItem(name));
  }

  let drCount = 0;
  for (const [name, catName] of dailyReportItems) {
    const item = await createItem(catName, name, null, 0);
    if (item) drCount++;
  }
  console.log(`  ✅ Created ${drCount} new items from daily report`);

  // ========== ADJUST TRANSACTIONS ==========
  console.log('\n📝 Creating ADJUST transactions...');
  const items = await prisma.items.findMany({
    where: { current_stock: { gt: 0 } },
    select: { id: true, item_code: true, current_stock: true },
  });
  let adjCount = 0;
  const year = new Date().getFullYear();
  for (const item of items) {
    const txnNo = `ADJUST-${year}-${String(adjCount + 1).padStart(4, '0')}`;
    try {
      await prisma.transactions.create({
        data: {
          txn_no: txnNo,
          txn_type: 'ADJUST',
          txn_date: new Date(),
          purpose: 'Opening stock import',
          remarks: `Imported: ${item.item_code}`,
          created_by: 2,
          transaction_items: {
            create: { item_id: item.id, quantity: item.current_stock, line_remarks: 'Opening stock' },
          },
        },
      });
      adjCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`  ✅ Created ${adjCount} ADJUST transactions`);

  // ========== DAILY REPORT TRANSACTIONS ==========
  console.log('\n📝 Importing daily report transactions...');
  const allItemsRefreshed = await prisma.items.findMany({ select: { id: true, item_name: true } });
  const itemIndex = new Map();
  for (const item of allItemsRefreshed) {
    itemIndex.set(normalize(item.item_name), item);
  }

  const headerRow = 3;
  const allPersons = [];
  const rowsByDate = new Map();
  let matched = 0, unmatched = 0, failed = 0;

  for (let i = headerRow + 1; i < data3.length; i++) {
    const r = data3[i];
    if (!r || r.every(c => c === null || c === undefined || c === '')) continue;

    const itemName = str(r[2]);
    const dateValue = r[1];
    const buyerName = str(r[4]);
    const reason = str(r[5]);
    const totalAmount = str(r[6]);

    if (!itemName || !totalAmount) continue;

    const txnDate = parseDate(dateValue);
    if (!txnDate) { failed++; continue; }
    const parsed = parseQtyUnit(totalAmount);
    if (!parsed || parsed.quantity <= 0) { failed++; continue; }

    // Fuzzy match
    const ns = normalize(itemName);
    let matchedItem = itemIndex.get(ns);
    if (!matchedItem) {
      for (const [key, item] of itemIndex) {
        if (key.includes(ns) || ns.includes(key)) { matchedItem = item; break; }
      }
    }
    if (!matchedItem) { unmatched++; continue; }
    matched++;

    let personId = null;
    if (buyerName) {
      let existing = allPersons.find(p => p.name === buyerName);
      if (existing) {
        personId = existing.id;
      } else {
        const newP = await prisma.persons.create({ data: { name: buyerName } });
        allPersons.push(newP);
        personId = newP.id;
      }
    }

    const dateKey = txnDate.toISOString().split('T')[0];
    if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
    rowsByDate.get(dateKey).push({ itemId: matchedItem.id, quantity: parsed.quantity, personId, reason });
  }

  let outCount = 0;
  for (const [, items] of rowsByDate) {
    if (items.length === 0) continue;
    try {
      const txnNo = `OUT-${year}-${String(outCount + 1).padStart(4, '0')}`;
      await prisma.transactions.create({
        data: {
          txn_no: txnNo,
          txn_type: 'OUT',
          txn_date: new Date(),
          person_id: items[0].personId,
          purpose: items[0].reason || 'Daily report',
          remarks: 'Imported from daily report',
          created_by: 2,
          transaction_items: {
            create: items.map(item => ({
              item_id: item.itemId,
              quantity: item.quantity,
              line_remarks: item.reason || null,
            })),
          },
        },
      });
      for (const item of items) {
        const cur = await prisma.items.findUnique({ where: { id: item.itemId }, select: { current_stock: true } });
        if (cur) {
          await prisma.items.update({
            where: { id: item.itemId },
            data: { current_stock: Math.max(0, cur.current_stock - item.quantity) },
          });
        }
      }
      outCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`  ✅ Created ${outCount} OUT transactions (matched: ${matched}, unmatched: ${unmatched}, failed: ${failed})`);

  // ========== SUMMARY ==========
  const totalItems = await prisma.items.count();
  const totalCats = await prisma.categories.count();
  const totalTxns = await prisma.transactions.count();
  const totalPersons = await prisma.persons.count();

  console.log(`\n🎉 Reimport complete!`);
  console.log(`📊 Items: ${totalItems} | Categories: ${totalCats} | Transactions: ${totalTxns} | Persons: ${totalPersons}`);

  // Show category breakdown
  const cats = await prisma.categories.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { items: { _count: 'desc' } },
  });
  console.log('\n📁 Categories:');
  for (const c of cats) {
    if (c._count.items > 0) console.log(`  ${c.name}: ${c._count.items}`);
  }
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
