PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'outgoing',
    "amount" DECIMAL NOT NULL,
    "categoryId" INTEGER,
    "accountId" INTEGER NOT NULL,
    "transferAccountId" INTEGER,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Transaction" ("accountId", "amount", "categoryId", "date", "id", "transferAccountId", "type")
SELECT "accountId", "amount", "categoryId", "date", "id", "transferAccountId", "type" FROM "Transaction";

DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

CREATE TABLE "new_BudgetItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dueDay" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "BudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_BudgetItem" ("accountId", "amount", "categoryId", "dueDay", "id", "name")
SELECT "accountId", "amount", "categoryId", "dueDay", "id", "name" FROM "BudgetItem";

DROP TABLE "BudgetItem";
ALTER TABLE "new_BudgetItem" RENAME TO "BudgetItem";

CREATE TABLE "new_InvestmentSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "value" DECIMAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "InvestmentSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_InvestmentSnapshot" ("accountId", "date", "id", "value")
SELECT "accountId", "date", "id", "value" FROM "InvestmentSnapshot";

DROP TABLE "InvestmentSnapshot";
ALTER TABLE "new_InvestmentSnapshot" RENAME TO "InvestmentSnapshot";

CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_transferAccountId_idx" ON "Transaction"("transferAccountId");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "BudgetItem_accountId_idx" ON "BudgetItem"("accountId");
CREATE INDEX "BudgetItem_categoryId_idx" ON "BudgetItem"("categoryId");
CREATE UNIQUE INDEX "InvestmentSnapshot_accountId_date_key" ON "InvestmentSnapshot"("accountId", "date");
CREATE INDEX "InvestmentSnapshot_accountId_idx" ON "InvestmentSnapshot"("accountId");
CREATE INDEX "InvestmentSnapshot_date_idx" ON "InvestmentSnapshot"("date");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
