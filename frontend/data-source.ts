import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
dotenv.config();

const isCompiled = __filename.endsWith('.js');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities:   isCompiled ? ['dist/src/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: isCompiled ? ['dist/database/migrations/*.js'] : ['database/migrations/*.ts'],
  ssl: process.env.DATABASE_URL?.includes('railway') ||
       process.env.DATABASE_URL?.includes('supabase') ||
       process.env.DATABASE_URL?.includes('neon')
       ? { rejectUnauthorized: false } : false,
});
