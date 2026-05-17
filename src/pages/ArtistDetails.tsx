import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, MoreVertical, Heart, Plus, User, Music } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../lib/AudioPlayerContext';

export default function ArtistDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [artist, setArtist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, toggleShuffle } = useAudioPlayer();

  const getPublicUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const { data: artistData, error: artistError } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (artistError) throw artistError;
        setArtist(artistData);

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .eq('uploaded_by', id)
          .order('plays', { ascending: false });

        if (!tracksError && tracksData) {
          setTracks(tracksData);
        }
      } catch (err) {
        console.error('Error fetching artist details:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
       if (id.length < 10) {
         setLoading(false);
       } else {
         fetchArtistData();
       }
    }
  }, [id]);

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    toast.success(`${action} sera bientôt disponible.`);
  };

  const handlePlayArtist = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffleArtist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tracks.length > 0) {
      toggleShuffle();
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randomIdx], tracks);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;

  if (!artist) {
    return (
      <div className="flex flex-col min-h-screen pb-10">
        <button 
            onClick={() => navigate(-1)} 
            className="absolute top-8 left-6 z-10 bg-black/40 p-2 rounded-full backdrop-blur-md text-white"
          >
            <ArrowLeft size={24} />
         </button>
         <div className="flex-1 flex flex-col items-center justify-center text-adja-cream/50">
            <User size={48} className="mb-4 text-adja-cream/30" />
            <p>Artiste introuvable</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="relative h-80 w-full flex items-center justify-center bg-adja-dark">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-8 left-6 z-10 bg-black/40 p-2 rounded-full backdrop-blur-md text-white"
        >
          <ArrowLeft size={24} />
        </button>
        {artist.avatar_url || artist.kyc_selfie ? (
          <img 
            src={artist.avatar_url ? artist.avatar_url : getPublicUrl(artist.kyc_selfie)} 
            alt="Artist Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={64} className="text-adja-cream/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-adja-green via-adja-dark/50 to-transparent"></div>
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div>
            <span className="text-adja-yellow text-xs font-bold uppercase tracking-widest mb-1 block">Artiste Vérifié</span>
            <h1 className="text-3xl font-bold text-white mb-2">{artist.stage_name || artist.name}</h1>
          </div>
          <button onClick={handleShuffleArtist} className="bg-adja-yellow text-adja-dark p-4 rounded-full shadow-lg flex-shrink-0">
            <Play fill="currentColor" size={24} />
          </button>
        </div>
      </div>

      <div className="px-6 flex items-center gap-4 mb-8 mt-2">
        <button onClick={(e) => handleAction(e, `Abonnement à ${artist.stage_name}`)} className="border border-adja-cream/30 rounded-full px-4 py-1.5 text-sm font-semibold flex items-center gap-2 hover:bg-white/10 transition-colors">
          S'abonner
        </button>
        <MoreVertical onClick={(e) => handleAction(e, 'Menu de l\'artiste')} size={24} className="text-adja-cream/70 ml-auto cursor-pointer" />
      </div>

      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Titres</h2>
        {tracks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {tracks.map((track, i) => (
              <div key={track.id} onClick={() => playTrack(track, tracks)} className="flex items-center gap-4 hover:bg-adja-light-green/30 p-2 -mx-2 rounded-xl cursor-pointer transition-colors">
                <span className="text-adja-cream/50 font-medium w-4 text-center">{i + 1}</span>
                {track.image_url ? (
                  <img src={track.image_url} className="w-10 h-10 rounded shadow object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded bg-adja-light-green flex items-center justify-center shadow"><Music size={16} className="text-adja-cream/30" /></div>
                )}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="font-bold text-white truncate">{track.title}</span>
                  <span className="text-xs text-adja-cream/50">{track.plays} écoutes</span>
                </div>
                <MoreVertical onClick={(e) => handleAction(e, 'Options du titre')} size={16} className="text-adja-cream/50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-adja-light-green/30 rounded-xl bg-adja-light-green/10">
            <Music className="mb-2 text-adja-cream/20" size={32} />
            <p className="text-sm text-adja-cream/50">Aucun titre disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
}
