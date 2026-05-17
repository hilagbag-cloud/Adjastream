import { useAuth } from '../lib/AuthContext';
import { LogOut, Music, DollarSign, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ArtistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  const [stats, setStats] = useState({ plays: 0, revenue: 0 });
  const [tracks, setTracks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      setProfile(data);

      if (data) {
        setStats(prev => ({ ...prev, revenue: data.wallet_fcfa || 0 }));
      }
    };
    
    const fetchTracksPlays = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('plays', { ascending: false });
        
      if (!error && data) {
        setTracks(data);
        const totalPlays = data.reduce((acc, curr) => acc + (curr.plays || 0), 0);
        setStats(prev => ({ ...prev, plays: totalPlays }));
      }
    };

    fetchProfile();
    fetchTracksPlays();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Espace Artiste</h1>
        <button onClick={handleLogout} className="text-adja-cream/70 hover:text-adja-cream">
          <LogOut size={24} />
        </button>
      </div>

      {profile.role === 'artist_pending' && (
        <div className="bg-adja-yellow/10 border border-adja-yellow/50 rounded-xl p-4 mb-8">
          <h2 className="text-adja-yellow font-bold mb-1">Vérification en cours</h2>
          <p className="text-sm text-adja-cream/80">Votre profil est en cours de validation par notre équipe. Vous pourrez bientôt uploader vos morceaux et monétiser votre art.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="bg-adja-light-green p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-adja-dark flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-adja-yellow">{profile.stage_name?.charAt(0) || user?.email?.charAt(0)}</span>
          </div>
          <h2 className="text-xl font-bold text-center mb-1">{profile.stage_name || user?.email}</h2>
          <span className="text-sm text-adja-cream/70 uppercase tracking-widest">{profile.role === 'artist' ? 'Artiste Vérifié' : 'En attente'}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-adja-light-green/50 p-4 rounded-2xl flex flex-col">
            <BarChart2 className="text-adja-yellow mb-2" size={24} />
            <span className="text-2xl font-bold">{stats.plays}</span>
            <span className="text-xs text-adja-cream/70 uppercase">Écoutes totales</span>
          </div>
          <div className="bg-adja-light-green/50 p-4 rounded-2xl flex flex-col">
            <DollarSign className="text-green-400 mb-2" size={24} />
            <span className="text-2xl font-bold">{stats.revenue.toFixed(2)} XOF</span>
            <span className="text-xs text-adja-cream/70 uppercase">Revenus</span>
          </div>
          <div className="bg-adja-light-green/50 p-4 rounded-2xl flex flex-col col-span-2 items-center justify-center cursor-pointer hover:bg-adja-light-green transition-colors disabled:opacity-50"
               style={profile.role !== 'artist' ? { opacity: 0.5, pointerEvents: 'none'} : {}}
               onClick={() => navigate('/upload')}
               >
            <Music className="mb-2 text-adja-cream/70" size={24} />
            <span className="font-semibold text-sm">Ajouter un nouveau titre</span>
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Mes Morceaux</h3>
            <div className="space-y-3">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-4 bg-adja-light-green/20 p-3 rounded-xl border border-adja-light-green/30">
                  <div className="w-12 h-12 bg-adja-dark rounded-lg overflow-hidden shrink-0">
                    <img src={track.image_url || "https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=100&q=80"} alt={track.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 truncate">
                    <span className="font-bold text-white truncate text-sm">{track.title}</span>
                    <span className="text-xs text-adja-cream/70 truncate">{track.genre}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="font-bold text-adja-yellow">{track.plays || 0}</span>
                    <span className="text-[10px] text-adja-cream/50 uppercase">Écoutes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
