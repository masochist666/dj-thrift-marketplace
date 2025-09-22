import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { TradeService } from '../services/TradeService';
import { WebSocketService } from '../services/WebSocketService';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Authentication middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Create trade endpoint
router.post('/', [
  authenticateToken,
  body('receiver_id').isUUID().withMessage('Valid receiver ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item must be offered'),
  body('items.*.track_file_id').optional().isUUID(),
  body('items.*.credits_offered').optional().isInt({ min: 0 }),
  body('items.*.cash_offered_cents').optional().isInt({ min: 0 }),
  body('requested_items').isArray().withMessage('Requested items must be an array'),
  body('requested_items.*.track_file_id').isUUID().withMessage('Valid track file ID is required'),
  body('expires_in_seconds').optional().isInt({ min: 300, max: 604800 }), // 5 minutes to 7 days
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const trade = await tradeService.createTrade(req.userId!, req.body);
    
    logger.info(`Trade created: ${trade.id} by user ${req.userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Trade proposal created successfully',
      trade: {
        id: trade.id,
        proposer_id: trade.proposer_id,
        receiver_id: trade.receiver_id,
        status: trade.status,
        created_at: trade.created_at,
        expires_at: trade.expires_at
      }
    });
  } catch (error: any) {
    logger.error('Create trade error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create trade'
    });
  }
});

// Get trade details endpoint
router.get('/:tradeId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { tradeId } = req.params;
    
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const tradeData = await tradeService.getTrade(tradeId, req.userId!);
    
    res.json({
      success: true,
      trade: tradeData.trade,
      items: tradeData.items,
      requested_items: tradeData.requested_items,
      proposer_profile: tradeData.proposer_profile,
      receiver_profile: tradeData.receiver_profile
    });
  } catch (error: any) {
    logger.error('Get trade error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Trade not found'
    });
  }
});

// Respond to trade endpoint
router.post('/:tradeId/respond', [
  authenticateToken,
  body('action').isIn(['accept', 'decline', 'counter']).withMessage('Action must be accept, decline, or counter'),
  body('counter_items').optional().isArray(),
  body('counter_items.*.track_file_id').optional().isUUID(),
  body('counter_items.*.credits_offered').optional().isInt({ min: 0 }),
  body('counter_items.*.cash_offered_cents').optional().isInt({ min: 0 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { tradeId } = req.params;
    
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const result = await tradeService.respondToTrade(tradeId, req.userId!, req.body);
    
    logger.info(`Trade ${req.body.action}: ${tradeId} by user ${req.userId}`);
    
    res.json({
      success: true,
      message: `Trade ${req.body.action}ed successfully`,
      trade_id: result.trade_id,
      status: result.status
    });
  } catch (error: any) {
    logger.error('Respond to trade error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to respond to trade'
    });
  }
});

// Cancel trade endpoint
router.post('/:tradeId/cancel', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { tradeId } = req.params;
    
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const cancelled = await tradeService.cancelTrade(tradeId, req.userId!);
    
    if (cancelled) {
      logger.info(`Trade cancelled: ${tradeId} by user ${req.userId}`);
      res.json({
        success: true,
        message: 'Trade cancelled successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Trade not found or cannot be cancelled'
      });
    }
  } catch (error: any) {
    logger.error('Cancel trade error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel trade'
    });
  }
});

// Get user's trades endpoint
router.get('/', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const trades = await tradeService.getUserTrades(req.userId!, req.query);
    
    res.json({
      success: true,
      trades: trades,
      count: trades.length
    });
  } catch (error: any) {
    logger.error('Get user trades error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trades'
    });
  }
});

// Get trade statistics endpoint
router.get('/stats/overview', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const stats = await req.app.locals.db.query(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trades,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trades,
        COUNT(CASE WHEN proposer_id = $1 AND status = 'completed' THEN 1 END) as trades_proposed,
        COUNT(CASE WHEN receiver_id = $1 AND status = 'completed' THEN 1 END) as trades_received
      FROM trades
      WHERE proposer_id = $1 OR receiver_id = $1
    `, [req.userId]);

    const creditsBalance = await req.app.locals.db.query(`
      SELECT COALESCE(SUM(delta), 0) as balance
      FROM credits_transactions
      WHERE user_id = $1
    `, [req.userId]);

    res.json({
      success: true,
      stats: {
        ...stats[0],
        credits_balance: creditsBalance[0].balance
      }
    });
  } catch (error: any) {
    logger.error('Get trade stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trade statistics'
    });
  }
});

// Get trade history endpoint
router.get('/history/:userId', [
  authenticateToken,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    // Check if user is viewing their own history or has permission
    if (userId !== req.userId) {
      // In a more sophisticated system, you might check if users are friends or have permission
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const trades = await tradeService.getUserTrades(userId, req.query);
    
    res.json({
      success: true,
      trades: trades,
      count: trades.length
    });
  } catch (error: any) {
    logger.error('Get trade history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trade history'
    });
  }
});

// Get pending trades endpoint
router.get('/pending/incoming', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const pendingTrades = await req.app.locals.db.query(`
      SELECT t.*, p.display_name as proposer_name, p.avatar_url as proposer_avatar
      FROM trades t
      LEFT JOIN profiles p ON t.proposer_id = p.user_id
      WHERE t.receiver_id = $1 AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `, [req.userId]);

    res.json({
      success: true,
      trades: pendingTrades,
      count: pendingTrades.length
    });
  } catch (error: any) {
    logger.error('Get pending trades error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending trades'
    });
  }
});

// Get outgoing trades endpoint
router.get('/pending/outgoing', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const outgoingTrades = await req.app.locals.db.query(`
      SELECT t.*, p.display_name as receiver_name, p.avatar_url as receiver_avatar
      FROM trades t
      LEFT JOIN profiles p ON t.receiver_id = p.user_id
      WHERE t.proposer_id = $1 AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `, [req.userId]);

    res.json({
      success: true,
      trades: outgoingTrades,
      count: outgoingTrades.length
    });
  } catch (error: any) {
    logger.error('Get outgoing trades error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get outgoing trades'
    });
  }
});

// Expire old trades endpoint (admin only)
router.post('/expire', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    // Check if user is admin
    const user = await req.app.locals.db.findById('users', req.userId!);
    if (!user || user.role < 3) { // 3 = admin
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const tradeService = new TradeService(req.app.locals.db, req.app.locals.ws);
    const expiredCount = await tradeService.expireTrades();
    
    logger.info(`Expired ${expiredCount} trades by admin ${req.userId}`);
    
    res.json({
      success: true,
      message: `Expired ${expiredCount} trades`,
      expired_count: expiredCount
    });
  } catch (error: any) {
    logger.error('Expire trades error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to expire trades'
    });
  }
});

export default router;
