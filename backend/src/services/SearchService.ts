import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export class SearchService {
  private db: any;

  constructor(dbService: DatabaseService) {
    this.db = dbService.getKnex();
  }

  async searchTracks(query: string, filters: any = {}) {
    try {
      let searchQuery = this.db('tracks')
        .select('tracks.*', 'profiles.display_name as artist_name')
        .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
        .where('tracks.is_public', true);

      if (query) {
        searchQuery = searchQuery.where(function() {
          this.where('tracks.title', 'ilike', `%${query}%`)
            .orWhere('tracks.artist', 'ilike', `%${query}%`)
            .orWhere('tracks.genre', 'ilike', `%${query}%`)
            .orWhere('profiles.display_name', 'ilike', `%${query}%`);
        });
      }

      if (filters.genre) {
        searchQuery = searchQuery.where('tracks.genre', filters.genre);
      }

      if (filters.bpm_min) {
        searchQuery = searchQuery.where('tracks.bpm', '>=', filters.bpm_min);
      }

      if (filters.bpm_max) {
        searchQuery = searchQuery.where('tracks.bpm', '<=', filters.bpm_max);
      }

      if (filters.key) {
        searchQuery = searchQuery.where('tracks.key', filters.key);
      }

      const tracks = await searchQuery
        .orderBy('tracks.created_at', 'desc')
        .limit(filters.limit || 20)
        .offset(filters.offset || 0);

      return tracks;
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  async getPopularTracks(limit = 20) {
    try {
      const tracks = await this.db('tracks')
        .select('tracks.*', 'profiles.display_name as artist_name')
        .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
        .where('tracks.is_public', true)
        .orderBy('tracks.download_count', 'desc')
        .limit(limit);

      return tracks;
    } catch (error) {
      logger.error('Get popular tracks error:', error);
      throw error;
    }
  }

  async getRecentTracks(limit = 20) {
    try {
      const tracks = await this.db('tracks')
        .select('tracks.*', 'profiles.display_name as artist_name')
        .leftJoin('profiles', 'tracks.user_id', 'profiles.user_id')
        .where('tracks.is_public', true)
        .orderBy('tracks.created_at', 'desc')
        .limit(limit);

      return tracks;
    } catch (error) {
      logger.error('Get recent tracks error:', error);
      throw error;
    }
  }
}