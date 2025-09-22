import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, MoreVertical, Clock, Music } from 'lucide-react';
import { usePlayer } from '../../contexts/PlayerContext';

interface Track {
  id: string;
  title: string;
  owner_name: string;
  bpm?: number;
  musical_key?: string;
  duration_ms?: number;
  price_cents?: number;
  waveform_s3?: string;
  preview_url?: string;
  created_at: string;
}

interface TrackCardProps {
  track: Track;
  showActions?: boolean;
}

export function TrackCard({ track, showActions = true }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrentTrack && isPlaying) {
      pauseTrack();
    } else {
      playTrack(track);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="track-card group"
    >
      <div className="relative">
        {/* Waveform/Artwork */}
        <div className="w-full h-32 bg-gray-700 rounded-lg mb-4 relative overflow-hidden">
          {track.waveform_s3 ? (
            <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20"></div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-500" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePlay}
              className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Price Badge */}
          {track.price_cents && track.price_cents > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatPrice(track.price_cents)}
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
            {track.title}
          </h3>
          
          <p className="text-sm text-gray-400 truncate">
            by {track.owner_name}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              {track.bpm && (
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {track.bpm} BPM
                </span>
              )}
              {track.musical_key && (
                <span>{track.musical_key}</span>
              )}
            </div>
            <span>{formatDuration(track.duration_ms)}</span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <Link
              href={`/track/${track.id}`}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              View Details
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
