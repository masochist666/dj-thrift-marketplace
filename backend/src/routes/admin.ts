import express from 'express';
import { body, query, validationResult } from 'express-validator';
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

// Admin authentication middleware
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
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

    // Check if user is admin
    req.app.locals.db.findById('users', decoded.userId).then((user: any) => {
      if (!user || user.role < 3) { // 3 = admin
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      req.userId = decoded.userId;
      next();
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Get system statistics
router.get('/stats', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const stats = await req.app.locals.db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM tracks WHERE is_published = true) as published_tracks,
        (SELECT COUNT(*) FROM trades WHERE status = 'completed') as completed_trades,
        (SELECT COUNT(*) FROM purchases) as total_purchases,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM purchases) as total_revenue,
        (SELECT COUNT(*) FROM groups) as total_groups
    `);

    const recentUsers = await req.app.locals.db.query(`
      SELECT u.id, u.email, u.created_at, p.display_name
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    const recentTrades = await req.app.locals.db.query(`
      SELECT t.*, p1.display_name as proposer_name, p2.display_name as receiver_name
      FROM trades t
      LEFT JOIN profiles p1 ON t.proposer_id = p1.user_id
      LEFT JOIN profiles p2 ON t.receiver_id = p2.user_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: stats[0],
      recent_users: recentUsers,
      recent_trades: recentTrades
    });
  } catch (error: any) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics'
    });
  }
});

// Get flagged content
router.get('/flagged', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const flaggedContent = await req.app.locals.db.query(`
      SELECT 
        'track' as type,
        t.id,
        t.title,
        t.owner_id,
        p.display_name as owner_name,
        t.created_at,
        'Content violation' as reason
      FROM tracks t
      LEFT JOIN profiles p ON t.owner_id = p.user_id
      WHERE t.visibility = 'flagged'
      
      UNION ALL
      
      SELECT 
        'user' as type,
        u.id,
        u.email,
        u.id as owner_id,
        p.display_name as owner_name,
        u.created_at,
        'Account violation' as reason
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = -1
      
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      flagged_content: flaggedContent
    });
  } catch (error: any) {
    logger.error('Get flagged content error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get flagged content'
    });
  }
});

// Moderate content
router.post('/moderate', [
  authenticateAdmin,
  body('target_type').isIn(['track', 'user', 'trade']).withMessage('Invalid target type'),
  body('target_id').isUUID().withMessage('Valid target ID is required'),
  body('action').isIn(['approve', 'reject', 'flag']).withMessage('Invalid action'),
  body('reason').optional().isLength({ max: 500 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { target_type, target_id, action, reason } = req.body;

    let result;
    switch (target_type) {
      case 'track':
        result = await moderateTrack(target_id, action, reason);
        break;
      case 'user':
        result = await moderateUser(target_id, action, reason);
        break;
      case 'trade':
        result = await moderateTrade(target_id, action, reason);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid target type'
        });
    }

    // Log moderation action
    await req.app.locals.db.create('audit_logs', {
      actor_id: req.userId,
      action: `moderate_${target_type}`,
      target: JSON.stringify({ target_id, action, reason }),
      details: JSON.stringify({ timestamp: new Date() })
    });

    logger.info(`Content moderated: ${target_type} ${target_id} by admin ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Content moderated successfully',
      result: result
    });
  } catch (error: any) {
    logger.error('Moderate content error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to moderate content'
    });
  }
});

async function moderateTrack(trackId: string, action: string, reason?: string) {
  const track = await req.app.locals.db.findById('tracks', trackId);
  if (!track) {
    throw new Error('Track not found');
  }

  switch (action) {
    case 'approve':
      return await req.app.locals.db.update('tracks', trackId, {
        visibility: 'public',
        is_published: true
      });
    case 'reject':
      return await req.app.locals.db.update('tracks', trackId, {
        visibility: 'private',
        is_published: false
      });
    case 'flag':
      return await req.app.locals.db.update('tracks', trackId, {
        visibility: 'flagged'
      });
    default:
      throw new Error('Invalid action');
  }
}

async function moderateUser(userId: string, action: string, reason?: string) {
  const user = await req.app.locals.db.findById('users', userId);
  if (!user) {
    throw new Error('User not found');
  }

  switch (action) {
    case 'approve':
      return await req.app.locals.db.update('users', userId, {
        role: 0 // Regular user
      });
    case 'reject':
      return await req.app.locals.db.update('users', userId, {
        role: -1 // Banned user
      });
    case 'flag':
      return await req.app.locals.db.update('users', userId, {
        role: -2 // Flagged user
      });
    default:
      throw new Error('Invalid action');
  }
}

async function moderateTrade(tradeId: string, action: string, reason?: string) {
  const trade = await req.app.locals.db.findById('trades', tradeId);
  if (!trade) {
    throw new Error('Trade not found');
  }

  switch (action) {
    case 'approve':
      return await req.app.locals.db.update('trades', tradeId, {
        status: 'completed'
      });
    case 'reject':
      return await req.app.locals.db.update('trades', tradeId, {
        status: 'cancelled'
      });
    case 'flag':
      return await req.app.locals.db.update('trades', tradeId, {
        status: 'flagged'
      });
    default:
      throw new Error('Invalid action');
  }
}

// Get user management
router.get('/users', [
  authenticateAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('role').optional().isInt(),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { limit = 50, offset = 0, role } = req.query;
    
    let conditions: any = {};
    if (role) {
      conditions.role = role;
    }

    const users = await req.app.locals.db.findMany('users', conditions, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    // Get user profiles
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        const profile = await req.app.locals.db.query(`
          SELECT display_name, reputation, created_at
          FROM profiles WHERE user_id = $1
        `, [user.id]);
        
        return {
          ...user,
          profile: profile[0] || null
        };
      })
    );

    res.json({
      success: true,
      users: usersWithProfiles,
      count: usersWithProfiles.length
    });
  } catch (error: any) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
});

// Update user role
router.patch('/users/:userId/role', [
  authenticateAdmin,
  body('role').isInt({ min: -2, max: 3 }).withMessage('Invalid role'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await req.app.locals.db.findById('users', userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedUser = await req.app.locals.db.update('users', userId, { role });

    // Log role change
    await req.app.locals.db.create('audit_logs', {
      actor_id: req.userId,
      action: 'change_user_role',
      target: JSON.stringify({ user_id: userId, new_role: role }),
      details: JSON.stringify({ timestamp: new Date() })
    });

    logger.info(`User role changed: ${userId} to role ${role} by admin ${req.userId}`);
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    logger.error('Update user role error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update user role'
    });
  }
});

// Get audit logs
router.get('/audit-logs', [
  authenticateAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('action').optional().isLength({ min: 1, max: 50 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { limit = 50, offset = 0, action } = req.query;
    
    let conditions: any = {};
    if (action) {
      conditions.action = action;
    }

    const logs = await req.app.locals.db.findMany('audit_logs', conditions, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });
  } catch (error: any) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get audit logs'
    });
  }
});

export default router;
