import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Users, PlayCircle, Music, Clock, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'kyc' | 'annonceurs' | 'stats' | 'primes' | 'settings' | 'artistes'>('kyc');
  const [pendingArtists, setPendingArtists] = useState<any[]>([]);
  const [pendingAnnonceurs, setPendingAnnonceurs] = useState<any[]>([]);
  const [verifiedArtists, setVerifiedArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Payouts
  const [artistsPendingPayout, setArtistsPendingPayout] = useState<any[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtists: 0,
    totalTracks: 0,
    totalStreams: 0,
  });

  const getPublicUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const fetchPending = async () => {
    try {
      const { data: artistsData, error: artistsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'artist_pending');
      if (artistsError) throw artistsError;
      setPendingArtists(artistsData || []);

      const { data: annonceursData, error: annonceursError } = await supabase
        .from('users')
        .select('*')
        .eq('is_annonceur_pending', true);
      if (annonceursError) throw annonceursError;
      setPendingAnnonceurs(annonceursData || []);
    } catch (err: any) {}
  };

  const fetchVerifiedArtists = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('role', 'artist');
      if (error) throw error;
      setVerifiedArtists(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersResponse, artistsResponse, tracksResponse, payoutsResponse] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'artist'),
        supabase.from('tracks').select('plays'),
        supabase.from('users').select('*').gt('wallet_fcfa', 0).order('wallet_fcfa', { ascending: false })
      ]);

      let totalPlays = 0;
      if (tracksResponse.data) {
        totalPlays = tracksResponse.data.reduce((acc, track) => acc + (track.plays || 0), 0);
      }

      setStats({
        totalUsers: usersResponse.count || 0,
        totalArtists: artistsResponse.count || 0,
        totalTracks: tracksResponse.data?.length || 0,
        totalStreams: totalPlays
      });

      if (payoutsResponse.data) {
         setArtistsPendingPayout(payoutsResponse.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      setPlatformSettings(data || { reward_per_stream: 0.1 });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      if (platformSettings?.id) {
         await supabase.from('platform_settings').update({ reward_per_stream: platformSettings.reward_per_stream, featured_artist_id: platformSettings.featured_artist_id }).eq('id', platformSettings.id);
      } else {
         await supabase.from('platform_settings').insert([{ reward_per_stream: platformSettings.reward_per_stream, featured_artist_id: platformSettings.featured_artist_id }]);
         await fetchSettings();
      }
      toast.success('Paramètres enregistrés');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
    setSavingSettings(false);
  };

  const handleSetFeatured = async (artistId: string) => {
      setPlatformSettings({ ...platformSettings, featured_artist_id: artistId });
      toast.success("Artiste sélectionné ! N'oubliez pas d'enregistrer.");
      setActiveTab('settings');
  };

  const handlePayout = async (artistId: string) => {
    if (!window.confirm("Avez-vous réellement versé l'argent à cet artiste ? Cette action remettra son solde à 0.")) return;
    setPayingId(artistId);
    try {
      const { data, error } = await supabase.rpc('admin_payout', { p_artist_id: artistId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erreur de reversement");
      toast.success(`Reversement traité : ${data.paid_amount} FCFA versé.`);
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du versement");
    }
    setPayingId(null);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      Promise.all([fetchPending(), fetchStats(), fetchSettings(), fetchVerifiedArtists()]).finally(() => setLoading(false));
    }
  }, [profile]);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<'artist' | 'annonceur'>('artist');

  const confirmApproveArtist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'artist', kyc_reject_reason: null })
        .eq('id', id);

      if (error) throw error;
      toast.success('Artiste validé !');
      fetchPending();
      fetchVerifiedArtists();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation');
    }
  };

  const confirmRejectArtist = async () => {
    if (!rejectId) return;
    if (rejectReason.trim() === "") {
        return toast.error('Veuillez fournir un motif de rejet.');
    }
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'auditeur', kyc_reject_reason: rejectReason })
        .eq('id', rejectId);

      if (error) throw error;
      toast.success('Demande rejetée avec le motif.');
      fetchPending();
      setRejectId(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du rejet');
    }
  };

  const confirmApproveAnnonceur = async (id: string) => {
    try {
      const { error } = await supabase.from('users').update({ 
        is_annonceur: true, 
        is_annonceur_pending: false 
      }).eq('id', id);
      if (error) throw error;
      fetchPending();
      toast.success("Annonceur validé");
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const confirmRejectAnnonceur = async () => {
    if (!rejectId) return;
    try {
      const { error } = await supabase.from('users').update({ 
        is_annonceur_pending: false,
        // Could also add a kyc_reject_reason for annonceur here if schema has it, or reuse kyc_reject_reason
        kyc_reject_reason: rejectReason
      }).eq('id', rejectId);
      if (error) throw error;
      fetchPending();
      toast.success("Annonceur rejeté");
      setRejectId(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const [selectedKyc, setSelectedKyc] = useState<any | null>(null);

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>
      
      <div className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar pb-2">
        <button 
          onClick={() => setActiveTab('kyc')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'kyc' ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Artistes ({pendingArtists.length})
        </button>
        <button 
          onClick={() => setActiveTab('annonceurs')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'annonceurs' ? 'bg-purple-500 text-white' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Annonceurs ({pendingAnnonceurs.length})
        </button>
        <button 
          onClick={() => setActiveTab('artistes')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'artistes' ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Artistes Vérifiés
        </button>
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'stats' ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Statistiques
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Paramètres
        </button>
        <button 
          onClick={() => setActiveTab('primes')} 
          className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeTab === 'primes' ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green/30 text-adja-cream/70'}`}
        >
          Primes & Paiements
        </button>
      </div>
      
      {activeTab === 'kyc' && (
        <div className="mb-8">
          {pendingArtists.length > 0 ? (
            <div className="space-y-4">
              {pendingArtists.map(artist => (
                <div key={artist.id} className="bg-adja-light-green/30 p-4 rounded-xl border border-adja-light-green">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {artist.kyc_selfie ? (
                           <div className="w-16 h-16 rounded-full overflow-hidden shrink-0">
                              <img src={getPublicUrl(artist.kyc_selfie)} alt="selfie" className="w-full h-full object-cover" />
                           </div>
                        ) : (
                           <div className="w-16 h-16 rounded-full bg-adja-dark flex items-center justify-center shrink-0">
                              A
                           </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{artist.stage_name}</h3>
                          <p className="text-xs text-adja-cream/70">{artist.name}</p>
                          <p className="text-xs text-adja-cream/70">{artist.phone}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedKyc(artist)}
                        className="text-xs bg-adja-light-green px-3 py-1.5 rounded text-white"
                      >
                         Détails complets
                      </button>
                  </div>
  
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => confirmApproveArtist(artist.id)} className="flex-1 bg-adja-yellow text-adja-dark font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95 transition-all">
                      <CheckCircle size={18} /> Valider
                    </button>
                    <button onClick={() => { setRejectId(artist.id); setRejectType('artist'); }} className="flex-1 bg-red-500/20 text-red-400 font-bold py-2 rounded border border-red-500/30 flex items-center justify-center gap-2 hover:bg-red-500/30 active:scale-95 transition-all">
                      <XCircle size={18} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-adja-cream/50 text-center py-10 bg-adja-light-green/20 rounded-xl">Aucune demande KYC en attente.</p>
          )}
        </div>
      )}

      {activeTab === 'artistes' && (
         <div className="mb-8">
          {verifiedArtists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiedArtists.map(artist => (
                <div key={artist.id} className="bg-adja-light-green/30 p-4 rounded-xl border border-adja-light-green flex flex-col gap-4 relative">
                  {platformSettings?.featured_artist_id === artist.id && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-adja-yellow text-adja-dark px-2 py-0.5 rounded-full text-[10px] font-bold shadow">
                          <Star size={12} fill="currentColor" /> À La Une
                      </div>
                  )}
                  <div 
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                  >
                        {artist.avatar_url || artist.kyc_selfie ? (
                           <div className="w-16 h-16 rounded-full overflow-hidden shrink-0">
                              <img src={artist.avatar_url ? artist.avatar_url : getPublicUrl(artist.kyc_selfie)} alt="selfie" className="w-full h-full object-cover" />
                           </div>
                        ) : (
                           <div className="w-16 h-16 rounded-full bg-adja-dark flex items-center justify-center shrink-0">
                              A
                           </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{artist.stage_name || artist.name}</h3>
                          <p className="text-xs text-adja-cream/70">Voir le profil complet ↗</p>
                        </div>
                  </div>
                  <button 
                      onClick={() => handleSetFeatured(artist.id)}
                      className="w-full mt-auto text-sm border-2 border-adja-yellow text-adja-yellow hover:bg-adja-yellow hover:text-adja-dark font-bold py-2 rounded transition-colors"
                  >
                      Mettre "À La Une"
                  </button>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-adja-cream/50 text-center py-10 bg-adja-light-green/20 rounded-xl">Aucun artiste vérifié.</p>
          )}
         </div>
      )}

      {activeTab === 'annonceurs' && (
        <div className="mb-8">
          {pendingAnnonceurs.length > 0 ? (
            <div className="space-y-4">
              {pendingAnnonceurs.map(ann => (
                <div key={ann.id} className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30">
                  <div className="flex flex-col gap-2 mb-4">
                     <h3 className="font-bold text-lg text-purple-400">{ann.company_name}</h3>
                     <p className="text-sm text-adja-cream/70"><span className="font-bold">Gérant:</span> {ann.name} ({ann.email})</p>
                     <p className="text-sm text-adja-cream/70"><span className="font-bold">Secteur:</span> {ann.profession}</p>
                     <p className="text-sm text-adja-cream/70"><span className="font-bold">Objectifs:</span> {ann.objectives}</p>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                       {ann.annonceur_kyc_front && (
                         <div>
                           <span className="text-xs text-adja-cream/50 block mb-2">Recto ID</span>
                           <a href={getPublicUrl(ann.annonceur_kyc_front)} target="_blank" rel="noopener noreferrer">
                             <img src={getPublicUrl(ann.annonceur_kyc_front)} alt="ID Front" className="w-full h-auto max-h-32 object-contain rounded bg-adja-dark border border-purple-500/30" />
                           </a>
                         </div>
                       )}
                       {ann.annonceur_kyc_back && (
                         <div>
                           <span className="text-xs text-adja-cream/50 block mb-2">Verso ID</span>
                           <a href={getPublicUrl(ann.annonceur_kyc_back)} target="_blank" rel="noopener noreferrer">
                             <img src={getPublicUrl(ann.annonceur_kyc_back)} alt="ID Back" className="w-full h-auto max-h-32 object-contain rounded bg-adja-dark border border-purple-500/30" />
                           </a>
                         </div>
                       )}
                       {ann.annonceur_kyc_selfie && (
                         <div>
                           <span className="text-xs text-adja-cream/50 block mb-2">Selfie</span>
                           <a href={getPublicUrl(ann.annonceur_kyc_selfie)} target="_blank" rel="noopener noreferrer">
                             <img src={getPublicUrl(ann.annonceur_kyc_selfie)} alt="Selfie" className="w-full h-auto max-h-32 object-contain rounded bg-adja-dark border border-purple-500/30" />
                           </a>
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => confirmApproveAnnonceur(ann.id)} className="flex-1 bg-purple-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-purple-500 active:scale-95 transition-all">
                       Valider
                    </button>
                    <button onClick={() => { setRejectId(ann.id); setRejectType('annonceur'); }} className="flex-1 bg-red-500/20 text-red-400 font-bold py-2 rounded border border-red-500/30 flex items-center justify-center gap-2 hover:bg-red-500/30 active:scale-95 transition-all">
                       Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-adja-cream/50 text-center py-10 bg-adja-light-green/20 rounded-xl">Aucune demande Annonceur en attente.</p>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-adja-light-green/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Users className="mb-2 text-adja-yellow" size={32} />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
                <span className="text-xs text-adja-cream/70">Utilisateurs Inscrits</span>
            </div>
            <div className="bg-adja-light-green/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Music className="mb-2 text-purple-400" size={32} />
                <span className="text-2xl font-bold">{stats.totalArtists}</span>
                <span className="text-xs text-adja-cream/70">Artistes Vérifiés</span>
            </div>
            <div className="bg-adja-light-green/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <PlayCircle className="mb-2 text-green-400" size={32} />
                <span className="text-2xl font-bold">{stats.totalStreams}</span>
                <span className="text-xs text-adja-cream/70">Streams Totaux</span>
            </div>
            <div className="bg-adja-light-green/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Clock className="mb-2 text-blue-400" size={32} />
                <span className="text-2xl font-bold">{stats.totalTracks}</span>
                <span className="text-xs text-adja-cream/70">Chansons publiées</span>
            </div>
            {/* Added for 'légendes' placeholder */}
            <div className="col-span-2 bg-adja-light-green/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-xs text-adja-cream/70">Statistiques en temps réel et durée d'usage bientôt disponibles.</span>
            </div>
        </div>
      )}

      {activeTab === 'settings' && (
         <div className="bg-adja-light-green/20 p-6 rounded-xl border border-adja-light-green max-w-xl">
             <h2 className="text-xl font-bold mb-6">Paramètres de la Plateforme</h2>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">
                    Artiste "À La Une" (Hero Banner)
                  </label>
                  {platformSettings?.featured_artist_id ? (
                      <div className="bg-adja-dark text-white rounded-xl px-4 py-3 border border-adja-yellow flex items-center justify-between">
                          <span className="font-bold">
                              {verifiedArtists.find(a => a.id === platformSettings.featured_artist_id)?.stage_name || "Artiste Sélectionné"}
                          </span>
                          <button onClick={() => setPlatformSettings({...platformSettings, featured_artist_id: null})} className="text-xs text-red-400 hover:underline">Retirer</button>
                      </div>
                  ) : (
                      <div className="bg-adja-dark text-adja-cream/50 rounded-xl px-4 py-3 text-sm italic">
                          Aucun artiste sélectionné. Allez dans "Artistes Vérifiés" pour en choisir un.
                      </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">
                    Montant attribué par stream (en FCFA)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={platformSettings?.reward_per_stream || 0}
                    onChange={(e) => setPlatformSettings({...platformSettings, reward_per_stream: parseFloat(e.target.value)})}
                    className="w-full bg-adja-dark text-white rounded-xl px-4 py-3 outline-none focus:border-adja-yellow border border-transparent transition-colors shadow-inner" 
                  />
                  <p className="text-xs text-adja-cream/50 mt-2">Ce montant sera automatiquement crédité au portefeuille de l'artiste à chaque stream valide.</p>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-adja-yellow text-adja-dark font-bold py-3 rounded-xl uppercase tracking-wider relative overflow-hidden group disabled:opacity-50"
                >
                   {savingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </button>
             </div>
         </div>
      )}

      {activeTab === 'primes' && (
         <div className="bg-adja-light-green/20 p-6 rounded-xl border border-adja-light-green overflow-hidden">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Reversements en attente</h2>
                <button onClick={fetchStats} className="text-adja-yellow text-sm">Actualiser</button>
             </div>
             
             {artistsPendingPayout.length > 0 ? (
               <div className="space-y-4">
                 {artistsPendingPayout.map((artist, idx) => (
                    <div key={idx} className="bg-adja-dark p-4 rounded-xl flex items-center justify-between shadow-md">
                      <div>
                        <h3 className="font-bold">{artist.full_name || artist.artist_name || 'Artiste inconnu'}</h3>
                        <p className="text-sm text-adja-yellow/80 font-mono mt-1">{artist.wallet_fcfa?.toFixed(2)} FCFA à reverser</p>
                      </div>
                      <button 
                        onClick={() => handlePayout(artist.id)}
                        disabled={payingId === artist.id}
                        className="bg-adja-yellow text-adja-dark font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                      >
                        {payingId === artist.id ? 'Traitement...' : 'Marquer comme payé'}
                      </button>
                    </div>
                 ))}
               </div>
             ) : (
                <div className="text-center py-10 bg-adja-dark rounded-xl">
                   <p className="text-adja-cream/50">Aucun artiste n'a de solde positif à reverser.</p>
                </div>
             )}
         </div>
      )}

      {/* KYC Modal */}
      {selectedKyc && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
             <div className="bg-adja-dark border border-adja-light-green rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                 <div className="flex items-center justify-between mb-6">
                     <h2 className="text-xl font-bold">Dossier KYC</h2>
                     <button onClick={() => setSelectedKyc(null)} className="text-adja-cream/50 hover:text-white"><XCircle size={24} /></button>
                 </div>
                 
                 <div className="space-y-4 mb-6">
                     <div>
                         <span className="text-xs text-adja-cream/50 block">Nom légal</span>
                         <span className="font-bold">{selectedKyc.name}</span>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block">Nom d'Artiste</span>
                         <span className="font-bold">{selectedKyc.stage_name}</span>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block">Numéro Téléphone / MoMo</span>
                         <span className="font-bold">{selectedKyc.phone}</span>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block">Type de pièce</span>
                         <span className="font-bold uppercase">{selectedKyc.id_type}</span>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block">Numéro d'identification</span>
                         <span className="font-bold">{selectedKyc.id_number}</span>
                     </div>
                 </div>

                 <div className="space-y-4 mb-6">
                     <div>
                         <span className="text-xs text-adja-cream/50 block mb-2">Selfie (Vérification faciale)</span>
                         <div className="aspect-square w-48 bg-adja-light-green/30 rounded overflow-hidden mx-auto">
                             {selectedKyc.kyc_selfie && <a href={getPublicUrl(selectedKyc.kyc_selfie)} target="_blank" rel="noopener noreferrer"><img src={getPublicUrl(selectedKyc.kyc_selfie)} alt="Selfie" className="w-full h-full object-cover" /></a>}
                         </div>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block mb-2">Pièce d'identité (Recto)</span>
                         <div className="w-full bg-adja-light-green/30 rounded overflow-hidden">
                             {selectedKyc.kyc_front && <a href={getPublicUrl(selectedKyc.kyc_front)} target="_blank" rel="noopener noreferrer"><img src={getPublicUrl(selectedKyc.kyc_front)} alt="Recto" className="w-full object-contain" /></a>}
                         </div>
                     </div>
                     <div>
                         <span className="text-xs text-adja-cream/50 block mb-2">Pièce d'identité (Verso)</span>
                         <div className="w-full bg-adja-light-green/30 rounded overflow-hidden">
                             {selectedKyc.kyc_back && <a href={getPublicUrl(selectedKyc.kyc_back)} target="_blank" rel="noopener noreferrer"><img src={getPublicUrl(selectedKyc.kyc_back)} alt="Verso" className="w-full object-contain" /></a>}
                         </div>
                     </div>
                 </div>

                 <div className="flex gap-3">
                    <button onClick={() => { confirmApproveArtist(selectedKyc.id); setSelectedKyc(null); }} className="flex-1 bg-adja-yellow text-adja-dark font-bold py-3 rounded flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95 transition-all shadow-md">
                      <CheckCircle size={18} /> Valider l'Artiste
                    </button>
                    <button onClick={() => { setRejectId(selectedKyc.id); setRejectType('artist'); setSelectedKyc(null); }} className="flex-1 bg-red-500/20 text-red-400 font-bold py-3 rounded border border-red-500/30 flex items-center justify-center gap-2 hover:bg-red-500/30 active:scale-95 transition-all shadow-md">
                       <XCircle size={18} /> Rejeter avec motif
                    </button>
                 </div>
             </div>
         </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-adja-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-400">Motif du rejet</h3>
            <p className="text-sm text-adja-cream/70 mb-4">Veuillez indiquer pourquoi la demande a été rejetée. {rejectType === 'artist' ? "L'artiste" : "L'annonceur"} verra ce motif.</p>
            <textarea
              className="w-full bg-black/50 border border-adja-cream/20 rounded-xl p-3 text-white mb-6 focus:border-red-500 focus:outline-none"
              rows={4}
              placeholder="Ex: Pièce d'identité illisible, Selfie flou..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setRejectId(null); setRejectReason(""); }} 
                className="flex-1 bg-adja-cream/10 text-white font-bold py-3 rounded-xl"
              >
                Annuler
              </button>
              <button 
                onClick={rejectType === 'artist' ? confirmRejectArtist : confirmRejectAnnonceur} 
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
