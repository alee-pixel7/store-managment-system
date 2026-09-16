// Stock Audit Service Layer
// Handles physical stock count sessions with variance tracking and ADJUST transactions

import prisma from '../lib/prisma';
import { generateTxnNo, recalculateStock } from '../utils/stock';

export interface AuditSummary {
  id: number;
  auditDate: Date;
  status: string;
  createdBy: string;
  notes: string | null;
  totalItems: number;
  countedItems: number;
  variances: number;
}

export interface AuditDetail extends AuditSummary {
  lines: Array<{
    id: number;
    itemId: number;
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    systemQty: number;
    countedQty: number | null;
    variance: number | null;
    countedAt: Date | null;
    countedBy: string | null;
  }>;
}

export interface VarianceReport {
  auditId: number;
  auditDate: Date;
  totalItems: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
  variances: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    systemQty: number;
    countedQty: number;
    variance: number;
    varianceValue: number;
    rate: number;
  }>;
}

// ============================================================
// START NEW AUDIT
// ============================================================
export async function startAudit(userId: number, notes?: string): Promise<AuditSummary> {
  // Check if there's already an active audit
  const activeAudit = await prisma.stock_audits.findFirst({
    where: { status: { in: ['DRAFT', 'IN_PROGRESS'] } },
  });

  if (activeAudit) {
    throw new Error('An active audit already exists. Finalise or cancel it first.');
  }

  // Get all active items
  const items = await prisma.items.findMany({
    where: { is_active: true },
    orderBy: { item_code: 'asc' },
  });

  // Create the audit with lines
  const audit = await prisma.$transaction(async (tx) => {
    // Create audit header
    const newAudit = await tx.stock_audits.create({
      data: {
        created_by: userId,
        notes: notes || null,
        status: 'IN_PROGRESS',
      },
    });

    // Create audit lines with current system_qty
    const lines = items.map((item) => ({
      audit_id: newAudit.id,
      item_id: item.id,
      system_qty: item.current_stock,
      counted_qty: null as number | null,
      variance: null as number | null,
      counted_at: null as Date | null,
      counted_by: null as string | null,
    }));

    await tx.stock_audit_lines.createMany({ data: lines });

    return newAudit;
  });

  return getAuditSummary(audit.id);
}

// ============================================================
// GET AUDIT SUMMARY
// ============================================================
export async function getAuditSummary(auditId: number): Promise<AuditSummary> {
  const audit = await prisma.stock_audits.findUnique({
    where: { id: auditId },
    include: {
      creator: { select: { full_name: true } },
      lines: true,
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  const totalItems = audit.lines.length;
  const countedItems = audit.lines.filter((l) => l.counted_qty !== null).length;
  const variances = audit.lines.filter((l) => l.variance !== null && l.variance !== 0).length;

  return {
    id: audit.id,
    auditDate: audit.audit_date,
    status: audit.status,
    createdBy: audit.creator.full_name,
    notes: audit.notes,
    totalItems,
    countedItems,
    variances,
  };
}

// ============================================================
// GET AUDIT DETAIL (with all lines)
// ============================================================
export async function getAuditDetail(auditId: number): Promise<AuditDetail> {
  const audit = await prisma.stock_audits.findUnique({
    where: { id: auditId },
    include: {
      creator: { select: { full_name: true } },
      lines: {
        include: {
          item: {
            select: {
              item_code: true,
              item_name: true,
              brand: true,
              unit: true,
            },
          },
        },
        orderBy: { item: { item_code: 'asc' } },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  const totalItems = audit.lines.length;
  const countedItems = audit.lines.filter((l) => l.counted_qty !== null).length;
  const variances = audit.lines.filter((l) => l.variance !== null && l.variance !== 0).length;

  return {
    id: audit.id,
    auditDate: audit.audit_date,
    status: audit.status,
    createdBy: audit.creator.full_name,
    notes: audit.notes,
    totalItems,
    countedItems,
    variances,
    lines: audit.lines.map((l) => ({
      id: l.id,
      itemId: l.item_id,
      itemCode: l.item.item_code,
      itemName: l.item.item_name,
      brand: l.item.brand,
      unit: l.item.unit,
      systemQty: l.system_qty,
      countedQty: l.counted_qty,
      variance: l.variance,
      countedAt: l.counted_at,
      countedBy: l.counted_by,
    })),
  };
}

// ============================================================
// COUNT ITEM (enter physical count)
// ============================================================
export async function countItem(
  auditId: number,
  itemId: number,
  countedQty: number,
  countedBy: string
): Promise<void> {
  const audit = await prisma.stock_audits.findUnique({ where: { id: auditId } });

  if (!audit) {
    throw new Error('Audit not found');
  }

  if (audit.status === 'FINALISED') {
    throw new Error('Cannot count items in a finalised audit');
  }

  // Update the audit line
  const line = await prisma.stock_audit_lines.findFirst({
    where: { audit_id: auditId, item_id: itemId },
  });

  if (!line) {
    throw new Error('Item not found in this audit');
  }

  const variance = countedQty - line.system_qty;

  await prisma.stock_audit_lines.update({
    where: { id: line.id },
    data: {
      counted_qty: countedQty,
      variance,
      counted_at: new Date(),
      counted_by: countedBy,
    },
  });
}

// ============================================================
// SEARCH ITEMS IN AUDIT
// ============================================================
export async function searchAuditItems(auditId: number, query: string) {
  const audit = await prisma.stock_audits.findUnique({ where: { id: auditId } });

  if (!audit) {
    throw new Error('Audit not found');
  }

  const searchTerm = query.trim().toUpperCase();

  const lines = await prisma.stock_audit_lines.findMany({
    where: {
      audit_id: auditId,
      item: {
        OR: [
          { item_code: { contains: searchTerm } },
          { item_name: { contains: searchTerm } },
          { brand: { contains: searchTerm } },
          { item_aliases: { some: { alias_name: { contains: searchTerm } } } },
        ],
      },
    },
    include: {
      item: {
        select: {
          item_code: true,
          item_name: true,
          brand: true,
          unit: true,
          rack_location: true,
        },
      },
    },
    take: 20,
  });

  return lines.map((l) => ({
    lineId: l.id,
    itemId: l.item_id,
    itemCode: l.item.item_code,
    itemName: l.item.item_name,
    brand: l.item.brand,
    unit: l.item.unit,
    rackLocation: l.item.rack_location,
    systemQty: l.system_qty,
    countedQty: l.counted_qty,
    variance: l.variance,
  }));
}

// ============================================================
// GET VARIANCE REPORT
// ============================================================
export async function getVarianceReport(auditId: number): Promise<VarianceReport> {
  const audit = await prisma.stock_audits.findUnique({
    where: { id: auditId },
    include: {
      lines: {
        include: {
          item: {
            select: {
              item_code: true,
              item_name: true,
              brand: true,
              unit: true,
              last_rate: true,
            },
          },
        },
        where: {
          counted_qty: { not: null },
          variance: { not: 0 },
        },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  const allLines = await prisma.stock_audit_lines.findMany({
    where: { audit_id: auditId },
  });

  const totalItems = allLines.length;
  const itemsWithVariance = audit.lines.length;
  const totalVarianceValue = audit.lines.reduce((sum, l) => {
    const rate = l.item.last_rate || 0;
    return sum + Math.abs(l.variance || 0) * rate;
  }, 0);

  return {
    auditId: audit.id,
    auditDate: audit.audit_date,
    totalItems,
    itemsWithVariance,
    totalVarianceValue,
    variances: audit.lines.map((l) => ({
      itemCode: l.item.item_code,
      itemName: l.item.item_name,
      brand: l.item.brand,
      unit: l.item.unit,
      systemQty: l.system_qty,
      countedQty: l.counted_qty!,
      variance: l.variance!,
      varianceValue: Math.abs(l.variance!) * (l.item.last_rate || 0),
      rate: l.item.last_rate || 0,
    })),
  };
}

// ============================================================
// FINALISE AUDIT
// ============================================================
export async function finaliseAudit(auditId: number, userId: number): Promise<void> {
  const audit = await prisma.stock_audits.findUnique({
    where: { id: auditId },
    include: {
      lines: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  if (audit.status === 'FINALISED') {
    throw new Error('Audit is already finalised');
  }

  // Check all items have been counted
  const uncounted = audit.lines.filter((l) => l.counted_qty === null);
  if (uncounted.length > 0) {
    throw new Error(`${uncounted.length} items have not been counted yet`);
  }

  // Create ADJUST transactions for variances
  const year = new Date().getFullYear();

  await prisma.$transaction(async (tx) => {
    // Create adjustment transaction header
    const txnNo = await generateTxnNo('ADJUST', year, tx);
    const transaction = await tx.transactions.create({
      data: {
        txn_no: txnNo,
        txn_type: 'ADJUST',
        txn_date: new Date(),
        purpose: `Stock Audit #${auditId} - Physical Count Adjustment`,
        remarks: `Audit ID: ${auditId}. ${audit.notes || ''}`,
        created_by: userId,
      },
    });

    // Create transaction items for variances and update stock
    for (const line of audit.lines) {
      if (line.variance !== null && line.variance !== 0) {
        // Create transaction item (variance is already signed: positive = surplus, negative = deficit)
        await tx.transaction_items.create({
          data: {
            transaction_id: transaction.id,
            item_id: line.item_id,
            quantity: line.variance,
            rate: line.item.last_rate || 0,
            line_remarks: `Audit adjustment: system=${line.system_qty}, counted=${line.counted_qty}`,
          },
        });

        // Recalculate stock
        const newStock = await recalculateStock(line.item_id, tx);

        // Update item stock
        await tx.items.update({
          where: { id: line.item_id },
          data: { current_stock: newStock },
        });
      }
    }

    // Mark audit as finalised
    await tx.stock_audits.update({
      where: { id: auditId },
      data: { status: 'FINALISED' },
    });
  });
}

// ============================================================
// LIST ALL AUDITS
// ============================================================
export async function listAudits(): Promise<AuditSummary[]> {
  const audits = await prisma.stock_audits.findMany({
    include: {
      creator: { select: { full_name: true } },
      lines: true,
    },
    orderBy: { created_at: 'desc' },
  });

  return audits.map((audit) => ({
    id: audit.id,
    auditDate: audit.audit_date,
    status: audit.status,
    createdBy: audit.creator.full_name,
    notes: audit.notes,
    totalItems: audit.lines.length,
    countedItems: audit.lines.filter((l) => l.counted_qty !== null).length,
    variances: audit.lines.filter((l) => l.variance !== null && l.variance !== 0).length,
  }));
}
