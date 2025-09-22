import { DatabaseService } from './DatabaseService';
import { WebSocketService } from './WebSocketService';
import { logger } from '../utils/logger';

export class NotificationService {
  private db: DatabaseService;
  private ws: WebSocketService;

  constructor(db: DatabaseService, ws: WebSocketService) {
    this.db = db;
    this.ws = ws;
  }

  async createNotification(userId: string, type: string, payload: any) {
    try {
      const notification = await this.db.create('notifications', {
        user_id: userId,
        payload: JSON.stringify({ type, ...payload })
      });

      // Send real-time notification
      this.ws.notifyUser(userId, {
        type: 'notification:new',
        notification: {
          id: notification.id,
          type,
          payload,
          created_at: notification.created_at
        }
      });

      logger.info(`Notification created for user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error('Create notification error:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const notifications = await this.db.query(`
        SELECT *
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return notifications.map(notif => ({
        ...notif,
        payload: JSON.parse(notif.payload)
      }));
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      await this.db.query(`
        UPDATE notifications
        SET read = true
        WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);

      logger.info(`Notification ${notificationId} marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string) {
    try {
      await this.db.query(`
        UPDATE notifications
        SET read = true
        WHERE user_id = $1 AND read = false
      `, [userId]);

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND read = false
      `, [userId]);

      return parseInt(result[0].count);
    } catch (error) {
      logger.error('Get unread count error:', error);
      throw error;
    }
  }

  // Specific notification types
  async notifyTradeCreated(tradeId: string, proposerId: string, receiverId: string) {
    try {
      // Get proposer info
      const proposer = await this.db.query(`
        SELECT p.display_name
        FROM profiles p
        WHERE p.user_id = $1
      `, [proposerId]);

      await this.createNotification(receiverId, 'trade:created', {
        trade_id: tradeId,
        proposer_id: proposerId,
        proposer_name: proposer[0]?.display_name || 'Unknown DJ',
        message: `New trade proposal from ${proposer[0]?.display_name || 'Unknown DJ'}`
      });
    } catch (error) {
      logger.error('Notify trade created error:', error);
    }
  }

  async notifyTradeUpdated(tradeId: string, userId: string, status: string) {
    try {
      const statusMessages = {
        accepted: 'Trade accepted!',
        declined: 'Trade declined',
        completed: 'Trade completed successfully!',
        cancelled: 'Trade was cancelled'
      };

      await this.createNotification(userId, 'trade:updated', {
        trade_id: tradeId,
        status,
        message: statusMessages[status as keyof typeof statusMessages] || 'Trade status updated'
      });
    } catch (error) {
      logger.error('Notify trade updated error:', error);
    }
  }

  async notifyPurchaseCompleted(trackId: string, buyerId: string, sellerId: string, amount: number) {
    try {
      // Get track info
      const track = await this.db.query(`
        SELECT t.title
        FROM tracks t
        WHERE t.id = $1
      `, [trackId]);

      // Notify seller
      await this.createNotification(sellerId, 'purchase:completed', {
        track_id: trackId,
        track_title: track[0]?.title || 'Unknown Track',
        buyer_id: buyerId,
        amount_cents: amount,
        message: `Your track "${track[0]?.title || 'Unknown Track'}" was sold for $${(amount / 100).toFixed(2)}`
      });
    } catch (error) {
      logger.error('Notify purchase completed error:', error);
    }
  }

  async notifyTrackPublished(trackId: string, ownerId: string) {
    try {
      // Get track info
      const track = await this.db.query(`
        SELECT t.title
        FROM tracks t
        WHERE t.id = $1
      `, [trackId]);

      await this.createNotification(ownerId, 'track:published', {
        track_id: trackId,
        track_title: track[0]?.title || 'Unknown Track',
        message: `Your track "${track[0]?.title || 'Unknown Track'}" has been published!`
      });
    } catch (error) {
      logger.error('Notify track published error:', error);
    }
  }

  async notifyUserFollowed(followerId: string, followingId: string) {
    try {
      // Get follower info
      const follower = await this.db.query(`
        SELECT p.display_name
        FROM profiles p
        WHERE p.user_id = $1
      `, [followerId]);

      await this.createNotification(followingId, 'user:followed', {
        follower_id: followerId,
        follower_name: follower[0]?.display_name || 'Unknown DJ',
        message: `${follower[0]?.display_name || 'Unknown DJ'} started following you!`
      });
    } catch (error) {
      logger.error('Notify user followed error:', error);
    }
  }

  async notifyGroupInvitation(groupId: string, userId: string, inviterId: string) {
    try {
      // Get group and inviter info
      const [group, inviter] = await Promise.all([
        this.db.query(`SELECT name FROM groups WHERE id = $1`, [groupId]),
        this.db.query(`SELECT display_name FROM profiles WHERE user_id = $1`, [inviterId])
      ]);

      await this.createNotification(userId, 'group:invitation', {
        group_id: groupId,
        group_name: group[0]?.name || 'Unknown Group',
        inviter_id: inviterId,
        inviter_name: inviter[0]?.display_name || 'Unknown DJ',
        message: `${inviter[0]?.display_name || 'Unknown DJ'} invited you to join "${group[0]?.name || 'Unknown Group'}"`
      });
    } catch (error) {
      logger.error('Notify group invitation error:', error);
    }
  }

  async notifyCreditsUpdated(userId: string, delta: number, balance: number, reason: string) {
    try {
      await this.createNotification(userId, 'credits:updated', {
        delta,
        balance,
        reason,
        message: `Credits ${delta > 0 ? 'added' : 'deducted'}: ${delta > 0 ? '+' : ''}${delta} (Balance: ${balance})`
      });
    } catch (error) {
      logger.error('Notify credits updated error:', error);
    }
  }

  async notifyReputationUpdated(userId: string, delta: number, reputation: number) {
    try {
      await this.createNotification(userId, 'reputation:updated', {
        delta,
        reputation,
        message: `Reputation ${delta > 0 ? 'increased' : 'decreased'}: ${delta > 0 ? '+' : ''}${delta} (New: ${reputation})`
      });
    } catch (error) {
      logger.error('Notify reputation updated error:', error);
    }
  }

  async notifySystemAnnouncement(userIds: string[], message: string, type: string = 'info') {
    try {
      const notifications = await Promise.all(
        userIds.map(userId => 
          this.createNotification(userId, 'system:announcement', {
            message,
            type,
            announcement: true
          })
        )
      );

      logger.info(`System announcement sent to ${userIds.length} users`);
      return notifications;
    } catch (error) {
      logger.error('Notify system announcement error:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const result = await this.db.query(`
        DELETE FROM notifications
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      `);

      logger.info(`Cleaned up ${result.length} old notifications`);
      return result.length;
    } catch (error) {
      logger.error('Cleanup old notifications error:', error);
      throw error;
    }
  }
}
