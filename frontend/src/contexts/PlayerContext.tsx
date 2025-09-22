import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface Track {
  id: string;
  title: string;
  owner_name: string;
  bpm?: number;
  musical_key?: string;
  duration_ms?: number;
  waveform_s3?: string;
  preview_url?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  stopTrack: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  playlist: Track[];
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (trackId: string) => void;
  clearPlaylist: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };
      
      const handleEnded = () => {
        nextTrack();
      };
      
      const handleError = () => {
        console.error('Audio playback error');
        setIsPlaying(false);
      };
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
      };
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playTrack = (track: Track) => {
    if (audioRef.current) {
      // Stop current track
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Set new track
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);
      
      // Load and play
      if (track.preview_url) {
        audioRef.current.src = track.preview_url;
        audioRef.current.load();
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Playback failed:', error);
          setIsPlaying(false);
        });
      } else {
        // If no preview URL, just set the track info
        setCurrentTrack(track);
        setIsPlaying(false);
      }
    }
  };

  const pauseTrack = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Resume failed:', error);
      });
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const setVolumeHandler = (newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const nextTrack = () => {
    if (playlist.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % playlist.length;
      setCurrentTrackIndex(nextIndex);
      playTrack(playlist[nextIndex]);
    }
  };

  const previousTrack = () => {
    if (playlist.length > 0) {
      const prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      playTrack(playlist[prevIndex]);
    }
  };

  const addToPlaylist = (track: Track) => {
    setPlaylist(prev => {
      if (!prev.find(t => t.id === track.id)) {
        return [...prev, track];
      }
      return prev;
    });
  };

  const removeFromPlaylist = (trackId: string) => {
    setPlaylist(prev => {
      const newPlaylist = prev.filter(t => t.id !== trackId);
      const newIndex = Math.min(currentTrackIndex, newPlaylist.length - 1);
      setCurrentTrackIndex(newIndex);
      return newPlaylist;
    });
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentTrackIndex(0);
    stopTrack();
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      playTrack,
      pauseTrack,
      resumeTrack,
      stopTrack,
      setVolume: setVolumeHandler,
      seekTo,
      nextTrack,
      previousTrack,
      playlist,
      addToPlaylist,
      removeFromPlaylist,
      clearPlaylist
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
