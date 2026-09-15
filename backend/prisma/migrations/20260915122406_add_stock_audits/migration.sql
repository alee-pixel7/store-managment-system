-- CreateTable
CREATE TABLE "stock_audits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "audit_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_audits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_audit_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "audit_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "system_qty" REAL NOT NULL,
    "counted_qty" REAL,
    "variance" REAL,
    "counted_at" DATETIME,
    "counted_by" TEXT,
    CONSTRAINT "stock_audit_lines_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "stock_audits" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_audit_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_audit_lines_audit_id_item_id_key" ON "stock_audit_lines"("audit_id", "item_id");
