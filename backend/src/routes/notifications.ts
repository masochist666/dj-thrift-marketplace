import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get user notifications
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await req.app.locals.notification.getUserNotifications(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    const unreadCount = await req.app.locals.notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      unread_count: unreadCount,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;

    await req.app.locals.notification.markNotificationAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    logger.error('Mark notification as read error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;

    await req.app.locals.notification.markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error: any) {
    logger.error('Mark all notifications as read error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark all notifications as read'
    });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;

    const unreadCount = await req.app.locals.notification.getUnreadCount(userId);

    res.json({
      success: true,
      unread_count: unreadCount
    });
  } catch (error: any) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get unread count'
    });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;

    await req.app.locals.db.query(`
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error: any) {
    logger.error('Delete notification error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete notification'
    });
  }
});

// Delete all notifications
router.delete('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;

    await req.app.locals.db.query(`
      DELETE FROM notifications
      WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error: any) {
    logger.error('Delete all notifications error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete all notifications'
    });
  }
});

export default router;
