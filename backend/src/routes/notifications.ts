import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user notifications
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { page = 1, limit = 20 } = req.query;

    const notifications = await db('notifications')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ notifications });
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    await db('notifications')
      .where('id', req.params.id)
      .where('user_id', req.user.id)
      .update({ is_read: true, updated_at: new Date() });

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    await db('notifications')
      .where('user_id', req.user.id)
      .where('is_read', false)
      .update({ is_read: true, updated_at: new Date() });

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;