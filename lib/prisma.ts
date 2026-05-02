// lib/prisma.ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { ensureSqliteMigrations } from "./sqlite-migrations";

ensureSqliteMigrations(process.env.DATABASE_URL);

// SQLite stores Prisma Decimal columns with REAL affinity, so money values must
// be quantized in application code before writes. Use toMoneyDecimal for all
// persisted currency amounts and read/compute/write balance updates.
type SqliteAdapterConnection = Awaited<ReturnType<PrismaBetterSqlite3["connect"]>>;

async function enableForeignKeys(connection: SqliteAdapterConnection) {
  await connection.executeScript("PRAGMA foreign_keys = ON");
}

function createSqliteAdapter(databaseUrl: string) {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

  return {
    provider: adapter.provider,
    adapterName: adapter.adapterName,
    async connect() {
      const connection = await adapter.connect();
      await enableForeignKeys(connection);
      return connection;
    },
    async connectToShadowDb() {
      const connection = await adapter.connectToShadowDb();
      await enableForeignKeys(connection);
      return connection;
    },
  } satisfies Pick<
    PrismaBetterSqlite3,
    "provider" | "adapterName" | "connect" | "connectToShadowDb"
  >;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function createPrismaClient(databaseUrl = process.env.DATABASE_URL!) {
  return new PrismaClient({ adapter: createSqliteAdapter(databaseUrl) });
}

function hasCurrentDelegates(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client && "habitCompletion" in client && "investmentSnapshot" in client,
  );
}

export const prisma =
  hasCurrentDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
