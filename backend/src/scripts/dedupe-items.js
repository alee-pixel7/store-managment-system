// ============================================================
// dedupe-items.js — Merge duplicate items safely
//
// Rules (idempotent — re-running is safe):
//   - Only merges SAME category + same normalized name + same
//     normalized spec/notes
//   - Same name but different value/spec = different items,
//     NEVER merged (SINGLE POLE 10A vs 6A, HEATER sizes, ...)
//   - Keeper: most transactions -> highest stock -> lowest code
//   - Stock SUMMED into keeper (no stock loss)
//   - Transaction lines reassigned to keeper
//   - Duplicates soft-deleted (is_active=false), never hard-deleted
//   - Cross-category pairs left alone (machine-specific parts)
//
// Usage:  node src/scripts/dedupe-items.js [--dry-run]
// ============================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry-run');

// Normalization: case, spaces, dashes, brackets, slashes
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-_[\](){}\\/,.]+/g, '')
    .trim();
}

async function main() {
  console.log(`\n🔎 Looking for duplicate items${DRY ? ' (DRY RUN)' : ''}...`);
  console.log('   Rule: same category + same name + same spec/notes\n');

  const items = await prisma.items.findMany({
    where: { is_active: true },
    include: {
      item_aliases: { select: { id: true } },
      _count: { select: { transaction_items: true } },
    },
  });

  const txCounts = new Map();
  for (const it of items) txCounts.set(it.id, it._count.transaction_items);

  // Group by category + normalized name + normalized spec
  const groups = new Map();
  for (const it of items) {
    const key = [
      it.category_id ?? 'null',
      norm(it.item_name),
      norm(it.spec) + '|' + norm(it.notes),
    ].join('::');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`   Items: ${items.length} | Duplicate groups: ${dupGroups.length}`);

  if (dupGroups.length === 0) {
    console.log('✅ No duplicates — nothing to merge (0 groups left).');
    return;
  }

  // Sort each group: most txns -> highest stock -> lowest code
  const plan = [];
  for (const g of dupGroups) {
    const sorted = [...g].sort((a, b) => {
      const ta = txCounts.get(a.id) || 0;
      const tb = txCounts.get(b.id) || 0;
      if (tb !== ta) return tb - ta;
      if (b.current_stock !== a.current_stock) return b.current_stock - a.current_stock;
      return a.item_code.localeCompare(b.item_code);
    });
    const [keeper, ...dupes] = sorted;
    plan.push({ keeper, dupes });
  }

  let totalDupes = 0;
  for (const { keeper, dupes } of plan) {
    totalDupes += dupes.length;
    const dupeInfo = dupes.map((d) => `${d.item_code}(stock=${d.current_stock},txns=${txCounts.get(d.id) || 0})`).join(', ');
    console.log(`   ${keeper.item_code} KEEPS <- ${dupeInfo}`);
  }
  console.log(`\n   Total duplicates to merge: ${totalDupes}`);

  if (DRY) {
    console.log('🏁 Dry run — no changes written.');
    return;
  }

  let mergedGroups = 0;
  let mergedDupes = 0;

  for (const { keeper, dupes } of plan) {
    await prisma.$transaction(async (tx) => {
      for (const d of dupes) {
        // 1. Reassign transaction lines to keeper
        await tx.transaction_items.updateMany({
          where: { item_id: d.id },
          data: { item_id: keeper.id },
        });

        // 2. Reassign audit lines (merge when keeper already has a line
        //    in the same audit — (audit_id, item_id) is unique)
        const dupeAuditLines = await tx.stock_audit_lines.findMany({ where: { item_id: d.id } });
        for (const line of dupeAuditLines) {
          const existing = await tx.stock_audit_lines.findUnique({
            where: { audit_id_item_id: { audit_id: line.audit_id, item_id: keeper.id } },
          });
          if (existing) {
            // Merge: combine physical counts and system snapshot, then drop dupe line
            const counted = (existing.counted_qty ?? 0) + (line.counted_qty ?? 0);
            const system = existing.system_qty + line.system_qty;
            await tx.stock_audit_lines.update({
              where: { id: existing.id },
              data: {
                counted_qty: counted,
                system_qty: system,
                variance: line.variance == null && existing.variance == null
                  ? null
                  : counted - system,
              },
            });
            await tx.stock_audit_lines.delete({ where: { id: line.id } });
          } else {
            await tx.stock_audit_lines.update({
              where: { id: line.id },
              data: { item_id: keeper.id },
            });
          }
        }

        // 3. Move aliases to keeper (skip ones keeper already has)
        const keeperAliases = new Set(
          (await tx.item_aliases.findMany({ where: { item_id: keeper.id } })).map((a) =>
            String(a.alias_name).toUpperCase()
          )
        );
        const aliases = await tx.item_aliases.findMany({ where: { item_id: d.id } });
        for (const a of aliases) {
          const upper = String(a.alias_name).toUpperCase();
          if (!keeperAliases.has(upper)) {
            await tx.item_aliases.update({
              where: { id: a.id },
              data: { item_id: keeper.id },
            });
            keeperAliases.add(upper); // track it — prevents case-variant collision below
          } else {
            await tx.item_aliases.delete({ where: { id: a.id } });
          }
        }

        // 4. Soft-delete the duplicate (never hard delete)
        await tx.items.update({
          where: { id: d.id },
          data: { is_active: false },
        });

        mergedDupes++;
      }

      // 5. Stock: recount keeper from reassigned lines (sums naturally)
      const rows = await tx.transaction_items.findMany({
        where: { item_id: keeper.id },
        include: { transaction: { select: { txn_type: true, is_reversed: true } } },
      });
      let stock = 0;
      for (const r of rows) {
        if (r.transaction.is_reversed) continue;
        if (r.transaction.txn_type === 'OUT') stock -= r.quantity;
        else stock += r.quantity;
      }
      // Fallback: if keeper had no transactions, sum displayed stocks
      if (rows.length === 0) {
        stock = keeper.current_stock + dupes.reduce((s, d) => s + d.current_stock, 0);
      }
      await tx.items.update({
        where: { id: keeper.id },
        data: { current_stock: stock },
      });
    });
    mergedGroups++;
  }

  console.log(`\n🎉 Merged ${mergedDupes} duplicates across ${mergedGroups} groups.`);
  console.log('   Duplicates are soft-deleted (is_active=false) — restorable if needed.');

  // Idempotency check: re-run grouping, must be 0 groups left
  const itemsAfter = await prisma.items.findMany({
    where: { is_active: true },
    select: { id: true, category_id: true, item_name: true, spec: true, notes: true },
  });
  const groupsAfter = new Map();
  for (const it of itemsAfter) {
    const key = [it.category_id ?? 'null', norm(it.item_name), norm(it.spec) + '|' + norm(it.notes)].join('::');
    groupsAfter.set(key, (groupsAfter.get(key) || 0) + 1);
  }
  const left = [...groupsAfter.values()].filter((n) => n > 1).length;
  if (left === 0) {
    console.log('✅ Self-verify PASSED: 0 duplicate groups left');
  } else {
    console.error(`❌ Self-verify: ${left} groups left (should be 0)`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
