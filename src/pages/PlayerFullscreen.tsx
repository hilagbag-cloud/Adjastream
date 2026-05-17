import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Heart, MoreVertical, Share2, Menu, Download, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAudioPlayer } from '../lib/AudioPlayerContext';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';

export default function PlayerFullscreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentTrack, 
    isPlaying, 
    pause, 
    resume, 
    nextTrack, 
    prevTrack, 
    progress, 
    duration, 
    seek, 
    isShuffle, 
    toggleShuffle, 
    isRepeat, 
    toggleRepeat,
    downloadTrack,
    isDownloaded,
    removeDownload
  } = useAudioPlayer();

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (currentTrack && user) {
      supabase.from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', currentTrack.id)
        .single()
        .then(({ data }) => setIsFavorite(!!data));
    }
  }, [currentTrack, user]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col h-screen bg-adja-green px-6 pt-10 pb-8 text-adja-cream items-center justify-center">
        <p>Aucune lecture en cours.</p>
        <button onClick={() => navigate(-1)} className="mt-4 p-2 bg-adja-yellow text-adja-dark rounded font-bold px-6">Retour</button>
      </div>
    );
  }

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('track_id', currentTrack.id);
        setIsFavorite(false);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, track_id: currentTrack.id });
        setIsFavorite(true);
      }
    } catch (e: any) {
      toast.error("Erreur avec les favoris");
    }
  };

  const handleAction = (action: string) => {
    toast.success(`${action} sera bientôt disponible.`);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    seek(pct * duration);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  
  const downloaded = isDownloaded(currentTrack.audio_url);

  return (
    <div className="flex flex-col h-screen bg-adja-green px-6 pt-10 pb-8 text-adja-cream">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="text-adja-cream/70 hover:text-adja-cream transition-colors p-2 -ml-2">
          <ArrowLeft size={28} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-adja-cream/50 mb-1">En lecture</span>
          <span className="text-sm font-semibold truncate max-w-[200px]">{currentTrack.artist}</span>
        </div>
        <button onClick={() => handleAction('Menu des options')} className="text-adja-cream/70 hover:text-adja-cream transition-colors p-2 -mr-2">
          <MoreVertical size={28} />
        </button>
      </div>

      {/* Album Art */}
      <div className={`w-full aspect-square rounded-3xl overflow-hidden shadow-2xl mb-10 mt-4 relative transition-transform duration-700 ${isPlaying ? 'scale-100 hover:scale-[1.02]' : 'scale-95 opacity-80'}`}>
        <img 
          src={currentTrack.image_url || "https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&q=80"} 
          alt={currentTrack.title} 
          className="w-full h-full object-cover"
        />
        {isPlaying && (
          <div className="absolute inset-0 border-4 border-adja-yellow/20 rounded-3xl pointer-events-none animate-pulse"></div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col truncate pr-4">
          <h1 className="text-2xl font-bold text-white mb-1 truncate">{currentTrack.title}</h1>
          <h2 className="text-lg text-adja-cream/70 truncate">{currentTrack.artist}</h2>
        </div>
        <button onClick={toggleFavorite} className="text-adja-yellow hover:scale-110 transition-transform p-2 shrink-0">
          <Heart size={28} fill={isFavorite ? "currentColor" : "transparent"} stroke="currentColor" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div onClick={handleSeek} className="w-full h-1.5 bg-adja-light-green/30 rounded-full mb-2 cursor-pointer relative">
          <div className="absolute top-0 left-0 h-1.5 bg-adja-yellow rounded-full transition-all" style={{ width: `${pct}%` }}></div>
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-adja-yellow transition-all" style={{ left: `calc(${pct}% - 8px)` }}></div>
        </div>
        <div className="flex items-center justify-between text-xs text-adja-cream/50 font-medium">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-auto px-2">
        <button onClick={toggleShuffle} className={`transition-colors ${isShuffle ? 'text-adja-yellow' : 'text-adja-cream/50 hover:text-white'}`}>
          <Shuffle size={24} />
        </button>
        <button onClick={prevTrack} className="text-white hover:text-adja-yellow transition-colors">
          <SkipBack size={40} fill="currentColor" />
        </button>
        <button onClick={() => isPlaying ? pause() : resume()} className="w-20 h-20 rounded-full bg-adja-yellow text-adja-dark flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
          {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
        </button>
        <button onClick={nextTrack} className="text-white hover:text-adja-yellow transition-colors">
          <SkipForward size={40} fill="currentColor" />
        </button>
        <button onClick={toggleRepeat} className={`transition-colors ${isRepeat ? 'text-adja-yellow' : 'text-adja-cream/50 hover:text-white'}`}>
          <Repeat size={24} />
        </button>
      </div>
      
      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-8 text-adja-cream/50">
        <button onClick={() => handleAction('Afficher la file d\'attente')} className="hover:text-white transition-colors p-2">
          <Menu size={24} />
        </button>
        {downloaded ? (
          <button onClick={() => removeDownload(currentTrack)} className="text-adja-yellow transition-colors p-2 flex items-center gap-1">
            <CheckCircle2 size={24} />
          </button>
        ) : (
          <button onClick={() => downloadTrack(currentTrack)} className="hover:text-white transition-colors p-2">
            <Download size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
