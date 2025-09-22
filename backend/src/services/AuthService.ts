import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export class AuthService {
  private db: any;

  constructor(dbService: DatabaseService) {
    this.db = dbService.getKnex();
  }

  async register(email: string, password: string, username: string) {
    try {
      // Check if user already exists
      const existingUser = await this.db('users').where('email', email).first();
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const [user] = await this.db('users').insert({
        email,
        password: hashedPassword,
        username,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      // Create profile
      await this.db('profiles').insert({
        user_id: user.id,
        display_name: username,
        bio: '',
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Generate JWT token
      const token = this.generateToken(user.id);

      logger.info(`User registered: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.db('users').where('email', email).first();
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user.id);
      
      logger.info(`User logged in: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  verifyToken(token: string): any {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  }
}