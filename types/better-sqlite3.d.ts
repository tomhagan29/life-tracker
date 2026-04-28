declare module "better-sqlite3" {
  type StatementResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  type Statement = {
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => StatementResult;
  };

  export default class Database {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }
}
