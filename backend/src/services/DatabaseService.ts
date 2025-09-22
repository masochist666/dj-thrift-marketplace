import knex from 'knex';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: any;

  constructor() {
    this.db = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'dj_thrift',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations',
        directory: './migrations'
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.db.raw('SELECT 1');
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
  }

  getKnex() {
    return this.db;
  }

  async close() {
    await this.db.destroy();
  }
}