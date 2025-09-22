import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Search tracks
router.get('/tracks', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { q, genre, bpm_min, bpm_max, key, page = 1, limit = 20 } = req.query;

    let query = db('tracks')
      .select('tracks.*', 'profiles.display_name as artist_name')
      .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
      .where('tracks.is_public', true);

    if (q) {
      query = query.where(function() {
        this.where('tracks.title', 'ilike', `%${q}%`)
          .orWhere('tracks.artist', 'ilike', `%${q}%`)
          .orWhere('tracks.genre', 'ilike', `%${q}%`)
          .orWhere('profiles.display_name', 'ilike', `%${q}%`);
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

    if (key) {
      query = query.where('tracks.key', key);
    }

    const tracks = await query
      .orderBy('tracks.created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ tracks });
  } catch (error: any) {
    logger.error('Search tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular tracks
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { limit = 20 } = req.query;

    const tracks = await db('tracks')
      .select('tracks.*', 'profiles.display_name as artist_name')
      .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
      .where('tracks.is_public', true)
      .orderBy('tracks.download_count', 'desc')
      .limit(parseInt(limit as string));

    res.json({ tracks });
  } catch (error: any) {
    logger.error('Get popular tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent tracks
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const db = (req as any).app.locals.db.getKnex();
    const { limit = 20 } = req.query;

    const tracks = await db('tracks')
      .select('tracks.*', 'profiles.display_name as artist_name')
      .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
      .where('tracks.is_public', true)
      .orderBy('tracks.created_at', 'desc')
      .limit(parseInt(limit as string));

    res.json({ tracks });
  } catch (error: any) {
    logger.error('Get recent tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;