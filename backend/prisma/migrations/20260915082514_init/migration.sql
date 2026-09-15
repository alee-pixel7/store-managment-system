-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "category_id" INTEGER,
    "brand" TEXT,
    "unit" TEXT NOT NULL,
    "min_stock" REAL NOT NULL DEFAULT 0,
    "rack_location" TEXT,
    "current_stock" REAL NOT NULL DEFAULT 0,
    "last_rate" REAL,
    "barcode" TEXT,
    "image_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "item_aliases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item_id" INTEGER NOT NULL,
    "alias_name" TEXT NOT NULL,
    CONSTRAINT "item_aliases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "departments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "machines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "department_id" INTEGER,
    CONSTRAINT "machines_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "persons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "department_id" INTEGER,
    "phone" TEXT,
    CONSTRAINT "persons_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txn_no" TEXT NOT NULL,
    "txn_type" TEXT NOT NULL,
    "txn_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_id" INTEGER,
    "invoice_no" TEXT,
    "department_id" INTEGER,
    "machine_id" INTEGER,
    "person_id" INTEGER,
    "purpose" TEXT,
    "remarks" TEXT,
    "reverses_txn_id" INTEGER,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_reverses_txn_id_fkey" FOREIGN KEY ("reverses_txn_id") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "rate" REAL,
    "line_remarks" TEXT,
    CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transaction_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "items_item_code_key" ON "items"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "item_aliases_item_id_alias_name_key" ON "item_aliases"("item_id", "alias_name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txn_no_key" ON "transactions"("txn_no");
