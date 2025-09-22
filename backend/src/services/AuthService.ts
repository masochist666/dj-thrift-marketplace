import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  role: number;
  is_verified: boolean;
  display_name: string;
  avatar_url?: string;
  reputation: number;
  credits_balance: number;
  created_at: string;
}

export class AuthService {
  constructor(private db: DatabaseService) {}

  async register(email: string, password: string, displayName: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.db.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await this.db.create('users', {
        email,
        password_hash: hashedPassword,
        role: 0 // Default role: user
      });

      // Create profile
      await this.db.create('profiles', {
        user_id: user.id,
        display_name: displayName
      });

      // Get user with profile and credits
      const fullUser = await this.getCurrentUser(user.id);
      
      // Generate tokens
      const tokens = this.generateTokens(user.id);
      
      logger.info(`User registered: ${email}`);
      
      return {
        user: fullUser,
        ...tokens
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      // Find user with profile
      const user = await this.db.query(`
        SELECT u.*, p.display_name, p.avatar_url, p.reputation,
          COALESCE(SUM(ct.delta), 0) as credits_balance
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN credits_transactions ct ON u.id = ct.user_id
        WHERE u.email = $1
        GROUP BY u.id, p.user_id, p.display_name, p.avatar_url, p.reputation
      `, [email]);

      if (!user[0]) {
        throw new Error('Invalid credentials');
      }

      // Check password
      if (!await bcrypt.compare(password, user[0].password_hash)) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await this.db.update('users', user[0].id, { last_login: new Date() });

      // Generate tokens
      const tokens = this.generateTokens(user[0].id);
      
      logger.info(`User logged in: ${email}`);
      
      return {
        user: user[0],
        ...tokens
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async getCurrentUser(userId: string): Promise<User> {
    const result = await this.db.query(`
      SELECT u.*, p.display_name, p.avatar_url, p.reputation,
        COALESCE(SUM(ct.delta), 0) as credits_balance
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN credits_transactions ct ON u.id = ct.user_id
      WHERE u.id = $1
      GROUP BY u.id, p.user_id, p.display_name, p.avatar_url, p.reputation
    `, [userId]);

    if (!result[0]) {
      throw new Error('User not found');
    }

    return result[0];
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string; type: string };
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verify user still exists
      const user = await this.db.findById('users', decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      return this.generateTokens(decoded.userId);
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async updateProfile(userId: string, profileData: any): Promise<User> {
    try {
      // Update profile
      await this.db.update('profiles', userId, {
        display_name: profileData.display_name,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        location: profileData.location,
        genres: profileData.genres,
        updated_at: new Date()
      });

      // Return updated user
      return this.getCurrentUser(userId);
    } catch (error) {
      logger.error('Profile update error:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get current user
      const user = await this.db.findById('users', userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      if (!await bcrypt.compare(currentPassword, user.password_hash)) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.db.update('users', userId, {
        password_hash: hashedPassword,
        updated_at: new Date()
      });

      logger.info(`Password changed for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }

  private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): { userId: string; type: string } {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
  }
}
