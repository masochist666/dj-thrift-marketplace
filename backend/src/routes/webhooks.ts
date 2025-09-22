import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Stripe webhook handler
router.post('/stripe', (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('Payment succeeded:', event.data.object);
        // Handle successful payment
        break;
      case 'payment_intent.payment_failed':
        logger.info('Payment failed:', event.data.object);
        // Handle failed payment
        break;
      default:
        logger.info('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;