import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type MigrationRecord = {
  migration_name: string;
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

function migrationDirectories(migrationsPath: string) {
  return fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
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
      const startedAt = new Date().toISOString();

      db.exec(migrationSql);
      db.prepare(
        `
        INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
        `,
      ).run(randomUUID(), checksum(migrationSql), new Date().toISOString(), migrationName, startedAt);
    }

    migrationCache.__lifeTrackerMigratedDatabases.add(databasePath);
  } finally {
    db.close();
  }
}
