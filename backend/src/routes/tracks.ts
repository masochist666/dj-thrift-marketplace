import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { TrackService } from '../services/TrackService';
import { AudioAnalysisService } from '../services/AudioAnalysisService';
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

// Create track endpoint
router.post('/', [
  authenticateToken,
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 1000 }),
  body('main_genre').optional().isLength({ max: 50 }),
  body('visibility').optional().isIn(['public', 'private', 'trade_only', 'promo']),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const track = await trackService.createTrack(req.userId!, req.body);
    
    logger.info(`Track created: ${track.id} by user ${req.userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Track created successfully',
      track: {
        id: track.id,
        title: track.title,
        description: track.description,
        main_genre: track.main_genre,
        visibility: track.visibility,
        is_published: track.is_published,
        created_at: track.created_at
      }
    });
  } catch (error: any) {
    logger.error('Create track error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create track'
    });
  }
});

// Initialize upload endpoint
router.post('/:trackId/upload-init', [
  authenticateToken,
  body('file_name').notEmpty().withMessage('File name is required'),
  body('file_type').isIn(['wav', 'mp3', 'aiff', 'flac']).withMessage('Invalid file type'),
  body('file_size').isInt({ min: 1, max: 100 * 1024 * 1024 }).withMessage('File size must be between 1 byte and 100MB'),
  body('content_type').notEmpty().withMessage('Content type is required'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    // Verify track ownership
    const track = await req.app.locals.db.findById('tracks', trackId);
    if (!track || track.owner_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Track not found or access denied'
      });
    }
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const uploadData = await trackService.initUpload(trackId, req.body);
    
    logger.info(`Upload initiated for track ${trackId}: ${uploadData.s3_key}`);
    
    res.json({
      success: true,
      upload_id: uploadData.upload_id,
      presigned_url: uploadData.presigned_url,
      s3_key: uploadData.s3_key,
      expires_at: uploadData.expires_at
    });
  } catch (error: any) {
    logger.error('Upload init error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to initialize upload'
    });
  }
});

// Complete upload endpoint
router.post('/:trackId/upload-complete', [
  authenticateToken,
  body('upload_id').notEmpty().withMessage('Upload ID is required'),
  body('s3_key').notEmpty().withMessage('S3 key is required'),
  body('file_type').isIn(['wav', 'mp3', 'aiff', 'flac']).withMessage('Invalid file type'),
  body('sample_rate').optional().isInt({ min: 8000, max: 192000 }),
  body('channels').optional().isInt({ min: 1, max: 8 }),
  body('duration_ms').optional().isInt({ min: 1000, max: 3600000 }),
  body('file_size').optional().isInt({ min: 1 }),
  body('price_cents').optional().isInt({ min: 0, max: 100000 }),
  body('is_preview').optional().isBoolean(),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    // Verify track ownership
    const track = await req.app.locals.db.findById('tracks', trackId);
    if (!track || track.owner_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Track not found or access denied'
      });
    }
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const trackFile = await trackService.completeUpload(trackId, {
      ...req.body,
      owner_id: req.userId!
    });
    
    logger.info(`Upload completed for track ${trackId}: ${trackFile.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Upload completed successfully',
      track_file: {
        id: trackFile.id,
        file_type: trackFile.file_type,
        duration_ms: trackFile.duration_ms,
        file_size: trackFile.file_size,
        price_cents: trackFile.price_cents,
        is_preview: trackFile.is_preview,
        created_at: trackFile.created_at
      }
    });
  } catch (error: any) {
    logger.error('Upload complete error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to complete upload'
    });
  }
});

// Search tracks endpoint
router.get('/', [
  query('q').optional().isLength({ min: 1, max: 100 }),
  query('bpm_min').optional().isInt({ min: 60, max: 200 }),
  query('bpm_max').optional().isInt({ min: 60, max: 200 }),
  query('key').optional().isLength({ min: 1, max: 20 }),
  query('genre').optional().isLength({ min: 1, max: 50 }),
  query('price_min').optional().isInt({ min: 0 }),
  query('price_max').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const tracks = await trackService.searchTracks(req.query);
    
    res.json({
      success: true,
      results: tracks,
      count: tracks.length,
      filters: req.query
    });
  } catch (error: any) {
    logger.error('Search tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search tracks'
    });
  }
});

// Get track details endpoint
router.get('/:trackId', async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const trackData = await trackService.getTrack(trackId);
    
    res.json({
      success: true,
      track: trackData.track,
      files: trackData.files,
      metadata: trackData.metadata,
      licenses: trackData.licenses
    });
  } catch (error: any) {
    logger.error('Get track error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Track not found'
    });
  }
});

// Get user's tracks endpoint
router.get('/user/:userId', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const tracks = await trackService.getUserTracks(userId, req.query);
    
    res.json({
      success: true,
      tracks: tracks,
      count: tracks.length
    });
  } catch (error: any) {
    logger.error('Get user tracks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user tracks'
    });
  }
});

// Update track endpoint
router.patch('/:trackId', [
  authenticateToken,
  body('title').optional().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('main_genre').optional().isLength({ max: 50 }),
  body('visibility').optional().isIn(['public', 'private', 'trade_only', 'promo']),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const track = await trackService.updateTrack(trackId, req.userId!, req.body);
    
    logger.info(`Track updated: ${trackId} by user ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Track updated successfully',
      track: track
    });
  } catch (error: any) {
    logger.error('Update track error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update track'
    });
  }
});

// Publish track endpoint
router.post('/:trackId/publish', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const track = await trackService.publishTrack(trackId, req.userId!);
    
    // Notify followers
    req.app.locals.ws.sendTrackPublishedNotification(trackId, req.userId!, []);
    
    logger.info(`Track published: ${trackId} by user ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Track published successfully',
      track: track
    });
  } catch (error: any) {
    logger.error('Publish track error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to publish track'
    });
  }
});

// Delete track endpoint
router.delete('/:trackId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { trackId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const deleted = await trackService.deleteTrack(trackId, req.userId!);
    
    if (deleted) {
      logger.info(`Track deleted: ${trackId} by user ${req.userId}`);
      res.json({
        success: true,
        message: 'Track deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Track not found'
      });
    }
  } catch (error: any) {
    logger.error('Delete track error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete track'
    });
  }
});

// Get download URL endpoint
router.get('/:trackId/download/:fileId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { trackId, fileId } = req.params;
    
    const trackService = new TrackService(req.app.locals.db, req.app.locals.audio);
    const downloadData = await trackService.getDownloadUrl(fileId, req.userId!);
    
    logger.info(`Download URL generated for track file ${fileId} by user ${req.userId}`);
    
    res.json({
      success: true,
      download_url: downloadData.download_url
    });
  } catch (error: any) {
    logger.error('Get download URL error:', error);
    res.status(403).json({
      success: false,
      error: error.message || 'Access denied'
    });
  }
});

export default router;
