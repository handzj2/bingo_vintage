import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * PHASE 2 — Standalone DataSource for CLI migrations
 * Used by: typeorm migration:run / migration:show / migration:revert / migration:generate
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: false,          // CLI controls this
  namingStrategy: new SnakeNamingStrategy(),
  entities:   ['src/**/*.entity.ts'],
  migrations: ['database/migrations/*.ts'],
  ssl: process.env.DATABASE_URL?.includes('railway') ||
       process.env.DATABASE_URL?.includes('supabase') ||
       process.env.DATABASE_URL?.includes('neon')
       ? { rejectUnauthorized: false } : false,
});
