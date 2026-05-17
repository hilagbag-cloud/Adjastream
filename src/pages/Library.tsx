import { Download, Plus, Music, Play, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { useAudioPlayer, Track } from '../lib/AudioPlayerContext';
import { supabase } from '../lib/supabase';

export default function Library() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { downloadedUrls, playTrack } = useAudioPlayer();
  const [activeTab, setActiveTab] = useState<'favoris' | 'telechargements'>('favoris');
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab === 'telechargements' && downloadedUrls.size > 0) {
      setLoading(true);
      supabase.from('tracks').select('*').in('audio_url', Array.from(downloadedUrls))
        .then(({ data, error }) => {
          if (!error && data) {
            setDownloadedTracks(data);
          }
          setLoading(false);
        });
    } else if (activeTab === 'favoris' && user) {
      setLoading(true);
      supabase.from('favorites').select('tracks(*)').eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            const trs = data.map((row: any) => row.tracks).filter(Boolean);
            setFavoriteTracks(trs);
          }
          setLoading(false);
        });
    } else {
      setDownloadedTracks([]);
    }
  }, [activeTab, downloadedUrls, user]);

  const handleCreatePlaylist = () => {
    toast.success('Création de playlist bientôt disponible');
  };

  const isArtistOrAdmin = profile?.role === 'artist' || profile?.role === 'admin';

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Ma Bibliothèque</h1>
        {isArtistOrAdmin && (
          <button 
            onClick={() => navigate('/upload')}
            className="bg-adja-light-green hover:bg-adja-light-green/80 text-adja-yellow p-2 rounded-xl transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <button 
        onClick={handleCreatePlaylist}
        className="w-full bg-adja-yellow text-adja-dark font-semibold py-3.5 rounded-xl mb-8 hover:bg-yellow-400 transition-colors"
      >
        Créer Playlist
      </button>

      <div className="flex mb-6 text-sm font-medium border-b border-adja-light-green/20">
        <button 
          onClick={() => setActiveTab('favoris')}
          className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'favoris' ? 'text-adja-yellow border-b-2 border-adja-yellow' : 'text-adja-cream/50'}`}
        >
          Favoris
        </button>
        <button 
          onClick={() => setActiveTab('telechargements')}
          className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'telechargements' ? 'text-adja-yellow border-b-2 border-adja-yellow' : 'text-adja-cream/50'}`}
        >
          Téléchargements
        </button>
      </div>

      {activeTab === 'favoris' ? (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center text-adja-cream/50 py-12">Chargement...</div>
          ) : favoriteTracks.length > 0 ? (
            favoriteTracks.map(track => (
              <div 
                key={track.id} 
                onClick={() => playTrack(track, favoriteTracks)}
                className="flex items-center gap-4 bg-adja-light-green/20 p-3 rounded-xl border border-adja-light-green/30 cursor-pointer hover:bg-adja-light-green/40 transition-colors group"
              >
                <div className="w-14 h-14 bg-adja-dark rounded-lg overflow-hidden shrink-0 relative">
                  <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play fill="currentColor" className="text-adja-yellow" size={20} />
                  </div>
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="font-bold text-white truncate">{track.title}</span>
                  <span className="text-sm text-adja-cream/70 flex items-center gap-1 truncate">
                    {track.artist}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-adja-cream/50">
              <Music size={48} className="mb-4 text-adja-cream/20" />
              <p>La liste de favoris est vide.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center text-adja-cream/50 py-12">Chargement...</div>
          ) : downloadedTracks.length > 0 ? (
            downloadedTracks.map(track => (
              <div 
                key={track.id} 
                onClick={() => playTrack(track, downloadedTracks)}
                className="flex items-center gap-4 bg-adja-light-green/20 p-3 rounded-xl border border-adja-light-green/30 cursor-pointer hover:bg-adja-light-green/40 transition-colors group"
              >
                <div className="w-14 h-14 bg-adja-dark rounded-lg overflow-hidden shrink-0 relative">
                  <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play fill="currentColor" className="text-adja-yellow" size={20} />
                  </div>
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="font-bold text-white truncate">{track.title}</span>
                  <span className="text-sm text-adja-cream/70 flex items-center gap-1 truncate">
                    {track.artist}
                  </span>
                </div>
                <Download size={20} className="text-adja-yellow/50" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-adja-cream/50">
              <Download size={48} className="mb-4 text-adja-cream/20" />
              <p>Aucun téléchargement en cours.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
