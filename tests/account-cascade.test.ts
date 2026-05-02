import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

function applyMigrations(databasePath: string) {
  const db = new Database(databasePath);
  const migrationsPath = join(process.cwd(), "prisma", "migrations");

  try {
    db.exec("PRAGMA foreign_keys = ON");

    for (const migrationName of readdirSync(migrationsPath).sort()) {
      const migrationSqlPath = join(migrationsPath, migrationName, "migration.sql");

      if (existsSync(migrationSqlPath)) {
        db.exec(readFileSync(migrationSqlPath, "utf8"));
      }
    }
  } finally {
    db.close();
  }
}

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

test("deleting an account cascades to its transactions", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "life-tracker-prisma-"));
  const databasePath = join(tempDir, "cascade.db");
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNextPhase = process.env.NEXT_PHASE;
  const originalNodeEnv = process.env.NODE_ENV;
  let client: Awaited<typeof import("../lib/prisma")>["prisma"] | undefined;

  try {
    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.NEXT_PHASE = "phase-production-build";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";

    applyMigrations(databasePath);

    const { prisma } = await import("../lib/prisma");
    client = prisma;

    const pragmaRows = await prisma.$queryRawUnsafe<
      Array<{ foreign_keys: number | bigint }>
    >("PRAGMA foreign_keys");
    assert.equal(Number(pragmaRows[0]?.foreign_keys), 1);

    const account = await prisma.account.create({
      data: {
        name: "Cascade Checking",
        balance: "100.00",
        type: "current",
      },
    });

    await prisma.transaction.create({
      data: {
        accountId: account.id,
        amount: "12.34",
        type: "outgoing",
      },
    });

    await prisma.account.delete({
      where: { id: account.id },
    });

    await assert.rejects(
      prisma.transaction.create({
        data: {
          accountId: account.id,
          amount: "1.00",
          type: "outgoing",
        },
      }),
    );

    const transactionCount = await prisma.transaction.count({
      where: { accountId: account.id },
    });

    assert.equal(transactionCount, 0);
  } finally {
    await client?.$disconnect();
    restoreEnvValue("DATABASE_URL", originalDatabaseUrl);
    restoreEnvValue("NEXT_PHASE", originalNextPhase);
    restoreEnvValue("NODE_ENV", originalNodeEnv);
    rmSync(tempDir, { force: true, recursive: true });
  }
});
