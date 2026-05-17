import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import toast from 'react-hot-toast';

import { supabase } from './supabase';

export interface Track {
  id: string | number;
  title: string;
  artist: string;
  audio_url: string;
  image_url: string;
}

interface AudioPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  downloadTrack: (track: Track) => Promise<void>;
  isDownloaded: (audioUrl: string) => boolean;
  removeDownload: (track: Track) => Promise<void>;
  downloadedUrls: Set<string>;
}

export const AudioPlayerContext = createContext<AudioPlayerContextType>({} as any);

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  
  const [downloadedUrls, setDownloadedUrls] = useState<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Initialize audio element
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime);
      if ('mediaSession' in navigator && audio.duration > 0 && !isNaN(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime
          });
        } catch (e) {}
      }
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    
    // Check downloaded tracks from cache on mount
    checkDownloaded();

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);
  
  const checkDownloaded = async () => {
    try {
      const cache = await caches.open('adja-audio');
      const keys = await cache.keys();
      const urls = new Set(keys.map(req => req.url));
      setDownloadedUrls(urls);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextTrack();
    }
  };

  useEffect(() => {
    audioRef.current?.addEventListener('ended', handleEnded);
    return () => audioRef.current?.removeEventListener('ended', handleEnded);
  }, [queue, currentTrack, isRepeat, isShuffle]);

  useEffect(() => {
    if (currentTrack && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'AdjaStream',
        artwork: [
          { src: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=96&q=80', sizes: '96x96', type: 'image/jpeg' }, // app logo simulated
          { src: currentTrack.image_url || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&q=80', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', resume);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
  }, [currentTrack]);

  const loadAudioSrc = async (url: string) => {
    // Try to load from cache first
    try {
      const cache = await caches.open('adja-audio');
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error(e);
    }
    return url;
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    if (newQueue) setQueue(newQueue);
    
    // Log stream
    logStream(track);

    if (audioRef.current) {
      const srcToPlay = await loadAudioSrc(track.audio_url);
      audioRef.current.src = srcToPlay;
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
      setIsPlaying(true);
    }
  };

  const logStream = async (track: Track) => {
    try {
      if (navigator.onLine && track.id) {
        // Increment remotely
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
          // Record stream and monetize
          await supabase.rpc('record_stream', { p_track_id: track.id });
          
          await supabase.from('offline_streams').insert({
            user_id: currentUser.user.id,
            track_id: track.id,
            synced: true
          });
        }
      } else {
        // Store locally if no connection or no user
        const cache = await caches.open('adja-offline-streams');
        await cache.put(`/stream/${track.id}/${Date.now()}`, new Response('stream'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync offline streams when back online
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const cache = await caches.open('adja-offline-streams');
        const keys = await cache.keys();
        const { data: currentUser } = await supabase.auth.getUser();
        
        if (currentUser.user && keys.length > 0) {
          for (const req of keys) {
            const urlParts = req.url.split('/');
            const trackId = urlParts[urlParts.length - 2]; // assuming /stream/{track_id}/{timestamp}
            
            await supabase.rpc('record_stream', { p_track_id: trackId });
            await supabase.from('offline_streams').insert({
              user_id: currentUser.user.id,
              track_id: trackId,
              synced: true
            });
            await cache.delete(req);
          }
        }
      } catch (e) {
        console.error('Failed to sync offline streams', e);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const resume = () => {
    audioRef.current?.play().catch(e => console.error("Resume failed:", e));
    setIsPlaying(true);
  };

  const nextTrack = () => {
    if (queue.length === 0 || !currentTrack) return;
    
    let nextIndex = queue.findIndex(t => t.id === currentTrack.id) + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    
    if (nextIndex >= queue.length) {
      // end of queue
      nextIndex = 0; // wrap around or stop?
      pause();
      return;
    }
    playTrack(queue[nextIndex]);
  };

  const prevTrack = () => {
    if (queue.length === 0 || !currentTrack) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // Re-start current track if playing for >3 seconds
      seek(0);
      return;
    }
    
    let prevIndex = queue.findIndex(t => t.id === currentTrack.id) - 1;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    }
    if (prevIndex < 0) prevIndex = queue.length - 1;
    playTrack(queue[prevIndex]);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

  const downloadTrack = async (track: Track) => {
    toast.loading(`Téléchargement de ${track.title}...`, { id: 'download' });
    try {
      const cache = await caches.open('adja-audio');
      await cache.add(track.audio_url);
      
      setDownloadedUrls(prev => {
        const next = new Set(prev);
        next.add(track.audio_url);
        return next;
      });
      
      toast.success(`${track.title} téléchargé pour écoute hors ligne.`, { id: 'download' });
    } catch (e: any) {
      toast.error(`Échec du téléchargement: ${e.message}`, { id: 'download' });
    }
  };

  const removeDownload = async (track: Track) => {
    try {
      const cache = await caches.open('adja-audio');
      await cache.delete(track.audio_url);
      
      setDownloadedUrls(prev => {
        const next = new Set(prev);
        next.delete(track.audio_url);
        return next;
      });
      toast.success(`${track.title} supprimé des téléchargements.`);
    } catch (e) {
      console.error(e);
    }
  };

  const isDownloaded = (url: string) => {
    return downloadedUrls.has(url);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        progress,
        duration,
        isShuffle,
        isRepeat,
        playTrack,
        pause,
        resume,
        nextTrack,
        prevTrack,
        seek,
        toggleShuffle,
        toggleRepeat,
        downloadTrack,
        isDownloaded,
        removeDownload,
        downloadedUrls
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
