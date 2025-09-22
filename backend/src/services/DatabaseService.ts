import knex from 'knex';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: knex.Knex;

  constructor() {
    this.db = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'dj_thrift',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await this.db.raw(sql, params);
      return result.rows || result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback: (trx: knex.Knex.Transaction) => Promise<any>) {
    return this.db.transaction(callback);
  }

  async close() {
    await this.db.destroy();
  }

  getKnex() {
    return this.db;
  }

  // Helper methods for common operations
  async findById(table: string, id: string): Promise<any> {
    const result = await this.db(table).where('id', id).first();
    return result;
  }

  async findByEmail(email: string): Promise<any> {
    const result = await this.db('users').where('email', email).first();
    return result;
  }

  async create(table: string, data: any): Promise<any> {
    const result = await this.db(table).insert(data).returning('*');
    return result[0];
  }

  async update(table: string, id: string, data: any): Promise<any> {
    const result = await this.db(table).where('id', id).update(data).returning('*');
    return result[0];
  }

  async delete(table: string, id: string): Promise<boolean> {
    const result = await this.db(table).where('id', id).del();
    return result > 0;
  }

  async findMany(table: string, conditions: any = {}, options: any = {}): Promise<any[]> {
    let query = this.db(table);
    
    // Apply conditions
    Object.keys(conditions).forEach(key => {
      if (Array.isArray(conditions[key])) {
        query = query.whereIn(key, conditions[key]);
      } else {
        query = query.where(key, conditions[key]);
      }
    });

    // Apply options
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }

    return query;
  }

  async count(table: string, conditions: any = {}): Promise<number> {
    let query = this.db(table);
    
    Object.keys(conditions).forEach(key => {
      if (Array.isArray(conditions[key])) {
        query = query.whereIn(key, conditions[key]);
      } else {
        query = query.where(key, conditions[key]);
      }
    });

    const result = await query.count('* as count').first();
    return parseInt(result.count as string);
  }
}
