import { Logger, QueryRunner } from 'typeorm';

export class SafeTypeOrmLogger implements Logger {
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    const start = Date.now();
    const queryString = parameters?.length
      ? `${query} -- [${parameters.join(', ')}]`
      : query;

    // Просто лог без виконання запиту
    // console.log(`⏱️ Executed query: ${queryString}`);
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    // console.error(`❌ Query failed:  -- [${parameters?.join(', ')}]`, error);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    console.warn(`🐢 Slow Query (${time}ms): -- [${parameters?.join(', ')}]`);
  }

  logSchemaBuild(message: string) {
    // console.log(`🧱 Schema Build: ${message}`);
  }

  logMigration(message: string) {
    // console.log(`📦 Migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    // console[level](`[${level.toUpperCase()}] ${message}`);
  }
}
