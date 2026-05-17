import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import React, { useEffect, useRef, useState } from 'react';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Explorer from './pages/Explorer';
import Library from './pages/Library';
import Profile from './pages/Profile';
import AlbumDetails from './pages/AlbumDetails';
import ArtistDetails from './pages/ArtistDetails';
import PlaylistDetails from './pages/PlaylistDetails';
import GenreDetails from './pages/GenreDetails';
import PlayerFullscreen from './pages/PlayerFullscreen';
import Upload from './pages/Upload';
import ArtistDashboard from './pages/ArtistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AnnonceurKyc from './pages/AnnonceurKyc';
import AnnonceurDashboard from './pages/AnnonceurDashboard';
import BottomNav from './components/BottomNav';
import PlayerBar from './components/PlayerBar';

import SplashScreen from './components/SplashScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-adja-green text-adja-cream">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile || !profile.role) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

export default function AppRoutes() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splash_shown'));
  const location = useLocation();
  const { user } = useAuth();
  const showNavAndPlayer = user && location.pathname !== '/login' && location.pathname !== '/player' && location.pathname !== '/upload';

  const sessionStartRef = useRef<number | null>(null);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('splash_shown', 'true');
  };

  useEffect(() => {
    if (!user) return;
    
    sessionStartRef.current = Date.now();
    
    const sendSession = async () => {
      if (!sessionStartRef.current) return;
      
      const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (durationSeconds < 2) return; // Ignore very short sessions
      
      const sessionData = {
        user_id: user.id,
        duration_seconds: durationSeconds,
        started_at: new Date(sessionStartRef.current).toISOString(),
        ended_at: new Date().toISOString()
      };
      
      if (navigator.onLine) {
        supabase.from('sessions').insert(sessionData).then(() => {}, () => {});
      } else {
        const cache = await caches.open('adja-offline-sessions');
        await cache.put(`/session/${Date.now()}`, new Response(JSON.stringify(sessionData)));
      }
      
      sessionStartRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendSession();
      } else {
        sessionStartRef.current = Date.now();
      }
    };

    const syncOfflineSessions = async () => {
      if (!navigator.onLine) return;
      try {
        const cache = await caches.open('adja-offline-sessions');
        const keys = await cache.keys();
        for (const req of keys) {
          const res = await cache.match(req);
          if (res) {
            const data = await res.json();
            await supabase.from('sessions').insert(data);
            await cache.delete(req);
          }
        }
      } catch (e) { }
    };
    
    syncOfflineSessions();
    window.addEventListener('online', syncOfflineSessions);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', sendSession);
    
    return () => {
      sendSession();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendSession);
      window.removeEventListener('online', syncOfflineSessions);
    };
  }, [user]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-adja-green text-adja-cream">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Toaster position="top-center" />
      <div className="flex-1 overflow-y-auto pb-24">
        <Routes>
          <Route path="/login" element={<Onboarding />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/explorer" element={<ProtectedRoute><Explorer /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/album/:id" element={<ProtectedRoute><AlbumDetails /></ProtectedRoute>} />
          <Route path="/artist/:id" element={<ProtectedRoute><ArtistDetails /></ProtectedRoute>} />
          <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetails /></ProtectedRoute>} />
          <Route path="/player" element={<ProtectedRoute><PlayerFullscreen /></ProtectedRoute>} />
          <Route path="/genre/:genreName" element={<ProtectedRoute><GenreDetails /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/artist-dashboard" element={<ProtectedRoute><ArtistDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/annonceur-kyc" element={<ProtectedRoute><AnnonceurKyc /></ProtectedRoute>} />
          <Route path="/annonceur" element={<ProtectedRoute><AnnonceurDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
      
      {showNavAndPlayer && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <PlayerBar />
          </div>
          <div className="pointer-events-auto">
            <BottomNav />
          </div>
        </div>
      )}
    </div>
  );
}
