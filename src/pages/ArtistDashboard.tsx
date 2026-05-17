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
        .select('plays')
        .eq('uploaded_by', user.id);
        
      if (!error && data) {
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
      </div>
    </div>
  );
}
