import { User, LogOut, ShieldCheck, Music, Settings, XCircle, Camera, Edit2, Save } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import React, { useState, useRef, useEffect } from 'react';

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/login';
    }
  };

  const handleSubscribe = () => {
    toast.success('La page Abonnement sera bientôt disponible');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editName, phone: editPhone })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Profil mis à jour');
      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) return toast.error('L\'image doit faire moins de 2Mo');

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      toast.success('Photo de profil mise à jour');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setAvatarUploading(false);
    }
  };

  const roleText = profile?.role === 'admin' ? 'Administrateur' : 
                   profile?.role === 'artist' ? 'Artiste Vérifié' : 
                   profile?.role === 'artist_pending' ? 'Artiste (En attente)' : 
                   'Auditeur';

  const handleCopyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success('Code copié !');
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <div className="flex items-center mb-8">
        <h1 className="text-2xl font-bold">Mon Profil</h1>
      </div>
      
      <div className="flex flex-col items-center mb-8 relative">
        <div className="w-24 h-24 bg-adja-light-green rounded-full flex flex-col items-center justify-center mb-4 text-adja-yellow shadow-xl overflow-hidden relative group">
           {avatarUploading ? (
             <div className="text-sm">...</div>
           ) : profile?.avatar_url ? (
             <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             <User size={48} className="text-adja-yellow mb-1" />
           )}
           <div 
             onClick={() => avatarInputRef.current?.click()}
             className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
           >
             <Camera size={24} className="text-white" />
           </div>
           <input 
             type="file" 
             accept="image/*" 
             className="hidden" 
             ref={avatarInputRef}
             onChange={handleAvatarUpload}
           />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold truncate">{profile?.stage_name || profile?.name || user?.phone || user?.email || 'Utilisateur'}</h2>
          {(profile?.role === 'artist' || profile?.role === 'admin') && <ShieldCheck size={20} className="text-adja-yellow" />}
        </div>
        <span className="text-adja-cream/70 text-sm mb-4">{roleText}</span>
        
        {profile && (
          <div className="w-full bg-adja-light-green/20 border border-adja-yellow/20 p-4 rounded-xl flex items-center justify-between mb-4 shadow-xl">
             <div>
               <p className="text-xs text-adja-cream/50 uppercase tracking-wider mb-1">Portefeuille</p>
               <p className="text-xl font-bold text-adja-yellow">{profile.wallet_fcfa || 0} FCFA</p>
             </div>
             <div className="text-right cursor-pointer group" onClick={() => {
                 if (profile.referral_code) {
                   navigator.clipboard.writeText(profile.referral_code);
                   toast.success('Code copié !');
                 }
               }}>
               <p className="text-xs text-adja-cream/50 uppercase tracking-wider mb-1 group-hover:text-adja-cream transition-colors">Code Parrain</p>
               <p className="text-md font-mono bg-adja-dark px-2 py-1 rounded text-white border border-adja-light-green group-hover:border-adja-yellow transition-colors">{profile.referral_code || '---'}</p>
             </div>
          </div>
        )}

        {!isEditing ? (
          <button 
             onClick={() => setIsEditing(true)}
             className="bg-adja-light-green/30 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-adja-light-green/50 transition-colors"
          >
            <Edit2 size={14} /> Modifier mes infos
          </button>
        ) : (
          <div className="w-full bg-adja-light-green/20 p-4 rounded-xl mt-2 border border-adja-light-green/50 space-y-4">
            <div>
               <label className="text-xs text-adja-cream/70 block mb-1">Nom complet</label>
               <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-adja-dark p-3 rounded-lg text-white"
                  disabled={profile?.role === 'artist' || profile?.role === 'artist_pending'}
               />
               {(profile?.role === 'artist' || profile?.role === 'artist_pending') && (
                 <span className="text-xs text-adja-yellow">Déduit de votre identité d'artiste</span>
               )}
            </div>
            <div>
               <label className="text-xs text-adja-cream/70 block mb-1">Numéro de téléphone</label>
               <input 
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-adja-dark p-3 rounded-lg text-white"
                  disabled={profile?.role === 'artist' || profile?.role === 'artist_pending'}
               />
            </div>
            <div className="flex gap-2">
               <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 bg-adja-dark rounded-lg text-sm"
               >
                 Annuler
               </button>
               <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-adja-yellow text-adja-dark rounded-lg text-sm font-bold flex justify-center items-center gap-2"
               >
                 <Save size={14} /> Enregistrer
               </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {profile?.kyc_reject_reason && profile?.role === 'auditeur' && (
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
            <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2"><XCircle size={18} /> Demande Artiste Rejetée</h3>
            <p className="text-sm text-adja-cream/70 mb-3">
              Motif: <span className="font-semibold text-white">{profile.kyc_reject_reason}</span>
            </p>
            <button 
              onClick={() => navigate('/login', { state: { retryKyc: true } })}
              className="bg-red-500/20 text-red-400 text-sm font-bold py-2 px-4 rounded hover:bg-red-500/30 w-full"
            >
              Corriger et soumettre à nouveau
            </button>
          </div>
        )}

        {profile?.role === 'admin' && (
          <div className="bg-adja-light-green/30 p-4 rounded-xl border border-adja-light-green/50">
            <label className="text-sm text-adja-cream/70 mb-2 block">Changer de rôle (Test/Admin)</label>
            <select 
              className="w-full bg-adja-dark text-white p-3 rounded-xl border border-adja-light-green"
              value={profile?.role || 'auditeur'}
              onChange={async (e) => {
                const newRole = e.target.value;
                try {
                  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user?.id);
                  if (error) throw error;
                  toast.success(`Rôle changé en ${newRole}`);
                  window.location.reload();
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            >
              <option value="auditeur">Auditeur (Normal)</option>
              <option value="artist">Artiste Vérifié</option>
              <option value="artist_pending">Artiste (En attente KYC)</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
        )}

        {profile?.role === 'auditeur' && !profile?.kyc_reject_reason && (
          <div 
            onClick={() => navigate('/login', { state: { retryKyc: true } })}
            className="w-full flex items-center justify-between bg-adja-yellow/10 border border-adja-yellow/30 p-4 rounded-xl cursor-pointer hover:bg-adja-yellow/20 transition-colors"
           >
             <div>
               <p className="font-bold text-adja-yellow">Devenir Artiste</p>
               <p className="text-xs text-adja-cream/70">Soumettez votre identité musicale</p>
             </div>
             <ShieldCheck size={20} className="text-adja-yellow shrink-0" />
          </div>
        )}

        {!profile?.is_annonceur && !profile?.is_annonceur_pending && (
          <div 
            onClick={() => navigate('/annonceur-kyc')}
            className="w-full flex items-center justify-between bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl cursor-pointer hover:bg-purple-500/20 transition-colors mt-4"
           >
             <div>
               <p className="font-bold text-purple-400">Devenir Annonceur</p>
               <p className="text-xs text-adja-cream/70">Diffusez vos publicités</p>
             </div>
             <ShieldCheck size={20} className="text-purple-400 shrink-0" />
          </div>
        )}

        {profile?.is_annonceur_pending && (
          <div className="w-full flex items-center justify-between bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl mt-4">
             <div>
               <p className="font-bold text-purple-400">Annonceur en attente</p>
               <p className="text-xs text-adja-cream/70">Dossier en cours d'analyse</p>
             </div>
          </div>
        )}

        {profile?.is_annonceur && (
          <div 
            onClick={() => navigate('/annonceur')}
            className="w-full flex items-center justify-between bg-purple-500/20 border border-purple-500/50 p-4 rounded-xl cursor-pointer hover:bg-purple-500/30 transition-colors mt-4"
           >
             <div>
               <p className="font-bold text-purple-400">Espace Annonceur</p>
               <p className="text-xs text-adja-cream/70">Gérez vos campagnes</p>
             </div>
          </div>
        )}

        {(profile?.role === 'artist' || profile?.role === 'artist_pending') && (
          <button 
            onClick={() => navigate('/artist-dashboard')}
            className="w-full flex items-center gap-3 bg-adja-light-green/30 text-white font-semibold p-4 rounded-xl hover:bg-adja-light-green/50 transition-colors border border-adja-light-green/50"
          >
            <Music size={20} className="text-adja-yellow" />
            Espace Artiste
          </button>
        )}

        {profile?.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 bg-adja-yellow/20 text-adja-yellow font-semibold p-4 rounded-xl hover:bg-adja-yellow/30 transition-colors border border-adja-yellow/30"
          >
            <Settings size={20} />
            Administration
          </button>
        )}
      </div>

      <div className="bg-adja-light-green/30 rounded-2xl p-6 mb-8 border border-adja-light-green/50">
        <h3 className="font-bold mb-2">Passez en mode Pro</h3>
        <p className="text-sm text-adja-cream/70 mb-4">Supportez les artistes Hadja et profitez de l'écoute hors-ligne.</p>
        <button 
          onClick={handleSubscribe}
          className="w-full bg-adja-yellow text-adja-dark font-semibold py-3 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          S'abonner
        </button>
      </div>

      <div className="mt-auto">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 font-semibold py-4 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
          <LogOut size={20} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
