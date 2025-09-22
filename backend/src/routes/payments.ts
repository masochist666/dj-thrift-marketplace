import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user's payment methods
router.get('/methods', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    const paymentMethods = await db('payment_methods')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc');

    res.json({ paymentMethods });
  } catch (error: any) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payment method
router.post('/methods', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { type, details } = req.body;

    const [paymentMethod] = await db('payment_methods').insert({
      user_id: req.user.id,
      type,
      details: JSON.stringify(details),
      is_default: false,
      created_at: new Date()
    }).returning('*');

    res.status(201).json({ paymentMethod });
  } catch (error: any) {
    logger.error('Add payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's credits
router.get('/credits', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    const credits = await db('credits')
      .where('user_id', req.user.id)
      .sum('amount as total')
      .first();

    res.json({ credits: credits?.total || 0 });
  } catch (error: any) {
    logger.error('Get credits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Purchase credits
router.post('/credits/purchase', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { amount, payment_method_id } = req.body;

    // Create payment intent
    const [payment] = await db('payments').insert({
      user_id: req.user.id,
      amount,
      currency: 'USD',
      status: 'pending',
      type: 'credit_purchase',
      created_at: new Date()
    }).returning('*');

    res.status(201).json({ payment });
  } catch (error: any) {
    logger.error('Purchase credits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;