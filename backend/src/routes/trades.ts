import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Create trade proposal
router.post('/', authenticateToken, [
  body('offered_track_id').notEmpty().withMessage('Offered track ID is required'),
  body('requested_track_id').notEmpty().withMessage('Requested track ID is required'),
  body('message').optional()
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = (req as any).app.locals.db.getKnex();
    const { offered_track_id, requested_track_id, message } = req.body;

    // Check if tracks exist and belong to different users
    const offeredTrack = await db('tracks').where('id', offered_track_id).first();
    const requestedTrack = await db('tracks').where('id', requested_track_id).first();

    if (!offeredTrack || !requestedTrack) {
      return res.status(404).json({ error: 'One or both tracks not found' });
    }

    if (offeredTrack.user_id === requestedTrack.user_id) {
      return res.status(400).json({ error: 'Cannot trade with yourself' });
    }

    if (offeredTrack.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only trade your own tracks' });
    }

    const [trade] = await db('trades').insert({
      proposer_id: req.user.id,
      recipient_id: requestedTrack.user_id,
      offered_track_id,
      requested_track_id,
      message,
      status: 'pending',
      created_at: new Date()
    }).returning('*');

    res.status(201).json({ trade });
  } catch (error: any) {
    logger.error('Create trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's trades
router.get('/my-trades', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    const sentTrades = await db('trades')
      .select('trades.*', 'offered.title as offered_title', 'requested.title as requested_title')
      .leftJoin('tracks as offered', 'trades.offered_track_id', 'offered.id')
      .leftJoin('tracks as requested', 'trades.requested_track_id', 'requested.id')
      .where('trades.proposer_id', req.user.id)
      .orderBy('trades.created_at', 'desc');

    const receivedTrades = await db('trades')
      .select('trades.*', 'offered.title as offered_title', 'requested.title as requested_title')
      .leftJoin('tracks as offered', 'trades.offered_track_id', 'offered.id')
      .leftJoin('tracks as requested', 'trades.requested_track_id', 'requested.id')
      .where('trades.recipient_id', req.user.id)
      .orderBy('trades.created_at', 'desc');

    res.json({ sentTrades, receivedTrades });
  } catch (error: any) {
    logger.error('Get trades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to trade
router.put('/:id/respond', authenticateToken, [
  body('status').isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected')
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = (req as any).app.locals.db.getKnex();
    const { status } = req.body;

    const [trade] = await db('trades')
      .where('id', req.params.id)
      .where('recipient_id', req.user.id)
      .where('status', 'pending')
      .update({
        status,
        responded_at: new Date()
      })
      .returning('*');

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json({ trade });
  } catch (error: any) {
    logger.error('Respond to trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;