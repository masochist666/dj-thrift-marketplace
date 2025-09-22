import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Admin middleware
const requireAdmin = async (req: any, res: Response, next: any) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const user = await db('users').where('id', req.user.id).first();
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { page = 1, limit = 20 } = req.query;

    const users = await db('users')
      .select('id', 'email', 'username', 'role', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ users });
  } catch (error: any) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system stats
router.get('/stats', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    const stats = await Promise.all([
      db('users').count('* as count').first(),
      db('tracks').count('* as count').first(),
      db('trades').count('* as count').first(),
      db('payments').sum('amount as total').first()
    ]);

    res.json({
      users: stats[0].count,
      tracks: stats[1].count,
      trades: stats[2].count,
      totalRevenue: stats[3].total || 0
    });
  } catch (error: any) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;