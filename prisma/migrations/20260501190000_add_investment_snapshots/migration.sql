-- CreateTable
CREATE TABLE "InvestmentSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "value" DECIMAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "InvestmentSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentSnapshot_accountId_date_key" ON "InvestmentSnapshot"("accountId", "date");

-- CreateIndex
CREATE INDEX "InvestmentSnapshot_accountId_idx" ON "InvestmentSnapshot"("accountId");

-- CreateIndex
CREATE INDEX "InvestmentSnapshot_date_idx" ON "InvestmentSnapshot"("date");
