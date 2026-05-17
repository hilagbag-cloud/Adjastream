import React from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../lib/AudioPlayerContext';

export default function PlayerBar() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, pause, resume, nextTrack, progress, duration } = useAudioPlayer();

  if (!currentTrack) return null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) pause();
    else resume();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    nextTrack();
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div 
      onClick={() => navigate('/player')}
      className="mx-4 mb-2 bg-[#1c523e] rounded-xl flex items-center p-2 shadow-xl border border-adja-light-green/30 relative overflow-hidden cursor-pointer"
    >
      <div className="absolute top-0 left-0 h-0.5 bg-adja-yellow transition-all" style={{ width: `${pct}%` }}></div>
      <div className="w-10 h-10 rounded-md overflow-hidden bg-adja-dark shrink-0">
        <img 
          src={currentTrack.image_url || "https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=100&q=80"} 
          alt={currentTrack.title} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="ml-3 flex-1 flex flex-col justify-center min-w-0 pt-1">
        <span className="font-bold text-sm truncate text-white uppercase tracking-wider">{currentTrack.title}</span>
        <span className="text-adja-cream/70 text-xs truncate">{currentTrack.artist}</span>
      </div>
      
      <div className="flex items-center gap-4 text-adja-cream pr-2 pt-1">
        <button onClick={handlePlayPause}>
          {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
        </button>
        <button onClick={handleNext}>
          <SkipForward size={24} className="fill-current" />
        </button>
      </div>
    </div>
  );
}
