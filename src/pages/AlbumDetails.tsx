import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, MoreVertical, Heart, Music } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../lib/AudioPlayerContext';

export default function AlbumDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [track, setTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setTrack(data);
      } catch (err) {
        console.error('Error fetching track:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      if (id.length < 10) {
        setLoading(false); // Likely a mock ID navigated from Explorer/Library initially
      } else {
        fetchTrack();
      }
    }
  }, [id]);

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    toast.success(`${action} sera bientôt disponible.`);
  };

  const handlePlay = () => {
    if (track) playTrack(track, [track]);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;

  if (!track) {
    return (
      <div className="flex flex-col min-h-screen pb-10">
        <button 
            onClick={() => navigate(-1)} 
            className="absolute top-8 left-6 z-10 bg-black/40 p-2 rounded-full backdrop-blur-md text-white"
          >
            <ArrowLeft size={24} />
         </button>
         <div className="flex-1 flex flex-col items-center justify-center text-adja-cream/50">
            <Music size={48} className="mb-4 text-adja-cream/30" />
            <p>Contenu introuvable</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-10 relative">
      <div className="relative h-72 w-full bg-adja-dark flex items-center justify-center">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-8 left-6 z-10 bg-black/40 p-2 rounded-full backdrop-blur-md text-white"
        >
          <ArrowLeft size={24} />
        </button>
        {track.image_url ? (
          <img 
            src={track.image_url} 
            alt={track.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Music size={64} className="text-adja-cream/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-adja-green via-adja-green/40 to-transparent"></div>
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-bold text-white mb-1">{track.title}</h1>
          <p className="text-adja-cream/70 text-sm">{track.artist} {track.genre ? `• ${track.genre}` : ''}</p>
        </div>
      </div>

      <div className="px-6 flex items-center justify-between mt-6 mb-8">
        <div className="flex gap-4">
          <Heart size={28} className="text-adja-cream/70 cursor-pointer" onClick={(e) => handleAction(e, 'Mise en favoris')} />
          <MoreVertical size={28} className="text-adja-cream/70 cursor-pointer" onClick={(e) => handleAction(e, 'Menu des options')} />
        </div>
        <div className="flex items-center gap-4">
          <Shuffle size={24} className="text-adja-yellow cursor-pointer" onClick={(e) => handleAction(e, 'Lecture aléatoire')} />
          <button onClick={handlePlay} className="bg-adja-yellow text-adja-dark p-4 rounded-full shadow-lg">
            <Play fill="currentColor" size={24} />
          </button>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-4">
        <div onClick={handlePlay} className="flex items-center gap-4 p-2 hover:bg-adja-light-green/30 rounded-xl cursor-pointer transition-colors">
          <span className="text-adja-cream/50 font-medium w-4">1</span>
          <div className="flex-1 flex flex-col">
            <span className="font-bold text-white">{track.title}</span>
            <span className="text-xs text-adja-cream/70">{track.artist}</span>
          </div>
          <span className="text-xs text-adja-cream/50">--:--</span>
          <MoreVertical size={16} className="text-adja-cream/50" onClick={(e) => handleAction(e, 'Options titre')} />
        </div>
      </div>
    </div>
  );
}
