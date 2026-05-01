ALTER TABLE "Transaction" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'outgoing';

UPDATE "Transaction"
SET "type" = CASE
    WHEN "transferAccountId" IS NOT NULL THEN 'transfer'
    WHEN CAST("amount" AS REAL) >= 0 THEN 'income'
    ELSE 'outgoing'
END;

CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
