import Bull from 'bull';
import { logger } from '../utils/logger';
import { AudioAnalysisService } from './AudioAnalysisService';
import { EmailService } from './EmailService';

export class BullQueueService {
  private audioAnalysisQueue: Bull.Queue;
  private emailQueue: Bull.Queue;
  private paymentQueue: Bull.Queue;
  private searchIndexQueue: Bull.Queue;

  constructor() {
    // Initialize queues
    this.audioAnalysisQueue = new Bull('audio-analysis', process.env.REDIS_URL || 'redis://localhost:6379');
    this.emailQueue = new Bull('email', process.env.REDIS_URL || 'redis://localhost:6379');
    this.paymentQueue = new Bull('payment', process.env.REDIS_URL || 'redis://localhost:6379');
    this.searchIndexQueue = new Bull('search-index', process.env.REDIS_URL || 'redis://localhost:6379');

    this.setupProcessors();
  }

  private setupProcessors() {
    // Audio analysis processor
    this.audioAnalysisQueue.process('analyze-track', async (job) => {
      const { trackFileId, s3Key } = job.data;
      logger.info(`Processing audio analysis for track file: ${trackFileId}`);
      
      try {
        const audioAnalysisService = new AudioAnalysisService();
        await audioAnalysisService.analyzeTrack(trackFileId, s3Key);
        logger.info(`Audio analysis completed for track file: ${trackFileId}`);
      } catch (error) {
        logger.error(`Audio analysis failed for track file ${trackFileId}:`, error);
        throw error;
      }
    });

    // Email processor
    this.emailQueue.process('send-email', async (job) => {
      const { type, data } = job.data;
      logger.info(`Processing email: ${type}`);
      
      try {
        const emailService = new EmailService();
        
        switch (type) {
          case 'welcome':
            await emailService.sendWelcomeEmail(data.email, data.displayName);
            break;
          case 'trade-notification':
            await emailService.sendTradeNotification(data.email, data.proposerName, data.trackTitle);
            break;
          case 'purchase-notification':
            await emailService.sendPurchaseNotification(data.email, data.trackTitle, data.amount);
            break;
          case 'password-reset':
            await emailService.sendPasswordResetEmail(data.email, data.resetToken);
            break;
          case 'group-invitation':
            await emailService.sendGroupInvitation(data.email, data.groupName, data.inviterName);
            break;
          default:
            logger.warn(`Unknown email type: ${type}`);
        }
        
        logger.info(`Email sent successfully: ${type}`);
      } catch (error) {
        logger.error(`Email sending failed for ${type}:`, error);
        throw error;
      }
    });

    // Payment processor
    this.paymentQueue.process('process-payment', async (job) => {
      const { paymentId, type } = job.data;
      logger.info(`Processing payment: ${paymentId} (${type})`);
      
      try {
        // Implement payment processing logic here
        // This would handle Stripe webhooks, payout processing, etc.
        logger.info(`Payment processed successfully: ${paymentId}`);
      } catch (error) {
        logger.error(`Payment processing failed for ${paymentId}:`, error);
        throw error;
      }
    });

    // Search index processor
    this.searchIndexQueue.process('index-track', async (job) => {
      const { trackId, action } = job.data;
      logger.info(`Indexing track for search: ${trackId} (${action})`);
      
      try {
        // Implement search indexing logic here
        // This would update Elasticsearch or similar search index
        logger.info(`Track indexed successfully: ${trackId}`);
      } catch (error) {
        logger.error(`Search indexing failed for track ${trackId}:`, error);
        throw error;
      }
    });

    // Error handling
    this.audioAnalysisQueue.on('failed', (job, err) => {
      logger.error(`Audio analysis job failed:`, err);
    });

    this.emailQueue.on('failed', (job, err) => {
      logger.error(`Email job failed:`, err);
    });

    this.paymentQueue.on('failed', (job, err) => {
      logger.error(`Payment job failed:`, err);
    });

    this.searchIndexQueue.on('failed', (job, err) => {
      logger.error(`Search index job failed:`, err);
    });
  }

  // Audio analysis methods
  async queueAudioAnalysis(trackFileId: string, s3Key: string, delay: number = 0) {
    const job = await this.audioAnalysisQueue.add('analyze-track', {
      trackFileId,
      s3Key
    }, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    logger.info(`Audio analysis queued for track file: ${trackFileId} (job: ${job.id})`);
    return job;
  }

  // Email methods
  async queueWelcomeEmail(email: string, displayName: string) {
    return await this.emailQueue.add('send-email', {
      type: 'welcome',
      data: { email, displayName }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async queueTradeNotification(email: string, proposerName: string, trackTitle: string) {
    return await this.emailQueue.add('send-email', {
      type: 'trade-notification',
      data: { email, proposerName, trackTitle }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async queuePurchaseNotification(email: string, trackTitle: string, amount: number) {
    return await this.emailQueue.add('send-email', {
      type: 'purchase-notification',
      data: { email, trackTitle, amount }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async queuePasswordResetEmail(email: string, resetToken: string) {
    return await this.emailQueue.add('send-email', {
      type: 'password-reset',
      data: { email, resetToken }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async queueGroupInvitation(email: string, groupName: string, inviterName: string) {
    return await this.emailQueue.add('send-email', {
      type: 'group-invitation',
      data: { email, groupName, inviterName }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  // Payment methods
  async queuePaymentProcessing(paymentId: string, type: string) {
    return await this.paymentQueue.add('process-payment', {
      paymentId,
      type
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  }

  // Search index methods
  async queueTrackIndexing(trackId: string, action: 'create' | 'update' | 'delete') {
    return await this.searchIndexQueue.add('index-track', {
      trackId,
      action
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  // Queue management methods
  async getQueueStats() {
    return {
      audioAnalysis: {
        waiting: await this.audioAnalysisQueue.getWaiting(),
        active: await this.audioAnalysisQueue.getActive(),
        completed: await this.audioAnalysisQueue.getCompleted(),
        failed: await this.audioAnalysisQueue.getFailed()
      },
      email: {
        waiting: await this.emailQueue.getWaiting(),
        active: await this.emailQueue.getActive(),
        completed: await this.emailQueue.getCompleted(),
        failed: await this.emailQueue.getFailed()
      },
      payment: {
        waiting: await this.paymentQueue.getWaiting(),
        active: await this.paymentQueue.getActive(),
        completed: await this.paymentQueue.getCompleted(),
        failed: await this.paymentQueue.getFailed()
      },
      searchIndex: {
        waiting: await this.searchIndexQueue.getWaiting(),
        active: await this.searchIndexQueue.getActive(),
        completed: await this.searchIndexQueue.getCompleted(),
        failed: await this.searchIndexQueue.getFailed()
      }
    };
  }

  async clearCompletedJobs() {
    await Promise.all([
      this.audioAnalysisQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
      this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.paymentQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.searchIndexQueue.clean(24 * 60 * 60 * 1000, 'completed')
    ]);
    logger.info('Completed jobs cleaned up');
  }

  async close() {
    await Promise.all([
      this.audioAnalysisQueue.close(),
      this.emailQueue.close(),
      this.paymentQueue.close(),
      this.searchIndexQueue.close()
    ]);
    logger.info('All queues closed');
  }
}
