import { Server, Socket } from 'socket.io';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class WebSocketService {
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, AuthenticatedSocket> = new Map(); // socketId -> socket

  constructor(private io: Server) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket: AuthenticatedSocket) {
    logger.info(`Client connected: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', (data: { token: string }) => {
      try {
        // Verify JWT token (you'd use your auth service here)
        // const decoded = jwt.verify(data.token, process.env.JWT_SECRET!);
        // socket.userId = decoded.userId;
        
        // For now, we'll use a simple user ID from the client
        socket.userId = data.token; // This should be the actual user ID after JWT verification
        
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, socket);
        
        // Join user to their personal room
        socket.join(`user:${socket.userId}`);
        
        socket.emit('authenticated', { success: true });
        logger.info(`User authenticated: ${socket.userId}`);
      } catch (error) {
        socket.emit('authentication_error', { message: 'Invalid token' });
        logger.error('Authentication error:', error);
      }
    });

    // Handle joining groups
    socket.on('join_group', (data: { group_id: string }) => {
      if (socket.userId) {
        socket.join(`group:${data.group_id}`);
        logger.info(`User ${socket.userId} joined group ${data.group_id}`);
      }
    });

    // Handle leaving groups
    socket.on('leave_group', (data: { group_id: string }) => {
      if (socket.userId) {
        socket.leave(`group:${data.group_id}`);
        logger.info(`User ${socket.userId} left group ${data.group_id}`);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { group_id: string }) => {
      if (socket.userId) {
        socket.to(`group:${data.group_id}`).emit('user_typing', {
          user_id: socket.userId,
          group_id: data.group_id,
          typing: true
        });
      }
    });

    socket.on('typing_stop', (data: { group_id: string }) => {
      if (socket.userId) {
        socket.to(`group:${data.group_id}`).emit('user_typing', {
          user_id: socket.userId,
          group_id: data.group_id,
          typing: false
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.id);
        logger.info(`User disconnected: ${socket.userId}`);
      }
    });
  }

  // Notify a specific user
  notifyUser(userId: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', data);
    } else {
      // User is offline, store notification in database
      this.storeOfflineNotification(userId, data);
    }
  }

  // Notify multiple users
  notifyUsers(userIds: string[], data: any) {
    userIds.forEach(userId => this.notifyUser(userId, data));
  }

  // Broadcast to a group
  broadcastToGroup(groupId: string, event: string, data: any) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  // Send message to a group
  sendGroupMessage(groupId: string, message: any) {
    this.broadcastToGroup(groupId, 'group_message', message);
  }

  // Send trade notification
  sendTradeNotification(tradeId: string, proposerId: string, receiverId: string, type: string) {
    const notification = {
      type: `trade:${type}`,
      trade_id: tradeId,
      proposer_id: proposerId,
      receiver_id: receiverId,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(receiverId, notification);
  }

  // Send purchase notification
  sendPurchaseNotification(buyerId: string, sellerId: string, trackId: string, amount: number) {
    const notification = {
      type: 'purchase:completed',
      buyer_id: buyerId,
      seller_id: sellerId,
      track_id: trackId,
      amount_cents: amount,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(sellerId, notification);
  }

  // Send track published notification
  sendTrackPublishedNotification(trackId: string, ownerId: string, followers: string[]) {
    const notification = {
      type: 'track:published',
      track_id: trackId,
      owner_id: ownerId,
      timestamp: new Date().toISOString()
    };

    this.notifyUsers(followers, notification);
  }

  // Send new follower notification
  sendFollowerNotification(userId: string, followerId: string) {
    const notification = {
      type: 'user:followed',
      follower_id: followerId,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(userId, notification);
  }

  // Send group invitation
  sendGroupInvitation(groupId: string, inviterId: string, inviteeId: string) {
    const notification = {
      type: 'group:invitation',
      group_id: groupId,
      inviter_id: inviterId,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(inviteeId, notification);
  }

  // Send system announcement
  sendSystemAnnouncement(message: string, targetUsers?: string[]) {
    const announcement = {
      type: 'system:announcement',
      message: message,
      timestamp: new Date().toISOString()
    };

    if (targetUsers) {
      this.notifyUsers(targetUsers, announcement);
    } else {
      this.broadcast('system_announcement', announcement);
    }
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Store offline notification in database
  private async storeOfflineNotification(userId: string, data: any) {
    try {
      // This would store the notification in the database for when the user comes back online
      // Implementation depends on your database service
      logger.info(`Stored offline notification for user ${userId}`);
    } catch (error) {
      logger.error('Error storing offline notification:', error);
    }
  }

  // Send real-time track play notification
  sendTrackPlayNotification(trackId: string, userId: string, listeners: string[]) {
    const notification = {
      type: 'track:playing',
      track_id: trackId,
      user_id: userId,
      timestamp: new Date().toISOString()
    };

    this.notifyUsers(listeners, notification);
  }

  // Send real-time chat message
  sendChatMessage(groupId: string, message: any) {
    this.broadcastToGroup(groupId, 'chat_message', message);
  }

  // Send typing indicator
  sendTypingIndicator(groupId: string, userId: string, isTyping: boolean) {
    this.broadcastToGroup(groupId, 'typing_indicator', {
      user_id: userId,
      is_typing: isTyping,
      timestamp: new Date().toISOString()
    });
  }

  // Send credits update
  sendCreditsUpdate(userId: string, newBalance: number, delta: number, reason: string) {
    const notification = {
      type: 'credits:updated',
      balance: newBalance,
      delta: delta,
      reason: reason,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(userId, notification);
  }

  // Send reputation update
  sendReputationUpdate(userId: string, newReputation: number, delta: number, reason: string) {
    const notification = {
      type: 'reputation:updated',
      reputation: newReputation,
      delta: delta,
      reason: reason,
      timestamp: new Date().toISOString()
    };

    this.notifyUser(userId, notification);
  }
}
