import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type MigrationRecord = {
  migration_name: string;
};

type MigrationSqlParts = {
  beforeTransaction: string[];
  transactionSql: string;
  afterTransaction: string[];
};

const migrationTableSql = `
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
`;

const migrationCache = globalThis as typeof globalThis & {
  __lifeTrackerMigratedDatabases?: Set<string>;
};

function resolveSqlitePath(databaseUrl: string | undefined) {
  if (!databaseUrl?.startsWith("file:")) {
    return undefined;
  }

  const sqlitePath = databaseUrl.slice("file:".length);

  if (!sqlitePath || sqlitePath === ":memory:") {
    return undefined;
  }

  if (path.isAbsolute(sqlitePath)) {
    return sqlitePath;
  }

  return path.resolve(/* turbopackIgnore: true */ process.cwd(), sqlitePath);
}

function resolveMigrationsPath() {
  const migrationsPath = path.join(process.cwd(), "prisma", "migrations");

  if (!fs.existsSync(migrationsPath)) {
    return undefined;
  }

  return migrationsPath;
}

function checksum(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

function splitBoundaryForeignKeyPragmas(sql: string): MigrationSqlParts {
  const beforeTransaction: string[] = [];
  const afterTransaction: string[] = [];
  let transactionSql = sql;
  const leadingForeignKeysPragma =
    /^\s*(PRAGMA\s+foreign_keys\s*=\s*(?:ON|OFF|0|1)\s*;)/i;
  const trailingForeignKeysPragma =
    /(PRAGMA\s+foreign_keys\s*=\s*(?:ON|OFF|0|1)\s*;)\s*$/i;

  while (true) {
    const match = transactionSql.match(leadingForeignKeysPragma);

    if (!match) {
      break;
    }

    beforeTransaction.push(match[1]);
    transactionSql = transactionSql.slice(match[0].length);
  }

  while (true) {
    const match = transactionSql.match(trailingForeignKeysPragma);

    if (!match) {
      break;
    }

    afterTransaction.unshift(match[1]);
    transactionSql = transactionSql.slice(0, match.index).trimEnd();
  }

  return {
    beforeTransaction,
    transactionSql,
    afterTransaction,
  };
}

function migrationDirectories(migrationsPath: string) {
  return fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getForeignKeysEnabled(db: Database) {
  const row = db.prepare("PRAGMA foreign_keys").get() as
    | { foreign_keys?: number | bigint }
    | undefined;

  return Number(row?.foreign_keys ?? 0) === 1;
}

function setForeignKeys(db: Database, enabled: boolean) {
  db.exec(`PRAGMA foreign_keys = ${enabled ? "ON" : "OFF"}`);
}

function applyMigration(
  db: Database,
  migrationName: string,
  migrationSql: string,
) {
  const { beforeTransaction, transactionSql, afterTransaction } =
    splitBoundaryForeignKeyPragmas(migrationSql);
  const startedAt = new Date().toISOString();
  const originalForeignKeysEnabled = getForeignKeysEnabled(db);

  try {
    for (const statement of beforeTransaction) {
      db.exec(statement);
    }

    db.exec("BEGIN");
    db.exec(transactionSql);
    db.prepare(
      `
      INSERT INTO "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
      `,
    ).run(randomUUID(), checksum(migrationSql), new Date().toISOString(), migrationName, startedAt);
    db.exec("COMMIT");

    for (const statement of afterTransaction) {
      db.exec(statement);
    }
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction may not have started, or SQLite may already have closed it.
    }

    setForeignKeys(db, originalForeignKeysEnabled);
    throw error;
  }
}

export function ensureSqliteMigrations(databaseUrl: string | undefined) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const databasePath = resolveSqlitePath(databaseUrl);

  if (!databasePath) {
    return;
  }

  migrationCache.__lifeTrackerMigratedDatabases ??= new Set<string>();

  if (migrationCache.__lifeTrackerMigratedDatabases.has(databasePath)) {
    return;
  }

  const migrationsPath = resolveMigrationsPath();

  if (!migrationsPath) {
    throw new Error("Could not find Prisma migration files.");
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);

  try {
    db.exec(migrationTableSql);

    const applied = new Set(
      (
        db
          .prepare(
            'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
          )
          .all() as MigrationRecord[] | undefined
      )?.map((record) => record.migration_name) ?? [],
    );

    for (const migrationName of migrationDirectories(migrationsPath)) {
      if (applied.has(migrationName)) {
        continue;
      }

      const migrationSqlPath = path.join(migrationsPath, migrationName, "migration.sql");
      const migrationSql = fs.readFileSync(migrationSqlPath, "utf8");

      applyMigration(db, migrationName, migrationSql);
    }

    migrationCache.__lifeTrackerMigratedDatabases.add(databasePath);
  } finally {
    db.close();
  }
}
