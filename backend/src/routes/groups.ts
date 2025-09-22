import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all groups
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { page = 1, limit = 20 } = req.query;

    const groups = await db('groups')
      .select('groups.*', 'profiles.display_name as creator_name')
      .leftJoin('profiles', 'groups.creator_id', 'profiles.user_id')
      .where('groups.is_public', true)
      .orderBy('groups.created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ groups });
  } catch (error: any) {
    logger.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Group name is required'),
  body('description').optional()
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = (req as any).app.locals.db.getKnex();
    const { name, description, is_public = true } = req.body;

    const [group] = await db('groups').insert({
      name,
      description,
      creator_id: req.user.id,
      is_public,
      created_at: new Date()
    }).returning('*');

    // Add creator as member
    await db('group_members').insert({
      group_id: group.id,
      user_id: req.user.id,
      role: 'admin',
      joined_at: new Date()
    });

    res.status(201).json({ group });
  } catch (error: any) {
    logger.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join group
router.post('/:id/join', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const groupId = req.params.id;

    // Check if group exists
    const group = await db('groups').where('id', groupId).first();
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const existingMember = await db('group_members')
      .where('group_id', groupId)
      .where('user_id', req.user.id)
      .first();

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    await db('group_members').insert({
      group_id: groupId,
      user_id: req.user.id,
      role: 'member',
      joined_at: new Date()
    });

    res.json({ message: 'Successfully joined group' });
  } catch (error: any) {
    logger.error('Join group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;