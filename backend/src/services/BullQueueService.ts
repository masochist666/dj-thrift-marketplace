import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

export class BullQueueService {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeQueues();
  }

  private initializeQueues() {
    // Audio analysis queue
    const audioQueue = new Queue('audio-analysis', {
      connection: this.redis
    });
    this.queues.set('audio-analysis', audioQueue);

    // Email queue
    const emailQueue = new Queue('email', {
      connection: this.redis
    });
    this.queues.set('email', emailQueue);

    // Payment processing queue
    const paymentQueue = new Queue('payment-processing', {
      connection: this.redis
    });
    this.queues.set('payment-processing', paymentQueue);

    this.setupWorkers();
  }

  private setupWorkers() {
    // Audio analysis worker
    new Worker('audio-analysis', async (job) => {
      logger.info(`Processing audio analysis job ${job.id}`);
      // Audio analysis logic here
    }, { connection: this.redis });

    // Email worker
    new Worker('email', async (job) => {
      logger.info(`Processing email job ${job.id}`);
      // Email sending logic here
    }, { connection: this.redis });

    // Payment worker
    new Worker('payment-processing', async (job) => {
      logger.info(`Processing payment job ${job.id}`);
      // Payment processing logic here
    }, { connection: this.redis });
  }

  async addJob(queueName: string, jobData: any, options?: any) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.add(jobData.name || 'job', jobData, options);
  }

  async close() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    await this.redis.quit();
  }
}