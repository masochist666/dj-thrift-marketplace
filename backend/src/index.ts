import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from './services/DatabaseService';
import { WebSocketService } from './services/WebSocketService';
import { AudioAnalysisService } from './services/AudioAnalysisService';
import { EmailService } from './services/EmailService';
import { BullQueueService } from './services/BullQueueService';
import { SearchService } from './services/SearchService';
import { NotificationService } from './services/NotificationService';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, uploadLimiter, searchLimiter, tradeLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import trackRoutes from './routes/tracks';
import tradeRoutes from './routes/trades';
import paymentRoutes from './routes/payments';
import groupRoutes from './routes/groups';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(limiter);

// Initialize services
const dbService = new DatabaseService();
const wsService = new WebSocketService(io);
const audioService = new AudioAnalysisService(dbService);
const emailService = new EmailService();
const queueService = new BullQueueService();
const searchService = new SearchService(dbService);
const notificationService = new NotificationService(dbService, wsService);

// Make services available to routes
app.locals.db = dbService;
app.locals.ws = wsService;
app.locals.audio = audioService;
app.locals.email = emailService;
app.locals.queue = queueService;
app.locals.search = searchService;
app.locals.notification = notificationService;

// Routes with rate limiting
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/tracks', apiLimiter, trackRoutes);
app.use('/api/v1/trades', tradeLimiter, tradeRoutes);
app.use('/api/v1/payments', apiLimiter, paymentRoutes);
app.use('/api/v1/groups', apiLimiter, groupRoutes);
app.use('/api/v1/notifications', apiLimiter, notificationRoutes);
app.use('/api/v1/search', searchLimiter, searchRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin', apiLimiter, adminRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'DJ Thrift Marketplace API',
    version: '1.0.0',
    description: 'Peer-to-peer DJ track trading platform',
    endpoints: {
      auth: '/api/v1/auth',
      tracks: '/api/v1/tracks',
      trades: '/api/v1/trades',
      payments: '/api/v1/payments',
      groups: '/api/v1/groups',
      webhooks: '/api/v1/webhooks',
      admin: '/api/v1/admin'
    },
    documentation: 'https://docs.djthrift.com',
    support: 'support@djthrift.com'
  });
});

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

// WebSocket connection handling
io.on('connection', (socket: any) => {
  wsService.handleConnection(socket);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🎶 DJ Thrift Marketplace API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  logger.info(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;