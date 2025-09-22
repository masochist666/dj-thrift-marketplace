import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class WebSocketService {
  private io: Server;
  private connectedUsers: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket) {
    logger.info(`User connected: ${socket.id}`);

    socket.on('authenticate', (token: string) => {
      // Verify token and associate with user
      // Implementation depends on your auth system
      this.connectedUsers.set(socket.id, 'authenticated');
      socket.emit('authenticated', { success: true });
    });

    socket.on('join_room', (room: string) => {
      socket.join(room);
      logger.info(`User ${socket.id} joined room ${room}`);
    });

    socket.on('leave_room', (room: string) => {
      socket.leave(room);
      logger.info(`User ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', () => {
      this.connectedUsers.delete(socket.id);
      logger.info(`User disconnected: ${socket.id}`);
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    // Find socket by user ID and emit
    this.io.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }
}