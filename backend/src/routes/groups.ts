import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate, groupSchema, messageSchema } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = express.Router();

// Get user's groups
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const groups = await req.app.locals.db.query(`
      SELECT g.*, gm.role, gm.joined_at
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY gm.joined_at DESC
    `, [userId]);

    res.json({
      success: true,
      groups: groups
    });
  } catch (error: any) {
    logger.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get groups'
    });
  }
});

// Get group details
router.get('/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;

    // Check if user is member of group
    const membership = await req.app.locals.db.query(`
      SELECT gm.role, gm.joined_at
      FROM group_members gm
      WHERE gm.group_id = $1 AND gm.user_id = $2
    `, [id, userId]);

    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not a member of this group.'
      });
    }

    // Get group details
    const group = await req.app.locals.db.findById('groups', id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Get members
    const members = await req.app.locals.db.query(`
      SELECT u.id, p.display_name, p.avatar_url, gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at ASC
    `, [id]);

    // Get recent messages
    const messages = await req.app.locals.db.query(`
      SELECT m.*, p.display_name as sender_name, p.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN profiles p ON m.sender_id = p.user_id
      WHERE m.group_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [id]);

    res.json({
      success: true,
      group: {
        ...group,
        membership: membership[0],
        members: members,
        recent_messages: messages.reverse()
      }
    });
  } catch (error: any) {
    logger.error('Get group details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get group details'
    });
  }
});

// Create group
router.post('/', [
  authMiddleware,
  validate(groupSchema)
], async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.user!;
    const { name, description, is_private, invite_ids } = req.body;

    // Create group
    const group = await req.app.locals.db.create('groups', {
      name,
      description,
      owner_id: userId,
      is_private: is_private || true
    });

    // Add owner as admin
    await req.app.locals.db.create('group_members', {
      group_id: group.id,
      user_id: userId,
      role: 'owner'
    });

    // Add invited members
    if (invite_ids && invite_ids.length > 0) {
      for (const inviteId of invite_ids) {
        await req.app.locals.db.create('group_members', {
          group_id: group.id,
          user_id: inviteId,
          role: 'member'
        });

        // Send invitation notification
        req.app.locals.ws.notifyUser(inviteId, {
          type: 'group:invitation',
          group_id: group.id,
          group_name: name,
          inviter_id: userId
        });
      }
    }

    logger.info(`Group created: ${group.id} by user ${userId}`);
    
    res.status(201).json({
      success: true,
      group: group
    });
  } catch (error: any) {
    logger.error('Create group error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create group'
    });
  }
});

// Join group
router.post('/:id/join', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;

    // Check if group exists
    const group = await req.app.locals.db.findById('groups', id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if already a member
    const existingMembership = await req.app.locals.db.query(`
      SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (existingMembership.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this group'
      });
    }

    // Add member
    await req.app.locals.db.create('group_members', {
      group_id: id,
      user_id: userId,
      role: 'member'
    });

    // Notify group members
    req.app.locals.ws.notifyGroup(id, {
      type: 'member_joined',
      user_id: userId,
      group_id: id
    });

    logger.info(`User ${userId} joined group ${id}`);
    
    res.json({
      success: true,
      message: 'Successfully joined group'
    });
  } catch (error: any) {
    logger.error('Join group error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to join group'
    });
  }
});

// Leave group
router.post('/:id/leave', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;

    // Check if user is member
    const membership = await req.app.locals.db.query(`
      SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (membership.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }

    // Check if owner trying to leave
    if (membership[0].role === 'owner') {
      return res.status(400).json({
        success: false,
        error: 'Group owner cannot leave. Transfer ownership or delete group first.'
      });
    }

    // Remove member
    await req.app.locals.db.query(`
      DELETE FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    // Notify group members
    req.app.locals.ws.notifyGroup(id, {
      type: 'member_left',
      user_id: userId,
      group_id: id
    });

    logger.info(`User ${userId} left group ${id}`);
    
    res.json({
      success: true,
      message: 'Successfully left group'
    });
  } catch (error: any) {
    logger.error('Leave group error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to leave group'
    });
  }
});

// Send message
router.post('/:id/messages', [
  authMiddleware,
  validate(messageSchema)
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const { content, attachments } = req.body;

    // Check if user is member
    const membership = await req.app.locals.db.query(`
      SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }

    // Create message
    const message = await req.app.locals.db.create('messages', {
      group_id: id,
      sender_id: userId,
      content,
      attachments: attachments ? JSON.stringify(attachments) : null
    });

    // Get sender info
    const sender = await req.app.locals.db.query(`
      SELECT p.display_name, p.avatar_url
      FROM profiles p
      WHERE p.user_id = $1
    `, [userId]);

    const messageWithSender = {
      ...message,
      sender_name: sender[0]?.display_name || 'Unknown',
      sender_avatar: sender[0]?.avatar_url
    };

    // Notify group members
    req.app.locals.ws.notifyGroup(id, {
      type: 'group_message',
      message: messageWithSender
    });

    logger.info(`Message sent in group ${id} by user ${userId}`);
    
    res.status(201).json({
      success: true,
      message: messageWithSender
    });
  } catch (error: any) {
    logger.error('Send message error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
});

// Get messages
router.get('/:id/messages', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is member
    const membership = await req.app.locals.db.query(`
      SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }

    // Get messages
    const messages = await req.app.locals.db.query(`
      SELECT m.*, p.display_name as sender_name, p.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN profiles p ON m.sender_id = p.user_id
      WHERE m.group_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      messages: messages.reverse()
    });
  } catch (error: any) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages'
    });
  }
});

// Invite user to group
router.post('/:id/invite', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const { user_id } = req.body;

    // Check if user is admin or owner
    const membership = await req.app.locals.db.query(`
      SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (membership.length === 0 || !['owner', 'admin'].includes(membership[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'Only group admins can invite users'
      });
    }

    // Check if user already a member
    const existingMembership = await req.app.locals.db.query(`
      SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [id, user_id]);

    if (existingMembership.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this group'
      });
    }

    // Add member
    await req.app.locals.db.create('group_members', {
      group_id: id,
      user_id: user_id,
      role: 'member'
    });

    // Get group name for notification
    const group = await req.app.locals.db.findById('groups', id);
    const inviter = await req.app.locals.db.query(`
      SELECT display_name FROM profiles WHERE user_id = $1
    `, [userId]);

    // Send invitation notification
    req.app.locals.ws.notifyUser(user_id, {
      type: 'group:invitation',
      group_id: id,
      group_name: group?.name,
      inviter_id: userId,
      inviter_name: inviter[0]?.display_name
    });

    logger.info(`User ${user_id} invited to group ${id} by ${userId}`);
    
    res.json({
      success: true,
      message: 'User invited successfully'
    });
  } catch (error: any) {
    logger.error('Invite user error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to invite user'
    });
  }
});

export default router;