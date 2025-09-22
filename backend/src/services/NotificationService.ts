import { DatabaseService } from './DatabaseService';
import { WebSocketService } from './WebSocketService';
import { logger } from '../utils/logger';

export class NotificationService {
  private db: any;
  private wsService: WebSocketService;

  constructor(dbService: DatabaseService, wsService: WebSocketService) {
    this.db = dbService.getKnex();
    this.wsService = wsService;
  }

  async createNotification(userId: string, type: string, title: string, message: string, data: any = {}) {
    try {
      const [notification] = await this.db('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        data: JSON.stringify(data),
        is_read: false,
        created_at: new Date()
      }).returning('*');

      // Send real-time notification
      this.wsService.emitToUser(userId, 'notification', {
        id: notification.id,
        type,
        title,
        message,
        data,
        created_at: notification.created_at
      });

      logger.info(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Create notification error:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    try {
      const notifications = await this.db('notifications')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return notifications;
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      await this.db('notifications')
        .where('id', notificationId)
        .where('user_id', userId)
        .update({ is_read: true, updated_at: new Date() });

      logger.info(`Notification ${notificationId} marked as read`);
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      await this.db('notifications')
        .where('user_id', userId)
        .where('is_read', false)
        .update({ is_read: true, updated_at: new Date() });

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      throw error;
    }
  }
}