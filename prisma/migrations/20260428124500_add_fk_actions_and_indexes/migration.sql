PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CheckInComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "checkInId" INTEGER NOT NULL,
    CONSTRAINT "CheckInComment_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_CheckInComment" ("checkInId", "content", "id")
SELECT "checkInId", "content", "id" FROM "CheckInComment";

DROP TABLE "CheckInComment";
ALTER TABLE "new_CheckInComment" RENAME TO "CheckInComment";

CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL NOT NULL,
    "categoryId" INTEGER,
    "accountId" INTEGER NOT NULL,
    "transferAccountId" INTEGER,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Transaction" ("accountId", "amount", "categoryId", "date", "id", "transferAccountId")
SELECT "accountId", "amount", "categoryId", "date", "id", "transferAccountId" FROM "Transaction";

DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

CREATE TABLE "new_Habit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "isDaily" BOOLEAN NOT NULL,
    "frequency" INTEGER,
    CONSTRAINT "Habit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HabitCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Habit" ("categoryId", "frequency", "id", "isDaily", "name", "streak")
SELECT "categoryId", "frequency", "id", "isDaily", "name", "streak" FROM "Habit";

DROP TABLE "Habit";
ALTER TABLE "new_Habit" RENAME TO "Habit";

CREATE TABLE "new_HabitCompletion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habitId" INTEGER NOT NULL,
    CONSTRAINT "HabitCompletion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_HabitCompletion" ("date", "habitId", "id")
SELECT "date", "habitId", "id" FROM "HabitCompletion";

DROP TABLE "HabitCompletion";
ALTER TABLE "new_HabitCompletion" RENAME TO "HabitCompletion";

CREATE TABLE "new_BudgetItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dueDay" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "BudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_BudgetItem" ("accountId", "amount", "categoryId", "dueDay", "id", "name")
SELECT "accountId", "amount", "categoryId", "dueDay", "id", "name" FROM "BudgetItem";

DROP TABLE "BudgetItem";
ALTER TABLE "new_BudgetItem" RENAME TO "BudgetItem";

CREATE TABLE "new_GoalMilestone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "deadline" DATETIME,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "goalId" INTEGER NOT NULL,
    CONSTRAINT "GoalMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_GoalMilestone" ("deadline", "description", "goalId", "id", "isComplete", "name")
SELECT "deadline", "description", "goalId", "id", "isComplete", "name" FROM "GoalMilestone";

DROP TABLE "GoalMilestone";
ALTER TABLE "new_GoalMilestone" RENAME TO "GoalMilestone";

CREATE INDEX "CheckInComment_checkInId_idx" ON "CheckInComment"("checkInId");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_transferAccountId_idx" ON "Transaction"("transferAccountId");
CREATE INDEX "Habit_categoryId_idx" ON "Habit"("categoryId");
CREATE INDEX "HabitCompletion_habitId_idx" ON "HabitCompletion"("habitId");
CREATE UNIQUE INDEX "HabitCompletion_habitId_date_key" ON "HabitCompletion"("habitId", "date");
CREATE INDEX "BudgetItem_accountId_idx" ON "BudgetItem"("accountId");
CREATE INDEX "BudgetItem_categoryId_idx" ON "BudgetItem"("categoryId");
CREATE INDEX "GoalMilestone_goalId_idx" ON "GoalMilestone"("goalId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
