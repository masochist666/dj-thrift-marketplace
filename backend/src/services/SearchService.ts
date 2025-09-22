import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export class SearchService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async searchTracks(params: {
    q?: string;
    bpm_min?: number;
    bpm_max?: number;
    key?: string;
    genre?: string;
    price_min?: number;
    price_max?: number;
    owner_id?: string;
    visibility?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }) {
    try {
      let query = `
        SELECT DISTINCT
          t.id,
          t.title,
          t.description,
          t.main_genre,
          t.visibility,
          t.is_published,
          t.created_at,
          t.updated_at,
          p.display_name as owner_name,
          p.avatar_url as owner_avatar,
          tf.id as best_file_id,
          tf.s3_key,
          tf.file_type,
          tf.duration_ms,
          tf.price_cents,
          tf.currency,
          tf.is_preview,
          tm.bpm,
          tm.musical_key,
          tm.loudness_db,
          tm.waveform_s3,
          tm.cue_points,
          tm.tags
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        WHERE t.is_published = true
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Text search
      if (params.q) {
        conditions.push(`(
          t.title ILIKE $${paramIndex} OR 
          t.description ILIKE $${paramIndex} OR 
          p.display_name ILIKE $${paramIndex} OR
          tm.tags::text ILIKE $${paramIndex}
        )`);
        values.push(`%${params.q}%`);
        paramIndex++;
      }

      // BPM range
      if (params.bpm_min !== undefined) {
        conditions.push(`tm.bpm >= $${paramIndex}`);
        values.push(params.bpm_min);
        paramIndex++;
      }
      if (params.bpm_max !== undefined) {
        conditions.push(`tm.bpm <= $${paramIndex}`);
        values.push(params.bpm_max);
        paramIndex++;
      }

      // Musical key
      if (params.key) {
        conditions.push(`tm.musical_key = $${paramIndex}`);
        values.push(params.key);
        paramIndex++;
      }

      // Genre
      if (params.genre) {
        conditions.push(`t.main_genre = $${paramIndex}`);
        values.push(params.genre);
        paramIndex++;
      }

      // Price range
      if (params.price_min !== undefined) {
        conditions.push(`tf.price_cents >= $${paramIndex}`);
        values.push(params.price_min);
        paramIndex++;
      }
      if (params.price_max !== undefined) {
        conditions.push(`tf.price_cents <= $${paramIndex}`);
        values.push(params.price_max);
        paramIndex++;
      }

      // Owner filter
      if (params.owner_id) {
        conditions.push(`t.owner_id = $${paramIndex}`);
        values.push(params.owner_id);
        paramIndex++;
      }

      // Visibility filter
      if (params.visibility) {
        conditions.push(`t.visibility = $${paramIndex}`);
        values.push(params.visibility);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // Sorting
      const sortField = params.sort || 'created_at';
      const sortDirection = sortField.startsWith('-') ? 'DESC' : 'ASC';
      const actualSortField = sortField.replace('-', '');
      
      query += ` ORDER BY t.${actualSortField} ${sortDirection}`;

      // Pagination
      const limit = params.limit || 20;
      const offset = params.offset || 0;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const results = await this.db.query(query, values);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT t.id)
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        WHERE t.is_published = true
      `;

      if (conditions.length > 0) {
        countQuery += ` AND ${conditions.join(' AND ')}`;
      }

      const countResult = await this.db.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult[0].count);

      return {
        results: results.map(track => ({
          ...track,
          cue_points: track.cue_points ? JSON.parse(track.cue_points) : null,
          tags: track.tags || []
        })),
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Search tracks error:', error);
      throw error;
    }
  }

  async getTrackById(trackId: string) {
    try {
      const track = await this.db.query(`
        SELECT 
          t.*,
          p.display_name as owner_name,
          p.avatar_url as owner_avatar,
          p.bio as owner_bio
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        WHERE t.id = $1
      `, [trackId]);

      if (track.length === 0) {
        return null;
      }

      const files = await this.db.query(`
        SELECT 
          tf.*,
          tm.bpm,
          tm.musical_key,
          tm.loudness_db,
          tm.waveform_s3,
          tm.cue_points,
          tm.tags,
          l.license_type,
          l.permissions,
          l.royalty_percent,
          l.terms
        FROM track_files tf
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        LEFT JOIN licenses l ON tf.id = l.track_file_id
        WHERE tf.track_id = $1
        ORDER BY tf.created_at ASC
      `, [trackId]);

      return {
        ...track[0],
        files: files.map(file => ({
          ...file,
          cue_points: file.cue_points ? JSON.parse(file.cue_points) : null,
          tags: file.tags || [],
          permissions: file.permissions ? JSON.parse(file.permissions) : null
        }))
      };
    } catch (error) {
      logger.error('Get track by ID error:', error);
      throw error;
    }
  }

  async getSimilarTracks(trackId: string, limit: number = 10) {
    try {
      // Get the track's metadata first
      const track = await this.db.query(`
        SELECT tm.bpm, tm.musical_key, t.main_genre
        FROM tracks t
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        WHERE t.id = $1
      `, [trackId]);

      if (track.length === 0) {
        return [];
      }

      const { bpm, musical_key, main_genre } = track[0];

      // Find similar tracks based on BPM, key, and genre
      const similarTracks = await this.db.query(`
        SELECT DISTINCT
          t.id,
          t.title,
          t.main_genre,
          p.display_name as owner_name,
          tf.price_cents,
          tm.bpm,
          tm.musical_key,
          tm.waveform_s3
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        WHERE t.id != $1 
          AND t.is_published = true
          AND (
            (tm.bpm BETWEEN $2 - 5 AND $2 + 5) OR
            (tm.musical_key = $3) OR
            (t.main_genre = $4)
          )
        ORDER BY 
          CASE WHEN tm.bpm BETWEEN $2 - 5 AND $2 + 5 THEN 1 ELSE 0 END +
          CASE WHEN tm.musical_key = $3 THEN 1 ELSE 0 END +
          CASE WHEN t.main_genre = $4 THEN 1 ELSE 0 END DESC,
          t.created_at DESC
        LIMIT $5
      `, [trackId, bpm, musical_key, main_genre, limit]);

      return similarTracks;
    } catch (error) {
      logger.error('Get similar tracks error:', error);
      throw error;
    }
  }

  async getTrendingTracks(limit: number = 20) {
    try {
      const trendingTracks = await this.db.query(`
        SELECT 
          t.id,
          t.title,
          t.main_genre,
          p.display_name as owner_name,
          tf.price_cents,
          tm.bpm,
          tm.musical_key,
          tm.waveform_s3,
          COUNT(p.id) as purchase_count
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        LEFT JOIN purchases p ON tf.id = p.track_file_id
        WHERE t.is_published = true
          AND t.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY t.id, t.title, t.main_genre, p.display_name, tf.price_cents, tm.bpm, tm.musical_key, tm.waveform_s3
        ORDER BY purchase_count DESC, t.created_at DESC
        LIMIT $1
      `, [limit]);

      return trendingTracks;
    } catch (error) {
      logger.error('Get trending tracks error:', error);
      throw error;
    }
  }

  async getFeaturedTracks(limit: number = 20) {
    try {
      const featuredTracks = await this.db.query(`
        SELECT 
          t.id,
          t.title,
          t.main_genre,
          p.display_name as owner_name,
          p.reputation,
          tf.price_cents,
          tm.bpm,
          tm.musical_key,
          tm.waveform_s3
        FROM tracks t
        LEFT JOIN profiles p ON t.owner_id = p.user_id
        LEFT JOIN track_files tf ON t.id = tf.track_id AND tf.is_preview = false
        LEFT JOIN track_metadata tm ON tf.id = tm.track_file_id
        WHERE t.is_published = true
          AND t.visibility = 'public'
          AND p.reputation >= 50
        ORDER BY p.reputation DESC, t.created_at DESC
        LIMIT $1
      `, [limit]);

      return featuredTracks;
    } catch (error) {
      logger.error('Get featured tracks error:', error);
      throw error;
    }
  }

  async getGenres() {
    try {
      const genres = await this.db.query(`
        SELECT 
          main_genre,
          COUNT(*) as track_count
        FROM tracks
        WHERE is_published = true
          AND main_genre IS NOT NULL
        GROUP BY main_genre
        ORDER BY track_count DESC
      `);

      return genres;
    } catch (error) {
      logger.error('Get genres error:', error);
      throw error;
    }
  }

  async getKeys() {
    try {
      const keys = await this.db.query(`
        SELECT 
          musical_key,
          COUNT(*) as track_count
        FROM track_metadata tm
        JOIN track_files tf ON tm.track_file_id = tf.id
        JOIN tracks t ON tf.track_id = t.id
        WHERE t.is_published = true
          AND musical_key IS NOT NULL
        GROUP BY musical_key
        ORDER BY track_count DESC
      `);

      return keys;
    } catch (error) {
      logger.error('Get keys error:', error);
      throw error;
    }
  }
}
