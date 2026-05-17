import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../lib/AudioPlayerContext';
import { Play, ArrowLeft, Music, BadgeCheck } from 'lucide-react';

export default function GenreDetails() {
  const { genreName } = useParams();
  const navigate = useNavigate();
  const { playTrack } = useAudioPlayer();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
      if (!genreName) return;
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('genre', genreName)
          .order('plays', { ascending: false });

        if (error) throw error;
        setTracks(data || []);
      } catch (err) {
        console.error("Error fetching genre tracks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [genreName]);

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="bg-adja-light-green p-2 rounded-full text-adja-cream">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold capitalize">Genre: {genreName}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-adja-cream/50">Chargement...</div>
      ) : tracks.length > 0 ? (
        <div className="space-y-3">
          {tracks.map((track, i) => (
            <div 
              key={track.id} 
              onClick={() => playTrack(track, tracks)}
              className="flex items-center gap-4 bg-adja-light-green/20 p-3 rounded-xl border border-adja-light-green/30 cursor-pointer hover:bg-adja-light-green/40 transition-colors group"
            >
              <div className="w-6 text-center text-sm font-bold text-adja-cream/50 group-hover:text-adja-yellow">{i + 1}</div>
              <div className="w-12 h-12 bg-adja-dark rounded-lg overflow-hidden shrink-0 relative">
                <img src={track.image_url || "https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=100&q=80"} alt={track.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play fill="currentColor" className="text-adja-yellow" size={16} />
                </div>
              </div>
              <div className="flex flex-col flex-1 truncate">
                <span className="font-bold text-white truncate text-sm">{track.title}</span>
                <span className="text-xs text-adja-cream/70 flex items-center gap-1 truncate w-full">
                  {track.artist}
                  <BadgeCheck size={12} className="text-adja-yellow shrink-0" />
                </span>
              </div>
              <div className="text-xs text-adja-cream/50 ml-auto flex items-center gap-1">
                <Play size={12} /> {track.plays || 0}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-adja-cream/50 bg-adja-light-green/20 rounded-2xl border border-adja-light-green/30 px-6 text-center">
          <Music size={48} className="mb-4 text-adja-cream/30" />
          <h2 className="text-xl font-bold text-white mb-2">Aucun morceau disponible</h2>
          <p className="text-sm">Il n'y a pas encore de morceaux disponibles pour le genre {genreName}. Revenez plus tard !</p>
        </div>
      )}
    </div>
  );
}
