import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all tracks
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { page = 1, limit = 20, search, genre, bpm_min, bpm_max } = req.query;

    let query = db('tracks')
      .select('tracks.*', 'profiles.display_name as artist_name')
      .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
      .where('tracks.is_public', true);

    if (search) {
      query = query.where(function() {
        this.where('tracks.title', 'ilike', `%${search}%`)
          .orWhere('tracks.artist', 'ilike', `%${search}%`)
          .orWhere('tracks.genre', 'ilike', `%${search}%`);
      });
    }

    if (genre) {
      query = query.where('tracks.genre', genre);
    }

    if (bpm_min) {
      query = query.where('tracks.bpm', '>=', bpm_min);
    }

    if (bpm_max) {
      query = query.where('tracks.bpm', '<=', bpm_max);
    }

    const tracks = await query
      .orderBy('tracks.created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ tracks });
  } catch (error: any) {
    logger.error('Get tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get track by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const track = await db('tracks')
      .select('tracks.*', 'profiles.display_name as artist_name')
      .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
      .where('tracks.id', req.params.id)
      .first();

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json({ track });
  } catch (error: any) {
    logger.error('Get track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create track
router.post('/', authenticateToken, [
  body('title').notEmpty().withMessage('Title is required'),
  body('artist').notEmpty().withMessage('Artist is required'),
  body('genre').notEmpty().withMessage('Genre is required')
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = (req as any).app.locals.db.getKnex();
    const { title, artist, genre, description } = req.body;

    const [track] = await db('tracks').insert({
      user_id: req.user.id,
      title,
      artist,
      genre,
      description,
      is_public: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    res.status(201).json({ track });
  } catch (error: any) {
    logger.error('Create track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update track
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { title, artist, genre, description, is_public } = req.body;

    const [track] = await db('tracks')
      .where('id', req.params.id)
      .where('user_id', req.user.id)
      .update({
        title,
        artist,
        genre,
        description,
        is_public,
        updated_at: new Date()
      })
      .returning('*');

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json({ track });
  } catch (error: any) {
    logger.error('Update track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete track
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    
    const deleted = await db('tracks')
      .where('id', req.params.id)
      .where('user_id', req.user.id)
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json({ message: 'Track deleted successfully' });
  } catch (error: any) {
    logger.error('Delete track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;