import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, MoreVertical, Search, Share2, Music } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../lib/AudioPlayerContext';

import PlaylistCoverImage from '../assets/images/regenerated_image_1778529435427.png';

export default function PlaylistDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, toggleShuffle } = useAudioPlayer();

  useEffect(() => {
    const fetchTopTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .order('plays', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setTracks(data || []);
      } catch (err) {
        console.error('Error fetching tracks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopTracks();
  }, [id]);

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    toast.success(`${action} sera bientôt disponible.`);
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      toggleShuffle();
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randomIdx], tracks);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="relative pt-12 pb-6 px-6 bg-gradient-to-b from-adja-light-green to-adja-green flex flex-col items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-8 left-6 z-10 text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <button onClick={(e) => handleAction(e, 'Recherche dans la playlist')} className="absolute top-8 right-6 z-10 text-white">
          <Search size={24} />
        </button>
        
        <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl mb-6 mt-4">
          <img 
            src={PlaylistCoverImage} 
            alt="Playlist Cover" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Top 50 Hadja</h1>
        <p className="text-adja-cream/70 text-sm mb-4 text-center">Les titres les plus écoutés de la semaine. Mise à jour tous les lundis.</p>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-adja-cream/50 mb-2">
          <img src="/vite.svg" alt="AdjaStream" className="w-4 h-4 rounded-full grayscale" />
          <span>AdjaStream</span>
          <span>•</span>
          <span>{tracks.length} titres</span>
        </div>
      </div>

      <div className="px-6 flex items-center justify-between mb-8 mt-2">
        <div className="flex gap-6">
          <Share2 onClick={(e) => handleAction(e, 'Partager la playlist')} size={24} className="text-adja-cream/70 cursor-pointer" />
          <MoreVertical onClick={(e) => handleAction(e, 'Options de la playlist')} size={24} className="text-adja-cream/70 cursor-pointer" />
        </div>
        <div className="flex items-center gap-4">
          <Shuffle onClick={handleShufflePlay} size={24} className="text-adja-yellow cursor-pointer" />
          <button onClick={handlePlayAll} className="bg-adja-yellow text-adja-dark p-4 rounded-full shadow-lg">
            <Play fill="currentColor" size={24} />
          </button>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {loading ? (
          <div className="text-center text-adja-cream/50 py-10">Chargement...</div>
        ) : tracks.length > 0 ? (
          tracks.map((track, i) => (
            <div key={track.id} onClick={() => playTrack(track, tracks)} className="flex items-center gap-4 p-2 hover:bg-adja-light-green/30 rounded-xl cursor-pointer transition-colors -mx-2">
              <span className="text-adja-cream/50 font-medium w-4 text-center">{i + 1}</span>
              {track.image_url ? (
                <img src={track.image_url} alt="cover" className="w-12 h-12 rounded object-cover shadow" />
              ) : (
                <div className="w-12 h-12 rounded bg-adja-light-green flex items-center justify-center shadow"><Music size={20} className="text-adja-cream/30" /></div>
              )}
              <div className="flex-1 flex flex-col overflow-hidden">
                <span className="font-bold text-white truncate">{track.title}</span>
                <span className="text-xs text-adja-cream/70 truncate">{track.artist}</span>
              </div>
              <MoreVertical onClick={(e) => handleAction(e, 'Options du titre')} size={16} className="text-adja-cream/50" />
            </div>
          ))
        ) : (
          <div className="text-center text-adja-cream/50 py-10 flex flex-col items-center justify-center">
            <Music size={48} className="mb-4 text-adja-cream/20" />
            <p>La playlist est vide.</p>
          </div>
        )}
      </div>
    </div>
  );
}
