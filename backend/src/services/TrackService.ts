import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { AudioAnalysisService } from './AudioAnalysisService';
import { logger } from '../utils/logger';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export interface Track {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  main_genre?: string;
  visibility: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackFile {
  id: string;
  track_id: string;
  owner_id: string;
  s3_key: string;
  file_type: string;
  sample_rate?: number;
  channels?: number;
  duration_ms?: number;
  file_size?: number;
  price_cents?: number;
  currency: string;
  is_preview: boolean;
  transferable: boolean;
  created_at: string;
}

export class TrackService {
  constructor(
    private db: DatabaseService,
    private audioService: AudioAnalysisService
  ) {}

  async createTrack(ownerId: string, trackData: {
    title: string;
    description?: string;
    main_genre?: string;
    visibility?: string;
  }): Promise<Track> {
    try {
      const track = await this.db.create('tracks', {
        owner_id: ownerId,
        title: trackData.title,
        description: trackData.description,
        main_genre: trackData.main_genre,
        visibility: trackData.visibility || 'private',
        is_published: false
      });

      logger.info(`Track created: ${track.id} by user ${ownerId}`);
      return track;
    } catch (error) {
      logger.error('Track creation error:', error);
      throw error;
    }
  }

  async initUpload(trackId: string, fileData: {
    file_name: string;
    file_type: string;
    file_size: number;
    content_type: string;
  }): Promise<{
    upload_id: string;
    presigned_url: string;
    s3_key: string;
    expires_at: Date;
  }> {
    try {
      const uploadId = uuidv4();
      const s3Key = `tracks/${trackId}/${uploadId}-${fileData.file_name}`;
      
      const presignedUrl = s3.getSignedUrl('putObject', {
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        ContentType: fileData.content_type,
        Expires: 3600
      });

      logger.info(`Upload initiated for track ${trackId}: ${s3Key}`);
      
      return {
        upload_id: uploadId,
        presigned_url: presignedUrl,
        s3_key: s3Key,
        expires_at: new Date(Date.now() + 3600000)
      };
    } catch (error) {
      logger.error('Upload init error:', error);
      throw error;
    }
  }

  async completeUpload(trackId: string, uploadData: {
    owner_id: string;
    upload_id: string;
    s3_key: string;
    file_type: string;
    sample_rate?: number;
    channels?: number;
    duration_ms?: number;
    file_size?: number;
    price_cents?: number;
    is_preview?: boolean;
  }): Promise<TrackFile> {
    try {
      const trackFile = await this.db.create('track_files', {
        track_id: trackId,
        owner_id: uploadData.owner_id,
        s3_key: uploadData.s3_key,
        file_type: uploadData.file_type,
        sample_rate: uploadData.sample_rate,
        channels: uploadData.channels,
        duration_ms: uploadData.duration_ms,
        file_size: uploadData.file_size,
        price_cents: uploadData.price_cents,
        is_preview: uploadData.is_preview || false,
        transferable: true
      });

      // Create default license
      await this.db.create('licenses', {
        track_file_id: trackFile.id,
        license_type: 'dj_play',
        permissions: JSON.stringify({ 
          play: true, 
          remix: false, 
          resale: false, 
          commercial: false 
        }),
        terms: 'Standard DJ play license - for personal and club use only'
      });

      // Queue audio analysis if not a preview
      if (!uploadData.is_preview) {
        this.audioService.analyzeTrack(trackFile.id, uploadData.s3_key);
      }

      logger.info(`Upload completed for track ${trackId}: ${trackFile.id}`);
      return trackFile;
    } catch (error) {
      logger.error('Upload completion error:', error);
      throw error;
    }
  }

  async searchTracks(filters: {
    q?: string;
    bpm_min?: number;
    bpm_max?: number;
    key?: string;
    genre?: string;
    price_min?: number;
    price_max?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT DISTINCT t.*, tf.*, tm.bpm, tm.musical_key, tm.waveform_s3, tm.cue_points,
          p.display_name as owner_name, p.reputation as owner_reputation,
          l.license_type, l.permissions, l.terms
        FROM tracks t
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN licenses l ON tf.id = l.track_file_id
        WHERE t.visibility = 'public' AND t.is_published = true
      `;

      const params: any[] = [];
      let paramCount = 1;

      // Text search
      if (filters.q) {
        query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
        params.push(`%${filters.q}%`);
        paramCount++;
      }

      // BPM range
      if (filters.bpm_min) {
        query += ` AND tm.bpm >= $${paramCount}`;
        params.push(filters.bpm_min);
        paramCount++;
      }

      if (filters.bpm_max) {
        query += ` AND tm.bpm <= $${paramCount}`;
        params.push(filters.bpm_max);
        paramCount++;
      }

      // Musical key
      if (filters.key) {
        query += ` AND tm.musical_key = $${paramCount}`;
        params.push(filters.key);
        paramCount++;
      }

      // Genre
      if (filters.genre) {
        query += ` AND t.main_genre = $${paramCount}`;
        params.push(filters.genre);
        paramCount++;
      }

      // Price range
      if (filters.price_min) {
        query += ` AND tf.price_cents >= $${paramCount}`;
        params.push(filters.price_min);
        paramCount++;
      }

      if (filters.price_max) {
        query += ` AND tf.price_cents <= $${paramCount}`;
        params.push(filters.price_max);
        paramCount++;
      }

      // Ordering and pagination
      query += ` ORDER BY t.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
        paramCount++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
        paramCount++;
      }

      const results = await this.db.query(query, params);
      return results;
    } catch (error) {
      logger.error('Track search error:', error);
      throw error;
    }
  }

  async getTrack(trackId: string): Promise<{
    track: Track;
    files: TrackFile[];
    metadata: any[];
    licenses: any[];
  }> {
    try {
      const track = await this.db.query(`
        SELECT t.*, p.display_name as owner_name, p.reputation
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        WHERE t.id = $1
      `, [trackId]);

      if (!track[0]) {
        throw new Error('Track not found');
      }

      const files = await this.db.query(`
        SELECT tf.*, tm.bpm, tm.musical_key, tm.waveform_s3, tm.cue_points, tm.tags,
          l.license_type, l.permissions, l.terms, l.royalty_percent
        FROM track_files tf
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        LEFT JOIN licenses l ON tf.id = l.track_file_id
        WHERE tf.track_id = $1
        ORDER BY tf.created_at ASC
      `, [trackId]);

      return {
        track: track[0],
        files: files,
        metadata: files.filter(f => f.bpm || f.musical_key),
        licenses: files.filter(f => f.license_type)
      };
    } catch (error) {
      logger.error('Get track error:', error);
      throw error;
    }
  }

  async getUserTracks(userId: string, filters: any = {}): Promise<Track[]> {
    try {
      const conditions = { owner_id: userId };
      const options = {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        orderBy: 'created_at',
        orderDirection: 'desc'
      };

      return await this.db.findMany('tracks', conditions, options);
    } catch (error) {
      logger.error('Get user tracks error:', error);
      throw error;
    }
  }

  async updateTrack(trackId: string, userId: string, updateData: any): Promise<Track> {
    try {
      // Verify ownership
      const track = await this.db.findById('tracks', trackId);
      if (!track || track.owner_id !== userId) {
        throw new Error('Track not found or access denied');
      }

      const updatedTrack = await this.db.update('tracks', trackId, {
        ...updateData,
        updated_at: new Date()
      });

      logger.info(`Track updated: ${trackId} by user ${userId}`);
      return updatedTrack;
    } catch (error) {
      logger.error('Update track error:', error);
      throw error;
    }
  }

  async deleteTrack(trackId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const track = await this.db.findById('tracks', trackId);
      if (!track || track.owner_id !== userId) {
        throw new Error('Track not found or access denied');
      }

      // Delete track (cascade will handle related records)
      const deleted = await this.db.delete('tracks', trackId);
      
      logger.info(`Track deleted: ${trackId} by user ${userId}`);
      return deleted;
    } catch (error) {
      logger.error('Delete track error:', error);
      throw error;
    }
  }

  async getDownloadUrl(trackFileId: string, userId: string): Promise<{ download_url: string }> {
    try {
      // Check if user has access
      const access = await this.db.query(`
        SELECT ag.* FROM access_grants ag
        WHERE ag.user_id = $1 AND ag.track_file_id = $2
      `, [userId, trackFileId]);

      if (!access[0]) {
        throw new Error('Access denied - you do not have permission to download this track');
      }

      const file = await this.db.findById('track_files', trackFileId);
      if (!file) {
        throw new Error('Track file not found');
      }

      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET,
        Key: file.s3_key,
        Expires: 3600 // 1 hour
      });

      logger.info(`Download URL generated for track file ${trackFileId} by user ${userId}`);
      return { download_url: downloadUrl };
    } catch (error) {
      logger.error('Get download URL error:', error);
      throw error;
    }
  }

  async publishTrack(trackId: string, userId: string): Promise<Track> {
    try {
      // Verify ownership
      const track = await this.db.findById('tracks', trackId);
      if (!track || track.owner_id !== userId) {
        throw new Error('Track not found or access denied');
      }

      // Check if track has files
      const files = await this.db.findMany('track_files', { track_id: trackId });
      if (files.length === 0) {
        throw new Error('Cannot publish track without files');
      }

      const updatedTrack = await this.db.update('tracks', trackId, {
        is_published: true,
        visibility: 'public',
        updated_at: new Date()
      });

      logger.info(`Track published: ${trackId} by user ${userId}`);
      return updatedTrack;
    } catch (error) {
      logger.error('Publish track error:', error);
      throw error;
    }
  }
}

