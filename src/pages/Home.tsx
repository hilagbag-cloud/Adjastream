import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Play, History, Music, XCircle, BadgeCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../lib/AudioPlayerContext';

function HorizontalScroll({ children, autoScroll = false }: { children: React.ReactNode, autoScroll?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;

    let intervalId: number;
    let isHovered = false;

    const startScroll = () => {
      intervalId = window.setInterval(() => {
        if (scrollRef.current && !isHovered) {
          scrollRef.current.scrollLeft += 1;
          
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          if (scrollLeft >= scrollWidth - clientWidth - 1) {
            scrollRef.current.scrollLeft = 0;
          }
        }
      }, 30);
    };

    startScroll();

    const handleMouseEnter = () => { isHovered = true; };
    const handleMouseLeave = () => { isHovered = false; };
    const handleTouchStart = () => { isHovered = true; };
    const handleTouchEnd = () => { 
      isHovered = false; 
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.clearInterval(intervalId);
      if (el) {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [autoScroll]);

  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 gap-4 pb-4 smooth-scroll-behavior"
      style={{ scrollBehavior: 'smooth' }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { playTrack } = useAudioPlayer();

  const [nouveautes, setNouveautes] = useState<any[]>([]);
  const [legendes, setLegendes] = useState<any[]>([]);
  const [top50, setTop50] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [featuredArtist, setFeaturedArtist] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [showReferralBanner, setShowReferralBanner] = useState(() => !localStorage.getItem('hasSeenReferralBanner'));
  const [showAnnonceurBanner, setShowAnnonceurBanner] = useState(() => !localStorage.getItem('hasSeenAnnonceurBanner'));

  const getPublicUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const dismissReferralBanner = () => {
    localStorage.setItem('hasSeenReferralBanner', 'true');
    setShowReferralBanner(false);
  };

  const dismissAnnonceurBanner = () => {
    localStorage.setItem('hasSeenAnnonceurBanner', 'true');
    setShowAnnonceurBanner(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tracksRes, artistsRes, popularRes, genresRes, settingsRes] = await Promise.all([
          supabase.from('tracks').select('*').order('createdat', { ascending: false }).limit(10),
          supabase.from('users').select('*').eq('role', 'artist').limit(10),
          supabase.rpc('get_trending_tracks'),
          supabase.from('genres').select('*').order('name'),
          supabase.from('platform_settings').select('featured_artist_id').limit(1).single()
        ]);

        if (tracksRes.data) setNouveautes(tracksRes.data);
        if (artistsRes.data) setLegendes(artistsRes.data);
        if (popularRes.data) setTop50(popularRes.data);
        if (genresRes.data) setGenres(genresRes.data);
        
        if (settingsRes.data?.featured_artist_id) {
            const { data: featuredData } = await supabase.from('users').select('*').eq('id', settingsRes.data.featured_artist_id).single();
            if (featuredData) setFeaturedArtist(featuredData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setFetchingData(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      setFetchingData(false);
    }
  }, [user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (fetchingData) {
    return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen pb-28">
      
      {profile?.kyc_reject_reason && profile?.role === 'auditeur' && (
        <div className="mx-6 mt-6 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
          <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2"><XCircle size={18} /> Rappel: Demande Artiste Rejetée</h3>
          <p className="text-sm text-adja-cream/70 mb-3">
            Motif de notre équipe: <span className="font-semibold text-white">{profile.kyc_reject_reason}</span>
          </p>
          <button 
            onClick={() => navigate('/login', { state: { retryKyc: true } })}
            className="bg-red-500/20 text-red-400 text-sm font-bold py-2 px-4 rounded hover:bg-red-500/30 w-full"
          >
            Corriger et soumettre à nouveau
          </button>
        </div>
      )}

      {/* Hero Banner Section */}
      {featuredArtist ? (
          <div className="px-6 pt-6 pb-8">
            <div 
              onClick={() => navigate(`/artist/${featuredArtist.id}`)}
              className="relative w-full h-64 rounded-3xl overflow-hidden shadow-2xl group cursor-pointer"
            >
              <img src={featuredArtist.avatar_url ? featuredArtist.avatar_url : (featuredArtist.kyc_selfie ? getPublicUrl(featuredArtist.kyc_selfie) : 'https://images.unsplash.com/photo-1516280440502-3c139b4b049d?w=800&q=80')} alt={featuredArtist.stage_name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-adja-dark via-adja-dark/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end">
                <div>
                  <span className="text-adja-yellow text-xs font-bold uppercase tracking-widest mb-1 block">Artiste du jour</span>
                  <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    {featuredArtist.stage_name || featuredArtist.name}
                    <BadgeCheck size={24} className="text-adja-yellow" />
                  </h2>
                  <p className="text-adja-cream/80 text-sm mt-1">Découvrez tout son univers musical sur AdjaStream !</p>
                </div>
              </div>
            </div>
          </div>
      ) : (
         <div className="px-6 pt-6 pb-8">
          <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-2xl bg-adja-light-green/30 border border-adja-light-green flex flex-col items-center justify-center p-6 text-center">
             <Music size={48} className="text-adja-cream/50 mb-4" />
             <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur AdjaStream</h2>
             <p className="text-adja-cream/80 text-sm">Écoutez, explorez et soutenez les talents africains !</p>
          </div>
         </div>
      )}

      {/* Referral Interactive Banner */}
      {showReferralBanner && (
        <div className="mx-6 mb-4 bg-gradient-to-r from-adja-yellow to-orange-400 p-4 rounded-2xl relative shadow-lg overflow-hidden group">
          <button 
            onClick={dismissReferralBanner}
            className="absolute top-2 right-2 text-adja-dark/50 hover:text-adja-dark bg-white/20 rounded-full p-1"
          >
            <XCircle size={18} />
          </button>
          <div className="relative z-10">
            <h3 className="text-adja-dark font-black text-lg leading-tight mb-1">Invitez vos amis !</h3>
            <p className="text-adja-dark/80 text-sm mb-3">Partagez votre code parrain et gagnez des FCFA dans votre portefeuille.</p>
            <button 
              onClick={() => { dismissReferralBanner(); navigate('/profile'); }}
              className="bg-adja-dark text-adja-yellow text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider"
            >
               Mon Code
            </button>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
             <Music size={120} />
          </div>
        </div>
      )}

      {/* Annonceur Interactive Banner */}
      {showAnnonceurBanner && !profile?.is_annonceur && !profile?.is_annonceur_pending && (
        <div className="mx-6 mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-2xl relative shadow-lg overflow-hidden group">
          <button 
            onClick={dismissAnnonceurBanner}
            className="absolute top-2 right-2 text-white/50 hover:text-white bg-black/20 rounded-full p-1"
          >
            <XCircle size={18} />
          </button>
          <div className="relative z-10">
            <h3 className="text-white font-black text-lg leading-tight mb-1">Devenez Annonceur</h3>
            <p className="text-white/80 text-sm mb-3">Communiquez sur AdjaStream et touchez des milliers d'auditeurs.</p>
            <button 
              onClick={() => { dismissAnnonceurBanner(); navigate('/annonceur-kyc'); }}
              className="bg-white text-purple-600 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider shadow-md"
            >
               Postuler
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
             <BadgeCheck size={100} className="text-white" />
          </div>
        </div>
      )}

      {/* Top Playlists (Platform Generated) */}
      <div className="mb-10 px-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Tops & Tendances</h2>
        {top50 && top50.length > 0 ? (
          <div className="space-y-3">
            {top50.slice(0, 3).map((track, index) => (
              <div 
                key={track.id} 
                onClick={() => playTrack(track, top50)}
                className="flex items-center gap-4 bg-adja-light-green/20 p-3 rounded-xl border border-adja-light-green/30 cursor-pointer hover:bg-adja-light-green/40 transition-colors group"
              >
                <div className="w-8 text-center font-bold text-adja-yellow text-lg">{index + 1}</div>
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
                <button className="text-adja-cream/50 hover:text-adja-yellow p-2">
                  <Play size={20} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {['Top 50 Hadja', 'Viral Hebdo', 'Classiques'].map((period, i) => (
              <button 
                key={period} 
                onClick={() => navigate(`/playlist/${i}`)}
                className={`shrink-0 px-6 py-3 rounded-xl font-semibold transition-colors ${i === 0 ? 'bg-adja-yellow text-adja-dark' : 'bg-adja-light-green text-adja-cream hover:bg-adja-light-green/80'}`}
              >
                {period}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nouveautés */}
      <div className="mb-10">
        <h2 className="text-xl font-bold px-6 mb-4">Nouveautés</h2>
        {nouveautes.length > 0 ? (
          <HorizontalScroll autoScroll={true}>
            {nouveautes.map((item) => (
              <div 
                key={item.id} 
                onClick={() => playTrack(item, nouveautes)}
                className="flex flex-col gap-2 w-40 shrink-0 group relative cursor-pointer"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-adja-light-green flex items-center justify-center shadow-lg">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <Music size={48} className="text-adja-cream/20" />
                  )}
                  {item.createdat && (new Date().getTime() - new Date(item.createdat).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-lg animate-pulse">
                      NEW
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-adja-yellow text-adja-dark p-3 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      <Play fill="currentColor" size={24} />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white truncate">{item.title}</h3>
                  <span className="text-xs text-adja-cream/70 flex items-center gap-1 truncate w-full">
                    {item.artist}
                    <BadgeCheck size={14} className="text-adja-yellow shrink-0" />
                  </span>
                </div>
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <div className="px-6 relative h-24 bg-adja-light-green/20 rounded-2xl border border-adja-light-green/40 flex items-center justify-center flex-col mx-6">
             <Music size={24} className="text-adja-cream/30 mb-2" />
             <p className="text-adja-cream/50 text-sm">Aucun son disponible pour le moment.</p>
          </div>
        )}
      </div>

      {/* Genres Spécifiques */}
      <div className="mb-10 px-6">
        <h2 className="text-xl font-bold mb-4 text-white">Explorer par Genre</h2>
        {genres.length > 0 ? (
            <HorizontalScroll>
            {genres.map((genre, index) => {
                const colors = [
                    'from-orange-500 to-red-600',
                    'from-blue-500 to-purple-600',
                    'from-green-500 to-teal-600',
                    'from-pink-500 to-rose-600',
                    'from-yellow-500 to-orange-500'
                ];
                return (
                <div 
                key={genre.id} 
                onClick={() => navigate(`/genre/${encodeURIComponent(genre.name)}`)}
                className="relative w-48 shrink-0 h-32 rounded-xl overflow-hidden shadow-lg cursor-pointer group bg-adja-light-green"
                >
                <div className={`absolute inset-0 bg-gradient-to-br ${colors[index % colors.length]} opacity-80 group-hover:opacity-100 transition-opacity z-10`}></div>
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <h3 className="text-white font-bold text-lg tracking-wider text-center px-2">{genre.name}</h3>
                </div>
                </div>
                );
            })}
            </HorizontalScroll>
        ) : (
            <div className="relative h-24 bg-adja-light-green/20 rounded-2xl border border-adja-light-green/40 flex items-center justify-center flex-col">
                <p className="text-adja-cream/50 text-sm">Aucun genre disponible.</p>
            </div>
        )}
      </div>

      {/* Légendes (Artistes) */}
      <div className="mb-10 overflow-hidden">
        <h2 className="text-xl font-bold px-6 mb-4">Légendes</h2>
        {legendes.length > 0 ? (
          <HorizontalScroll autoScroll={true}>
            {legendes.map((artist) => (
              <div 
                key={artist.id} 
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center gap-2 w-28 shrink-0 cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden bg-adja-light-green border-2 border-adja-yellow/30 p-1 group-hover:border-adja-yellow transition-colors shadow-lg shadow-adja-yellow/20">
                  <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-adja-dark">
                    {artist.avatar_url || artist.kyc_selfie ? (
                       <img src={artist.avatar_url ? artist.avatar_url : getPublicUrl(artist.kyc_selfie)} alt={artist.stage_name} className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-xl font-bold text-adja-cream/40">{artist.stage_name?.charAt(0) || 'A'}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-white flex items-center justify-center gap-1 w-full">
                  <span className="truncate">{artist.stage_name || 'Artiste'}</span>
                  {artist.role === 'artist' && <BadgeCheck size={14} className="text-adja-yellow shrink-0 drop-shadow-md" />}
                </span>
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <div className="px-6 relative h-24 bg-adja-light-green/20 rounded-2xl border border-adja-light-green/40 flex items-center justify-center flex-col mx-6">
             <p className="text-adja-cream/50 text-sm">Aucun artiste vérifié pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

