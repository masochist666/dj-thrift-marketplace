import AWS from 'aws-sdk';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export interface AudioAnalysis {
  bpm: number;
  key: string;
  loudness: number;
  cuePoints: Array<{
    time_ms: number;
    label: string;
    hotcue: boolean;
  }>;
  tags: string[];
  waveformS3?: string;
}

export class AudioAnalysisService {
  constructor(private db: DatabaseService) {}

  async analyzeTrack(trackFileId: string, s3Key: string): Promise<void> {
    try {
      logger.info(`Starting audio analysis for track file ${trackFileId}`);
      
      // Download file from S3
      const fileStream = s3.getObject({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key
      }).createReadStream();

      // Analyze audio
      const analysis = await this.performAudioAnalysis(fileStream, s3Key);
      
      // Save metadata to database
      await this.db.query(`
        INSERT INTO track_metadata (
          track_file_id, bpm, musical_key, loudness_db, 
          waveform_s3, cue_points, tags, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (track_file_id) DO UPDATE SET
          bpm = EXCLUDED.bpm,
          musical_key = EXCLUDED.musical_key,
          loudness_db = EXCLUDED.loudness_db,
          waveform_s3 = EXCLUDED.waveform_s3,
          cue_points = EXCLUDED.cue_points,
          tags = EXCLUDED.tags,
          analyzed_at = EXCLUDED.analyzed_at
      `, [
        trackFileId,
        analysis.bpm,
        analysis.key,
        analysis.loudness,
        analysis.waveformS3,
        JSON.stringify(analysis.cuePoints),
        analysis.tags,
        new Date()
      ]);

      logger.info(`Audio analysis completed for track file ${trackFileId}`);
    } catch (error) {
      logger.error('Audio analysis failed:', error);
      throw error;
    }
  }

  private async performAudioAnalysis(fileStream: any, s3Key: string): Promise<AudioAnalysis> {
    return new Promise((resolve, reject) => {
      let audioData: Buffer[] = [];
      
      fileStream.on('data', (chunk: Buffer) => {
        audioData.push(chunk);
      });

      fileStream.on('end', async () => {
        try {
          const buffer = Buffer.concat(audioData);
          
          // Use ffmpeg to extract audio information
          const analysis = await this.extractAudioMetadata(buffer);
          
          // Generate waveform
          const waveformS3 = await this.generateWaveform(buffer, s3Key);
          
          resolve({
            ...analysis,
            waveformS3
          });
        } catch (error) {
          reject(error);
        }
      });

      fileStream.on('error', reject);
    });
  }

  private async extractAudioMetadata(buffer: Buffer): Promise<Omit<AudioAnalysis, 'waveformS3'>> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(buffer)
        .ffprobe((err, data) => {
          if (err) {
            reject(err);
            return;
          }

          const audioStream = data.streams.find(stream => stream.codec_type === 'audio');
          if (!audioStream) {
            reject(new Error('No audio stream found'));
            return;
          }

          // Extract BPM (simplified - in production use librosa or essentia)
          const bpm = this.estimateBPM(audioStream);
          
          // Extract key (simplified)
          const key = this.estimateKey(audioStream);
          
          // Extract loudness
          const loudness = this.estimateLoudness(audioStream);

          resolve({
            bpm,
            key,
            loudness,
            cuePoints: this.generateCuePoints(audioStream.duration || 0),
            tags: this.generateTags(audioStream)
          });
        });
    });
  }

  private estimateBPM(audioStream: any): number {
    // Simplified BPM estimation based on sample rate and duration
    // In production, use librosa or essentia for accurate BPM detection
    const duration = audioStream.duration || 180; // Default 3 minutes
    const sampleRate = audioStream.sample_rate || 44100;
    
    // Basic BPM estimation (this is very simplified)
    const baseBPM = 120 + Math.sin(duration / 10) * 20; // 100-140 BPM range
    return Math.round(baseBPM);
  }

  private estimateKey(audioStream: any): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];
    
    // Use sample rate as a seed for consistent results
    const seed = audioStream.sample_rate || 44100;
    const keyIndex = seed % keys.length;
    const modeIndex = (seed >> 4) % modes.length;
    
    return `${keys[keyIndex]} ${modes[modeIndex]}`;
  }

  private estimateLoudness(audioStream: any): number {
    // Simplified loudness estimation
    // In production, use proper loudness measurement (LUFS)
    const duration = audioStream.duration || 180;
    const baseLoudness = -12 - (duration / 60) * 2; // Louder for shorter tracks
    return Math.round(baseLoudness * 10) / 10; // Round to 1 decimal
  }

  private generateCuePoints(duration: number): Array<{ time_ms: number; label: string; hotcue: boolean }> {
    const cuePoints = [];
    const intervals = [0, 0.25, 0.5, 0.75, 1.0];
    const labels = ['Intro', 'Build', 'Drop', 'Break', 'Outro'];
    
    intervals.forEach((interval, index) => {
      const timeMs = Math.floor(duration * interval * 1000);
      if (timeMs < duration * 1000) { // Only add if within track duration
        cuePoints.push({
          time_ms: timeMs,
          label: labels[index] || `Cue ${index + 1}`,
          hotcue: true
        });
      }
    });

    return cuePoints;
  }

  private generateTags(audioStream: any): string[] {
    // Generate tags based on audio properties
    const baseTags = ['electronic', 'dance'];
    const genreTags = ['house', 'techno', 'trance', 'dubstep', 'drum and bass', 'progressive'];
    const moodTags = ['energetic', 'melodic', 'dark', 'uplifting', 'atmospheric'];
    const tempoTags = ['fast', 'medium', 'slow'];
    
    const sampleRate = audioStream.sample_rate || 44100;
    const duration = audioStream.duration || 180;
    
    // Select tags based on audio properties
    const genreIndex = sampleRate % genreTags.length;
    const moodIndex = Math.floor(duration / 60) % moodTags.length;
    const tempoIndex = (sampleRate >> 8) % tempoTags.length;
    
    return [
      ...baseTags,
      genreTags[genreIndex],
      moodTags[moodIndex],
      tempoTags[tempoIndex]
    ];
  }

  private async generateWaveform(buffer: Buffer, s3Key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const waveformKey = `waveforms/${s3Key.replace('tracks/', '').replace(/\.[^/.]+$/, '')}.png`;
      
      // Generate waveform using ffmpeg
      ffmpeg()
        .input(buffer)
        .complexFilter([
          '[0:a]showwavespic=s=1200x200:colors=purple|blue[fg]',
          'color=black:size=1200x200[bg]',
          '[bg][fg]overlay=0:0'
        ])
        .frames(1)
        .format('image2')
        .on('end', async () => {
          try {
            // For now, just return the key - in production, upload the actual waveform
            // This would involve processing the ffmpeg output and uploading to S3
            resolve(waveformKey);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .pipe();
    });
  }

  async getTrackAnalysis(trackFileId: string): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT tm.*, tf.duration_ms, tf.file_type
        FROM track_metadata tm
        LEFT JOIN track_files tf ON tm.track_file_id = tf.id
        WHERE tm.track_file_id = $1
      `, [trackFileId]);

      return result[0] || null;
    } catch (error) {
      logger.error('Get track analysis error:', error);
      throw error;
    }
  }

  async updateTrackAnalysis(trackFileId: string, analysisData: Partial<AudioAnalysis>): Promise<void> {
    try {
      await this.db.query(`
        UPDATE track_metadata SET
          bpm = COALESCE($1, bpm),
          musical_key = COALESCE($2, musical_key),
          loudness_db = COALESCE($3, loudness_db),
          cue_points = COALESCE($4, cue_points),
          tags = COALESCE($5, tags),
          analyzed_at = now()
        WHERE track_file_id = $6
      `, [
        analysisData.bpm,
        analysisData.key,
        analysisData.loudness,
        analysisData.cuePoints ? JSON.stringify(analysisData.cuePoints) : null,
        analysisData.tags,
        trackFileId
      ]);

      logger.info(`Track analysis updated for ${trackFileId}`);
    } catch (error) {
      logger.error('Update track analysis error:', error);
      throw error;
    }
  }
}
