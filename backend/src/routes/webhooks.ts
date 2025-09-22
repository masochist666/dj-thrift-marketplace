import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: express.Request, res: express.Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSucceeded(paymentIntent: any) {
  try {
    const { user_id, track_file_id, track_id } = paymentIntent.metadata;

    if (track_file_id) {
      // Handle track purchase
      await handleTrackPurchase(user_id, track_file_id, paymentIntent);
    } else if (paymentIntent.metadata.type === 'credits_purchase') {
      // Handle credits purchase
      await handleCreditsPurchase(user_id, paymentIntent);
    }

    logger.info(`Payment succeeded: ${paymentIntent.id} for user ${user_id}`);
  } catch (error) {
    logger.error('Error handling payment succeeded:', error);
  }
}

async function handleTrackPurchase(userId: string, trackFileId: string, paymentIntent: any) {
  try {
    // Get track file details
    const trackFile = await req.app.locals.db.findById('track_files', trackFileId);
    if (!trackFile) {
      logger.error(`Track file not found: ${trackFileId}`);
      return;
    }

    // Create payment record
    const payment = await req.app.locals.db.create('payments', {
      provider: 'stripe',
      provider_payment_id: paymentIntent.id,
      status: 'succeeded',
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: JSON.stringify(paymentIntent)
    });

    // Create purchase record
    const purchase = await req.app.locals.db.create('purchases', {
      buyer_id: userId,
      track_file_id: trackFileId,
      amount_cents: trackFile.price_cents,
      currency: trackFile.currency,
      payment_id: payment.id,
      license_snapshot: JSON.stringify({
        license_type: 'dj_play',
        permissions: { play: true, remix: false, resale: false }
      }),
      delivered: true
    });

    // Create access grant
    await req.app.locals.db.create('access_grants', {
      user_id: userId,
      track_file_id: trackFileId,
      grant_type: 'purchase'
    });

    // Notify seller
    req.app.locals.ws.sendPurchaseNotification(userId, trackFile.owner_id, trackFile.track_id, trackFile.price_cents);

    logger.info(`Track purchase completed: ${trackFileId} by user ${userId}`);
  } catch (error) {
    logger.error('Error handling track purchase:', error);
  }
}

async function handleCreditsPurchase(userId: string, paymentIntent: any) {
  try {
    const credits = paymentIntent.amount; // 1 cent = 1 credit

    // Get current balance
    const currentBalance = await req.app.locals.db.query(`
      SELECT COALESCE(SUM(delta), 0) as balance
      FROM credits_transactions
      WHERE user_id = $1
    `, [userId]);

    const newBalance = currentBalance[0].balance + credits;

    // Create credits transaction
    await req.app.locals.db.create('credits_transactions', {
      user_id: userId,
      delta: credits,
      reason: 'Credits purchase',
      balance_after: newBalance
    });

    // Notify user
    req.app.locals.ws.sendCreditsUpdate(userId, newBalance, credits, 'Credits purchase');

    logger.info(`Credits purchase completed: ${credits} credits for user ${userId}`);
  } catch (error) {
    logger.error('Error handling credits purchase:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  try {
    const { user_id, track_file_id } = paymentIntent.metadata;

    // Create payment record
    await req.app.locals.db.create('payments', {
      provider: 'stripe',
      provider_payment_id: paymentIntent.id,
      status: 'failed',
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: JSON.stringify(paymentIntent)
    });

    // Notify user
    req.app.locals.ws.notifyUser(user_id, {
      type: 'payment:failed',
      payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      message: 'Payment failed'
    });

    logger.info(`Payment failed: ${paymentIntent.id} for user ${user_id}`);
  } catch (error) {
    logger.error('Error handling payment failed:', error);
  }
}

async function handlePaymentCanceled(paymentIntent: any) {
  try {
    const { user_id } = paymentIntent.metadata;

    // Create payment record
    await req.app.locals.db.create('payments', {
      provider: 'stripe',
      provider_payment_id: paymentIntent.id,
      status: 'canceled',
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: JSON.stringify(paymentIntent)
    });

    // Notify user
    req.app.locals.ws.notifyUser(user_id, {
      type: 'payment:canceled',
      payment_intent_id: paymentIntent.id,
      message: 'Payment was canceled'
    });

    logger.info(`Payment canceled: ${paymentIntent.id} for user ${user_id}`);
  } catch (error) {
    logger.error('Error handling payment canceled:', error);
  }
}

export default router;
