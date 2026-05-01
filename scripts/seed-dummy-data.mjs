import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DEMO_ACCOUNTS = [
  { key: "current", name: "Demo Current Account", type: "current" },
  { key: "savings", name: "Demo Emergency Savings", type: "savings" },
  { key: "credit", name: "Demo Credit Card", type: "credit" },
];

const FINANCE_CATEGORIES = [
  "Salary",
  "Housing",
  "Groceries",
  "Utilities",
  "Transport",
  "Subscriptions",
  "Debt Repayment",
  "Discretionary",
  "Travel",
  "Health",
  "Savings",
];

const HABIT_CATEGORIES = ["Health", "Learning", "Home"];

const STARTING_BALANCES = {
  current: 1800,
  savings: 4200,
  credit: -3400,
};

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("Dummy seeding only supports SQLite DATABASE_URL values.");
  }

  const sqlitePath = databaseUrl.slice("file:".length);
  if (!sqlitePath || sqlitePath === ":memory:") {
    throw new Error("Dummy seeding needs a file-backed SQLite database.");
  }

  return path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), sqlitePath);
}

function checksum(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function ensureMigrations(db) {
  const migrationsPath = path.join(process.cwd(), "prisma", "migrations");

  if (!fs.existsSync(migrationsPath)) {
    throw new Error("Could not find prisma/migrations.");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);

  const applied = new Set(
    db
      .prepare(
        'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
      )
      .all()
      .map((record) => record.migration_name),
  );

  const migrations = fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of migrations) {
    if (applied.has(migrationName)) {
      continue;
    }

    const migrationSqlPath = path.join(
      migrationsPath,
      migrationName,
      "migration.sql",
    );
    const migrationSql = fs.readFileSync(migrationSqlPath, "utf8");
    const startedAt = new Date().toISOString();

    db.exec(migrationSql);
    db.prepare(
      `
        INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
      `,
    ).run(
      randomUUID(),
      checksum(migrationSql),
      new Date().toISOString(),
      migrationName,
      startedAt,
    );
  }
}

function money(amount) {
  return amount.toFixed(2);
}

function dateForMonth(monthStart, day) {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, 12),
  ).toISOString();
}

function addMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function getDemoMonths() {
  const today = new Date();
  const currentMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );

  return Array.from({ length: 18 }, (_, index) =>
    addMonths(currentMonth, index - 17),
  );
}

function upsertCategory(db, table, name) {
  db.prepare(`INSERT OR IGNORE INTO "${table}" ("name") VALUES (?)`).run(name);

  return db.prepare(`SELECT "id" FROM "${table}" WHERE "name" = ?`).get(name).id;
}

function deleteExistingDemoData(db) {
  const accountIds = db
    .prepare(
      `SELECT "id" FROM "Account" WHERE "name" IN (${DEMO_ACCOUNTS.map(() => "?").join(", ")})`,
    )
    .all(...DEMO_ACCOUNTS.map((account) => account.name))
    .map((account) => account.id);
  const habitIds = db
    .prepare(`SELECT "id" FROM "Habit" WHERE "name" LIKE 'Demo %'`)
    .all()
    .map((habit) => habit.id);
  const goalIds = db
    .prepare(`SELECT "id" FROM "Goal" WHERE "name" LIKE 'Demo %'`)
    .all()
    .map((goal) => goal.id);

  if (accountIds.length > 0) {
    const placeholders = accountIds.map(() => "?").join(", ");
    db.prepare(
      `DELETE FROM "Transaction" WHERE "accountId" IN (${placeholders}) OR "transferAccountId" IN (${placeholders})`,
    ).run(...accountIds, ...accountIds);
    db.prepare(`DELETE FROM "BudgetItem" WHERE "accountId" IN (${placeholders})`).run(
      ...accountIds,
    );
    db.prepare(`DELETE FROM "Account" WHERE "id" IN (${placeholders})`).run(
      ...accountIds,
    );
  }

  if (habitIds.length > 0) {
    const placeholders = habitIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM "HabitCompletion" WHERE "habitId" IN (${placeholders})`).run(
      ...habitIds,
    );
    db.prepare(`DELETE FROM "Habit" WHERE "id" IN (${placeholders})`).run(
      ...habitIds,
    );
  }

  if (goalIds.length > 0) {
    const placeholders = goalIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM "GoalMilestone" WHERE "goalId" IN (${placeholders})`).run(
      ...goalIds,
    );
    db.prepare(`DELETE FROM "Goal" WHERE "id" IN (${placeholders})`).run(
      ...goalIds,
    );
  }
}

function buildTransactions(accountIds, categoryIds) {
  const balances = { ...STARTING_BALANCES };
  const transactions = [];

  function addTransaction(transaction) {
    transactions.push(transaction);

    if (transaction.type === "transfer") {
      balances[transaction.from] -= transaction.amount;
      balances[transaction.to] += transaction.amount;
      return;
    }

    balances[transaction.account] += transaction.amount;
  }

  getDemoMonths().forEach((month, index) => {
    const salary = 3150 + index * 18 + (index >= 12 ? 180 : 0);
    const savingsTransfer = 360 + Math.min(index * 18, 340);
    const savingsGrowth = 12 + index * 2.5;
    const discretionary = 310 + ((index * 37) % 160);
    const groceries = 430 + ((index * 23) % 90);
    const travel = index === 14 ? 780 : index === 8 ? 240 : 0;

    addTransaction({
      date: dateForMonth(month, 1),
      type: "income",
      amount: salary,
      account: "current",
      categoryId: categoryIds.Salary,
    });
    addTransaction({
      date: dateForMonth(month, 2),
      type: "outgoing",
      amount: -1150,
      account: "current",
      categoryId: categoryIds.Housing,
    });
    addTransaction({
      date: dateForMonth(month, 4),
      type: "transfer",
      amount: savingsTransfer,
      from: "current",
      to: "savings",
    });
    addTransaction({
      date: dateForMonth(month, 4),
      type: "income",
      amount: savingsGrowth,
      account: "savings",
      categoryId: categoryIds.Savings,
    });
    addTransaction({
      date: dateForMonth(month, 5),
      type: "transfer",
      amount: 145,
      from: "current",
      to: "credit",
    });
    addTransaction({
      date: dateForMonth(month, 7),
      type: "outgoing",
      amount: -groceries,
      account: "current",
      categoryId: categoryIds.Groceries,
    });
    addTransaction({
      date: dateForMonth(month, 11),
      type: "outgoing",
      amount: -210,
      account: "current",
      categoryId: categoryIds.Utilities,
    });
    addTransaction({
      date: dateForMonth(month, 14),
      type: "outgoing",
      amount: -155,
      account: "current",
      categoryId: categoryIds.Transport,
    });
    addTransaction({
      date: dateForMonth(month, 17),
      type: "outgoing",
      amount: -68,
      account: "current",
      categoryId: categoryIds.Subscriptions,
    });
    addTransaction({
      date: dateForMonth(month, 22),
      type: "outgoing",
      amount: -discretionary,
      account: "current",
      categoryId: categoryIds.Discretionary,
    });

    if (travel > 0) {
      addTransaction({
        date: dateForMonth(month, 24),
        type: "outgoing",
        amount: -travel,
        account: "current",
        categoryId: categoryIds.Travel,
      });
    }

    if (index === 5 || index === 11 || index === 17) {
      addTransaction({
        date: dateForMonth(month, 26),
        type: "income",
        amount: 650 + index * 20,
        account: "current",
        categoryId: categoryIds.Salary,
      });
    }
  });

  return {
    balances,
    transactions: transactions.map((transaction) => {
      if (transaction.type === "transfer") {
        return {
          date: transaction.date,
          type: "transfer",
          amount: transaction.amount,
          accountId: accountIds[transaction.from],
          transferAccountId: accountIds[transaction.to],
          categoryId: null,
        };
      }

      return {
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        accountId: accountIds[transaction.account],
        transferAccountId: null,
        categoryId: transaction.categoryId,
      };
    }),
  };
}

function seedAccounts(db, categoryIds) {
  const placeholderBalances = new Map(
    DEMO_ACCOUNTS.map((account) => [account.key, STARTING_BALANCES[account.key]]),
  );
  const insertAccount = db.prepare(
    `INSERT INTO "Account" ("name", "balance", "type") VALUES (?, ?, ?)`,
  );

  const accountIds = {};
  for (const account of DEMO_ACCOUNTS) {
    const result = insertAccount.run(
      account.name,
      money(placeholderBalances.get(account.key)),
      account.type,
    );
    accountIds[account.key] = Number(result.lastInsertRowid);
  }

  const { balances, transactions } = buildTransactions(accountIds, categoryIds);
  const updateBalance = db.prepare(
    `UPDATE "Account" SET "balance" = ? WHERE "id" = ?`,
  );
  for (const account of DEMO_ACCOUNTS) {
    updateBalance.run(money(balances[account.key]), accountIds[account.key]);
  }

  const insertTransaction = db.prepare(
    `
      INSERT INTO "Transaction"
        ("date", "type", "amount", "categoryId", "accountId", "transferAccountId")
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  );

  for (const transaction of transactions) {
    insertTransaction.run(
      transaction.date,
      transaction.type,
      money(transaction.amount),
      transaction.categoryId,
      transaction.accountId,
      transaction.transferAccountId,
    );
  }

  return { accountIds, balances, transactionCount: transactions.length };
}

function seedBudgets(db, accountIds, categoryIds) {
  const budgets = [
    ["Demo Rent", 1150, 2, "Housing", "current"],
    ["Demo Groceries", 510, 7, "Groceries", "current"],
    ["Demo Utilities", 220, 11, "Utilities", "current"],
    ["Demo Travel card", 155, 14, "Transport", "current"],
    ["Demo Subscriptions", 68, 17, "Subscriptions", "current"],
    ["Demo Credit card minimum", 145, 5, "Debt Repayment", "credit"],
    ["Demo Fun money", 360, null, "Discretionary", "current"],
  ];
  const insertBudget = db.prepare(
    `
      INSERT INTO "BudgetItem"
        ("name", "amount", "dueDay", "categoryId", "accountId")
      VALUES (?, ?, ?, ?, ?)
    `,
  );

  for (const [name, amount, dueDay, category, account] of budgets) {
    insertBudget.run(
      name,
      money(amount),
      dueDay,
      categoryIds[category],
      accountIds[account],
    );
  }

  return budgets.length;
}

function seedGoals(db) {
  const insertGoal = db.prepare(
    `
      INSERT INTO "Goal"
        ("name", "type", "targetAmount", "currentAmount", "isComplete", "deadline")
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  );
  const insertMilestone = db.prepare(
    `
      INSERT INTO "GoalMilestone"
        ("name", "description", "deadline", "isComplete", "goalId")
      VALUES (?, ?, ?, ?, ?)
    `,
  );
  const today = new Date();
  const deadline = (months) =>
    addMonths(
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      months,
    ).toISOString();

  insertGoal.run(
    "Demo House deposit",
    "numerical",
    money(40000),
    money(18200),
    0,
    deadline(22),
  );
  insertGoal.run(
    "Demo Retirement pot",
    "numerical",
    money(250000),
    money(45500),
    0,
    deadline(180),
  );
  insertGoal.run(
    "Demo August holiday fund",
    "numerical",
    money(2500),
    money(1725),
    0,
    deadline(4),
  );

  const careerGoal = insertGoal.run(
    "Demo Career change plan",
    "milestone",
    null,
    null,
    0,
    deadline(8),
  ).lastInsertRowid;

  [
    ["Update CV", "Refresh experience and portfolio notes", 1],
    ["Shortlist roles", "Pick the best-fit companies and job titles", 1],
    ["Interview practice", "Run mock interviews and salary scenarios", 0],
  ].forEach(([name, description, isComplete], index) => {
    insertMilestone.run(name, description, deadline(index + 1), isComplete, careerGoal);
  });

  return 4;
}

function seedHabits(db) {
  const categoryIds = Object.fromEntries(
    HABIT_CATEGORIES.map((category) => [
      category,
      upsertCategory(db, "HabitCategory", category),
    ]),
  );
  const habits = [
    ["Demo Morning walk", categoryIds.Health, 1, null, 12],
    ["Demo Read before bed", categoryIds.Learning, 1, null, 8],
    ["Demo Weekly review", categoryIds.Home, 0, 1, 3],
  ];
  const insertHabit = db.prepare(
    `
      INSERT INTO "Habit" ("name", "categoryId", "streak", "isDaily", "frequency")
      VALUES (?, ?, ?, ?, ?)
    `,
  );
  const insertCompletion = db.prepare(
    `INSERT OR IGNORE INTO "HabitCompletion" ("date", "habitId") VALUES (?, ?)`,
  );
  const today = new Date();

  for (const [name, categoryId, isDaily, frequency, streak] of habits) {
    const habitId = Number(
      insertHabit.run(name, categoryId, streak, isDaily, frequency).lastInsertRowid,
    );

    for (let daysAgo = 0; daysAgo < 45; daysAgo += 1) {
      const shouldComplete = isDaily
        ? daysAgo % 5 !== 3
        : new Date(today.getTime() - daysAgo * 86_400_000).getUTCDay() === 1;

      if (!shouldComplete) {
        continue;
      }

      const completionDate = new Date(today.getTime() - daysAgo * 86_400_000);
      completionDate.setUTCHours(12, 0, 0, 0);
      insertCompletion.run(completionDate.toISOString(), habitId);
    }
  }

  return habits.length;
}

function main() {
  readEnvFile();

  const databasePath = resolveSqlitePath(
    process.env.DATABASE_URL ?? "file:./dev.db",
  );
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);

  try {
    db.pragma("foreign_keys = ON");
    ensureMigrations(db);

    const seed = db.transaction(() => {
      deleteExistingDemoData(db);

      const categoryIds = Object.fromEntries(
        FINANCE_CATEGORIES.map((category) => [
          category,
          upsertCategory(db, "FinanceCategory", category),
        ]),
      );
      const { accountIds, balances, transactionCount } = seedAccounts(
        db,
        categoryIds,
      );
      const budgetCount = seedBudgets(db, accountIds, categoryIds);
      const goalCount = seedGoals(db);
      const habitCount = seedHabits(db);

      return {
        balances,
        budgetCount,
        goalCount,
        habitCount,
        transactionCount,
      };
    });

    const result = seed();

    console.log(`Seeded dummy data in ${databasePath}`);
    console.log(`Transactions: ${result.transactionCount}`);
    console.log(`Budgets: ${result.budgetCount}`);
    console.log(`Goals: ${result.goalCount}`);
    console.log(`Habits: ${result.habitCount}`);
    console.log(
      `Ending balances: current ${money(result.balances.current)}, savings ${money(
        result.balances.savings,
      )}, credit ${money(result.balances.credit)}`,
    );
  } finally {
    db.close();
  }
}

main();
