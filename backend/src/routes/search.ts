import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// Search tracks
router.get('/tracks', async (req: express.Request, res: express.Response) => {
  try {
    const {
      q,
      bpm_min,
      bpm_max,
      key,
      genre,
      price_min,
      price_max,
      owner_id,
      visibility,
      limit,
      offset,
      sort
    } = req.query;

    const searchParams = {
      q: q as string,
      bpm_min: bpm_min ? parseInt(bpm_min as string) : undefined,
      bpm_max: bpm_max ? parseInt(bpm_max as string) : undefined,
      key: key as string,
      genre: genre as string,
      price_min: price_min ? parseInt(price_min as string) : undefined,
      price_max: price_max ? parseInt(price_max as string) : undefined,
      owner_id: owner_id as string,
      visibility: visibility as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      sort: sort as string
    };

    const results = await req.app.locals.search.searchTracks(searchParams);

    res.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    logger.error('Search tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search tracks'
    });
  }
});

// Get track details
router.get('/tracks/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const track = await req.app.locals.search.getTrackById(id);

    if (!track) {
      return res.status(404).json({
        success: false,
        error: 'Track not found'
      });
    }

    res.json({
      success: true,
      track
    });
  } catch (error: any) {
    logger.error('Get track details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get track details'
    });
  }
});

// Get similar tracks
router.get('/tracks/:id/similar', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const similarTracks = await req.app.locals.search.getSimilarTracks(
      id,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      tracks: similarTracks
    });
  } catch (error: any) {
    logger.error('Get similar tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get similar tracks'
    });
  }
});

// Get trending tracks
router.get('/trending', async (req: express.Request, res: express.Response) => {
  try {
    const { limit = 20 } = req.query;

    const trendingTracks = await req.app.locals.search.getTrendingTracks(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      tracks: trendingTracks
    });
  } catch (error: any) {
    logger.error('Get trending tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trending tracks'
    });
  }
});

// Get featured tracks
router.get('/featured', async (req: express.Request, res: express.Response) => {
  try {
    const { limit = 20 } = req.query;

    const featuredTracks = await req.app.locals.search.getFeaturedTracks(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      tracks: featuredTracks
    });
  } catch (error: any) {
    logger.error('Get featured tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get featured tracks'
    });
  }
});

// Get genres
router.get('/genres', async (req: express.Request, res: express.Response) => {
  try {
    const genres = await req.app.locals.search.getGenres();

    res.json({
      success: true,
      genres
    });
  } catch (error: any) {
    logger.error('Get genres error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get genres'
    });
  }
});

// Get musical keys
router.get('/keys', async (req: express.Request, res: express.Response) => {
  try {
    const keys = await req.app.locals.search.getKeys();

    res.json({
      success: true,
      keys
    });
  } catch (error: any) {
    logger.error('Get keys error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get keys'
    });
  }
});

export default router;
