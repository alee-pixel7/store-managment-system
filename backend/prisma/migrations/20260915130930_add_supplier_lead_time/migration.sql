-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "lead_time_days" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT
);
INSERT INTO "new_suppliers" ("address", "id", "name", "notes", "phone") SELECT "address", "id", "name", "notes", "phone" FROM "suppliers";
DROP TABLE "suppliers";
ALTER TABLE "new_suppliers" RENAME TO "suppliers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
