import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { ensureSqliteMigrations } from "../lib/sqlite-migrations";

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

test("failed migrations roll back DDL and are not recorded as applied", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "life-tracker-migrations-"));
  const originalCwd = process.cwd();
  const originalNextPhase = process.env.NEXT_PHASE;
  const databasePath = join(tempDir, "test.db");
  const migrationDir = join(tempDir, "prisma", "migrations", "001_fails");

  mkdirSync(migrationDir, { recursive: true });
  writeFileSync(
    join(migrationDir, "migration.sql"),
    `
    CREATE TABLE "AppliedBeforeFailure" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
    );

    INSERT INTO "MissingTable" ("id") VALUES (1);
    `,
  );

  try {
    process.chdir(tempDir);
    restoreEnvValue("NEXT_PHASE", undefined);

    assert.throws(() => ensureSqliteMigrations(`file:${databasePath}`));

    const db = new Database(databasePath);

    try {
      const partialTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get("AppliedBeforeFailure");
      const migrationRows = db
        .prepare('SELECT COUNT(*) AS count FROM "_prisma_migrations"')
        .get() as { count: number | bigint };

      assert.equal(partialTable, undefined);
      assert.equal(Number(migrationRows.count), 0);
    } finally {
      db.close();
    }
  } finally {
    process.chdir(originalCwd);
    restoreEnvValue("NEXT_PHASE", originalNextPhase);
    rmSync(tempDir, { force: true, recursive: true });
  }
});
