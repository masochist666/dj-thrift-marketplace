import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const dbService = new DatabaseService();
    const authService = new AuthService(dbService);
    
    const decoded = authService.verifyToken(token);
    const user = await dbService.getKnex()('users').where('id', decoded.userId).first();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};