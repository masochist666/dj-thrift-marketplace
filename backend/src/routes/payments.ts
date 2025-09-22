import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get user's purchases
router.get('/purchases', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { limit = 20, offset = 0 } = req.query;

    const purchases = await req.app.locals.db.query(`
      SELECT 
        p.*,
        tf.s3_key,
        tf.file_type,
        tf.duration_ms,
        tf.price_cents,
        t.title,
        t.description,
        prof.display_name as seller_name
      FROM purchases p
      JOIN track_files tf ON p.track_file_id = tf.id
      JOIN tracks t ON tf.track_id = t.id
      LEFT JOIN profiles prof ON tf.owner_id = prof.user_id
      WHERE p.buyer_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      purchases: purchases
    });
  } catch (error: any) {
    logger.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get purchases'
    });
  }
});

// Get user's sales
router.get('/sales', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { limit = 20, offset = 0 } = req.query;

    const sales = await req.app.locals.db.query(`
      SELECT 
        p.*,
        tf.s3_key,
        tf.file_type,
        tf.duration_ms,
        tf.price_cents,
        t.title,
        t.description,
        prof.display_name as buyer_name
      FROM purchases p
      JOIN track_files tf ON p.track_file_id = tf.id
      JOIN tracks t ON tf.track_id = t.id
      LEFT JOIN profiles prof ON p.buyer_id = prof.user_id
      WHERE tf.owner_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      sales: sales
    });
  } catch (error: any) {
    logger.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sales'
    });
  }
});

// Get credits balance
router.get('/credits', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { limit = 50, offset = 0 } = req.query;

    // Get current balance
    const balanceResult = await req.app.locals.db.query(`
      SELECT COALESCE(SUM(delta), 0) as balance
      FROM credits_transactions
      WHERE user_id = $1
    `, [userId]);

    const balance = balanceResult[0].balance;

    // Get recent transactions
    const transactions = await req.app.locals.db.query(`
      SELECT *
      FROM credits_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      balance: balance,
      transactions: transactions
    });
  } catch (error: any) {
    logger.error('Get credits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credits'
    });
  }
});

// Add credits (top up)
router.post('/credits/add', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { amount_cents, payment_method_id } = req.body;

    if (!amount_cents || amount_cents <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Create Stripe payment intent
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      payment_method: payment_method_id,
      confirm: true,
      metadata: {
        user_id: userId,
        type: 'credits_purchase'
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Get current balance
      const currentBalance = await req.app.locals.db.query(`
        SELECT COALESCE(SUM(delta), 0) as balance
        FROM credits_transactions
        WHERE user_id = $1
      `, [userId]);

      const newBalance = currentBalance[0].balance + amount_cents;

      // Create credits transaction
      await req.app.locals.db.create('credits_transactions', {
        user_id: userId,
        delta: amount_cents,
        reason: 'Credits purchase',
        balance_after: newBalance,
        metadata: JSON.stringify({
          payment_intent_id: paymentIntent.id,
          amount_cents: amount_cents
        })
      });

      // Create payment record
      await req.app.locals.db.create('payments', {
        provider: 'stripe',
        provider_payment_id: paymentIntent.id,
        status: 'succeeded',
        amount_cents: amount_cents,
        currency: 'usd',
        metadata: JSON.stringify(paymentIntent)
      });

      // Notify user
      req.app.locals.ws.notifyUser(userId, {
        type: 'credits:updated',
        delta: amount_cents,
        balance: newBalance,
        reason: 'Credits purchase'
      });

      logger.info(`Credits added: ${amount_cents} for user ${userId}`);
      
      res.json({
        success: true,
        balance: newBalance,
        message: 'Credits added successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment failed'
      });
    }
  } catch (error: any) {
    logger.error('Add credits error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add credits'
    });
  }
});

// Transfer credits to another user
router.post('/credits/transfer', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { to_user_id, amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    if (to_user_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer credits to yourself'
      });
    }

    // Check if recipient exists
    const recipient = await req.app.locals.db.findById('users', to_user_id);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Get sender's current balance
    const senderBalance = await req.app.locals.db.query(`
      SELECT COALESCE(SUM(delta), 0) as balance
      FROM credits_transactions
      WHERE user_id = $1
    `, [userId]);

    if (senderBalance[0].balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient credits'
      });
    }

    // Use database transaction for atomicity
    await req.app.locals.db.transaction(async (trx) => {
      // Deduct from sender
      const newSenderBalance = senderBalance[0].balance - amount;
      await trx.create('credits_transactions', {
        user_id: userId,
        delta: -amount,
        reason: reason || `Transfer to user ${to_user_id}`,
        balance_after: newSenderBalance,
        metadata: JSON.stringify({
          transfer_to: to_user_id,
          transfer_type: 'user_transfer'
        })
      });

      // Get recipient's current balance
      const recipientBalance = await trx.query(`
        SELECT COALESCE(SUM(delta), 0) as balance
        FROM credits_transactions
        WHERE user_id = $1
      `, [to_user_id]);

      const newRecipientBalance = recipientBalance[0].balance + amount;

      // Add to recipient
      await trx.create('credits_transactions', {
        user_id: to_user_id,
        delta: amount,
        reason: reason || `Transfer from user ${userId}`,
        balance_after: newRecipientBalance,
        metadata: JSON.stringify({
          transfer_from: userId,
          transfer_type: 'user_transfer'
        })
      });

      // Notify both users
      req.app.locals.ws.notifyUser(userId, {
        type: 'credits:updated',
        delta: -amount,
        balance: newSenderBalance,
        reason: `Transfer to user ${to_user_id}`
      });

      req.app.locals.ws.notifyUser(to_user_id, {
        type: 'credits:updated',
        delta: amount,
        balance: newRecipientBalance,
        reason: `Transfer from user ${userId}`
      });
    });

    logger.info(`Credits transferred: ${amount} from ${userId} to ${to_user_id}`);
    
    res.json({
      success: true,
      message: 'Credits transferred successfully'
    });
  } catch (error: any) {
    logger.error('Transfer credits error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to transfer credits'
    });
  }
});

// Create purchase
router.post('/purchase', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { track_file_id, payment_method_id } = req.body;

    // Get track file details
    const trackFile = await req.app.locals.db.findById('track_files', track_file_id);
    if (!trackFile) {
      return res.status(404).json({
        success: false,
        error: 'Track file not found'
      });
    }

    if (trackFile.owner_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot purchase your own track'
      });
    }

    if (!trackFile.price_cents || trackFile.price_cents <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Track is not for sale'
      });
    }

    // Check if already purchased
    const existingPurchase = await req.app.locals.db.query(`
      SELECT id FROM purchases WHERE buyer_id = $1 AND track_file_id = $2
    `, [userId, track_file_id]);

    if (existingPurchase.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have already purchased this track'
      });
    }

    // Create Stripe payment intent
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: trackFile.price_cents,
      currency: trackFile.currency || 'usd',
      payment_method: payment_method_id,
      confirm: true,
      metadata: {
        user_id: userId,
        track_file_id: track_file_id,
        track_id: trackFile.track_id
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Get license details
      const license = await req.app.locals.db.query(`
        SELECT * FROM licenses WHERE track_file_id = $1
      `, [track_file_id]);

      // Create purchase record
      const purchase = await req.app.locals.db.create('purchases', {
        buyer_id: userId,
        track_file_id: track_file_id,
        amount_cents: trackFile.price_cents,
        currency: trackFile.currency || 'usd',
        license_snapshot: JSON.stringify(license[0] || {}),
        delivered: true
      });

      // Create payment record
      await req.app.locals.db.create('payments', {
        provider: 'stripe',
        provider_payment_id: paymentIntent.id,
        status: 'succeeded',
        amount_cents: trackFile.price_cents,
        currency: trackFile.currency || 'usd',
        metadata: JSON.stringify(paymentIntent)
      });

      // Create access grant
      await req.app.locals.db.create('access_grants', {
        user_id: userId,
        track_file_id: track_file_id,
        grant_type: 'purchase'
      });

      // Notify seller
      req.app.locals.ws.notifyUser(trackFile.owner_id, {
        type: 'purchase:completed',
        track_file_id: track_file_id,
        track_id: trackFile.track_id,
        amount_cents: trackFile.price_cents,
        buyer_id: userId
      });

      logger.info(`Track purchased: ${track_file_id} by user ${userId}`);
      
      res.json({
        success: true,
        purchase: purchase,
        message: 'Track purchased successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment failed'
      });
    }
  } catch (error: any) {
    logger.error('Create purchase error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create purchase'
    });
  }
});

export default router;