import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Headphones, Mic, UploadCloud, CheckCircle2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => localStorage.getItem('pending_referral') || '');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<'auth' | 'role' | 'auditeur_prefs' | 'artiste_info' | 'artiste_consent' | 'artiste_kyc'>('auth');
  const [selectedRole, setSelectedRole] = useState<'auditeur' | 'artiste' | null>(null);

  // Auditeur state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const GENRES = ['Zinli', 'Agbadja', 'Massè', 'Afro-Jazz', 'Années 80', 'Gospel'];

  // Artiste state
  const [stageName, setStageName] = useState(() => localStorage.getItem('onboarding_stageName') || '');
  const [realName, setRealName] = useState(() => localStorage.getItem('onboarding_realName') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('onboarding_phone') || '');
  
  // KYC State
  const [idType, setIdType] = useState(() => localStorage.getItem('onboarding_idType') || 'cni');
  const [idNumber, setIdNumber] = useState(() => localStorage.getItem('onboarding_idNumber') || '');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idSelfie, setIdSelfie] = useState<File | null>(null);

  useEffect(() => {
    localStorage.setItem('onboarding_stageName', stageName);
    localStorage.setItem('onboarding_realName', realName);
    localStorage.setItem('onboarding_phone', phone);
    localStorage.setItem('onboarding_idType', idType);
    localStorage.setItem('onboarding_idNumber', idNumber);
  }, [stageName, realName, phone, idType, idNumber]);

  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const idSelfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (referralCode) localStorage.setItem('pending_referral', referralCode);
  }, [referralCode]);

  const applyReferralIfNeeded = async () => {
    const code = localStorage.getItem('pending_referral');
    if (code) {
      try {
        await supabase.rpc('apply_referral_code', { ref_code: code });
        localStorage.removeItem('pending_referral');
      } catch (e) {
        console.error("Error applying referral", e);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (user && profile) {
      applyReferralIfNeeded();
    }

    if (!user) {
      setStep('auth');
      return;
    }
    
    const isRetryKyc = location.state?.retryKyc;

    if (!profile || !profile.role) {
      setStep('role');
    } else if (isRetryKyc) {
      setStep('artiste_info');
    } else if (profile.role === 'auditeur' || profile.role === 'admin') {
      navigate('/');
    } else if (profile.role === 'artist' || profile.role === 'artist_pending') {
      navigate('/artist-dashboard');
    }
  }, [user, profile, authLoading, navigate, location.state]);

  const onEmailSubmit = async () => {
    if (!email || !password) return toast.error('Veuillez remplir tous les champs');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Erreur Google Sign-In');
    }
  };

  const selectRoleAndProceed = (role: 'auditeur' | 'artiste') => {
    setSelectedRole(role);
    if (role === 'auditeur') setStep('auditeur_prefs');
    else setStep('artiste_info');
  };

  const completeAuditeur = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'auditeur',
          preferences: selectedGenres
        });
      if (error) throw error;
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const proceedToConsent = () => {
    if (!stageName || !realName || !phone) return toast.error('Veuillez remplir vos informations');
    setStep('artiste_consent');
  };

  const completeConsent = () => {
    setStep('artiste_kyc');
  };

  const completeArtiste = async () => {
    if (!user || !idFront || !idBack || !idSelfie || !idNumber) {
      return toast.error('Veuillez fournir toutes les informations KYC demandées');
    }
    
    setLoading(true);
    try {
      const ts = Date.now();
      
      const frontPath = `kyc/${user.id}/${ts}_front_${idFront.name}`;
      const backPath = `kyc/${user.id}/${ts}_back_${idBack.name}`;
      const selfiePath = `kyc/${user.id}/${ts}_selfie_${idSelfie.name}`;

      const [frontRes, backRes, selfieRes] = await Promise.all([
        supabase.storage.from('assets').upload(frontPath, idFront),
        supabase.storage.from('assets').upload(backPath, idBack),
        supabase.storage.from('assets').upload(selfiePath, idSelfie)
      ]);

      if (frontRes.error) throw frontRes.error;
      if (backRes.error) throw backRes.error;
      if (selfieRes.error) throw selfieRes.error;

      // 2. Upsert profile as artist_pending
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'artist_pending',
          kyc_reject_reason: null,
          stage_name: stageName,
          name: realName,
          phone: phone,
          id_type: idType,
          id_number: idNumber,
          kyc_front: frontPath,
          kyc_back: backPath,
          kyc_selfie: selfiePath
        });

      if (dbError) throw dbError;
      
      // Clear persistence and go to dashboard
      localStorage.removeItem('onboarding_stageName');
      localStorage.removeItem('onboarding_realName');
      localStorage.removeItem('onboarding_phone');
      localStorage.removeItem('onboarding_idType');
      localStorage.removeItem('onboarding_idNumber');
      
      toast.success('Demande envoyée pour validation !');
      window.location.href = '/artist-dashboard';
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue lors de l\'envoi de la demande.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'auth') {
    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-12 justify-center font-sans">
        <div className="flex flex-col items-center flex-1 mt-8 relative">
          <div className="w-24 h-24 mb-4">
            <img src="/logo.png" alt="AdjaStream Logo" className="w-full h-full object-contain" onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=96&q=80";
              (e.target as HTMLImageElement).className = "w-full h-full object-cover rounded-2xl";
            }} />
          </div>
          
          <h1 className="text-2xl font-bold tracking-wider mb-8">AdjaStream</h1>

          <h2 className="text-4xl font-bold text-center leading-tight mb-4">
            {isLogin ? 'Bon retour !' : 'Créer un compte'}
          </h2>
          
          <p className="text-center text-adja-cream/80 text-sm mb-12 max-w-[280px]">
            {isLogin ? 'Connecte-toi pour retrouver ta musique.' : 'Accédez à toute la musique Hadja & au-delà.'}
          </p>

          <div className="w-full max-w-sm mb-4">
            <div className="flex items-center border border-adja-cream/30 rounded-xl px-4 py-3 bg-transparent">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse e-mail" 
                className="bg-transparent border-none outline-none text-adja-cream placeholder-adja-cream/50 flex-1 w-full"
              />
            </div>
          </div>

          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center border border-adja-cream/30 rounded-xl px-4 py-3 bg-transparent">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe" 
                className="bg-transparent border-none outline-none text-adja-cream placeholder-adja-cream/50 flex-1 w-full"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="w-full max-w-sm mb-6">
              <div className="flex items-center border border-adja-cream/30 rounded-xl px-4 py-3 bg-transparent">
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Code de parrainage (Optionnel)" 
                  className="bg-transparent border-none outline-none text-adja-cream placeholder-adja-cream/50 flex-1 w-full"
                />
              </div>
            </div>
          )}

          <button 
            onClick={onEmailSubmit}
            disabled={loading}
            className="w-full max-w-sm bg-adja-yellow text-adja-dark font-semibold py-4 rounded-xl mb-6 hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
          </button>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-adja-cream/80 text-sm hover:text-white transition-colors mb-6 text-center w-full max-w-sm block"
          >
            {isLogin ? "Pas de compte ? S'inscrire" : "Déjà membre ? Se connecter"}
          </button>

          <div className="relative flex items-center justify-center w-full max-w-sm mb-6">
            <div className="border-t border-adja-cream/30 w-full"></div>
            <span className="bg-adja-green px-3 text-adja-cream/50 text-xs absolute uppercase font-medium">Ou</span>
          </div>

          <button 
            onClick={onGoogleSignIn}
            className="w-full max-w-sm bg-white text-gray-900 font-semibold py-3 rounded-xl mb-6 hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              <path fill="none" d="M1 1h22v22H1z"/>
            </svg>
            Continuer avec Google
          </button>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 pt-16 pb-12 font-sans">
        <h1 className="text-3xl font-bold text-center mb-2">Bienvenue sur AdjaStream.</h1>
        <h2 className="text-xl text-center text-adja-cream/70 mb-10">Qui êtes-vous ?</h2>

        <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
          <button 
            onClick={() => selectRoleAndProceed('auditeur')}
            className="flex flex-col items-center p-8 bg-adja-light-green border border-adja-cream/20 rounded-2xl hover:border-adja-yellow hover:bg-adja-light-green/80 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-adja-dark flex items-center justify-center text-adja-yellow mb-4 group-hover:scale-110 transition-transform">
              <Headphones size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Auditeur</h3>
            <p className="text-sm text-adja-cream/70 text-center">Explorer et vibrer au rythme de la musique Hadja.</p>
          </button>

          <button 
            onClick={() => selectRoleAndProceed('artiste')}
            className="flex flex-col items-center p-8 bg-adja-light-green border border-adja-cream/20 rounded-2xl hover:border-adja-yellow hover:bg-adja-light-green/80 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-adja-dark flex items-center justify-center text-adja-yellow mb-4 group-hover:scale-110 transition-transform">
              <Mic size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Artiste / Producteur</h3>
            <p className="text-sm text-adja-cream/70 text-center">Partager votre art, gérer votre catalogue et vos revenus.</p>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'auditeur_prefs') {
    const toggleGenre = (g: string) => {
      setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    };

    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-12 font-sans">
        <h2 className="text-2xl font-bold mb-2 pt-6">Vos préférences</h2>
        <p className="text-adja-cream/70 text-sm mb-8">Quels sont vos genres musicaux favoris ?</p>

        <div className="flex flex-wrap gap-3 mb-auto">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`px-5 py-3 rounded-full text-sm font-medium transition-colors border ${
                selectedGenres.includes(genre)
                  ? 'bg-adja-yellow text-adja-dark border-adja-yellow'
                  : 'bg-transparent text-adja-cream border-adja-cream/30 hover:border-adja-cream'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <button 
          onClick={completeAuditeur}
          disabled={loading}
          className="w-full mt-10 bg-adja-yellow text-adja-dark font-semibold py-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Finalisation...' : 'Commencer à écouter'}
        </button>
      </div>
    );
  }

  if (step === 'artiste_info') {
    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-12 font-sans">
        <h2 className="text-2xl font-bold mb-2 pt-6">Profil Artiste</h2>
        <p className="text-adja-cream/70 text-sm mb-8">Étape 1/2 : Vos informations et Identification</p>

        <div className="space-y-4 mb-auto max-w-sm w-full mx-auto">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Nom de scène</label>
            <input 
              type="text" value={stageName} onChange={e => setStageName(e.target.value)}
              className="w-full bg-adja-cream text-adja-dark rounded-xl px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Nom complet (Légal)</label>
            <input 
              type="text" value={realName} onChange={e => setRealName(e.target.value)}
              className="w-full bg-adja-cream text-adja-dark rounded-xl px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Numéro de téléphone</label>
            <input 
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-adja-cream text-adja-dark rounded-xl px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Type de pièce d'identité</label>
            <select
              value={idType} onChange={e => setIdType(e.target.value)}
              className="w-full bg-adja-cream text-adja-dark rounded-xl px-4 py-3 outline-none"
            >
              <option value="cni">Carte Nationale d'Identité</option>
              <option value="passport">Passeport</option>
              <option value="cip">CIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Numéro de la pièce</label>
            <input 
              type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)}
              className="w-full bg-adja-cream text-adja-dark rounded-xl px-4 py-3 outline-none"
            />
          </div>
        </div>

        <button 
          onClick={proceedToConsent}
          className="w-full max-w-sm mx-auto mt-10 bg-adja-yellow text-adja-dark font-semibold py-4 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          Continuer
        </button>
      </div>
    );
  }

  if (step === 'artiste_consent') {
    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-12 font-sans overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2 pt-6">Consentement</h2>
        <p className="text-adja-cream/70 text-sm mb-8">Étape 2/3 : Termes et Partage des Données</p>

        <div className="bg-adja-light-green/30 p-6 rounded-2xl mb-8 flex-1 overflow-y-auto border border-adja-cream/10">
          <h3 className="text-lg font-bold text-adja-yellow mb-4">Conditions d'utilisation pour les Artistes</h3>
          
          <div className="space-y-4 text-sm text-adja-cream/80 leading-relaxed">
            <p>
              En tant qu'artiste sur <strong>AdjaStream</strong>, vous acceptez les conditions suivantes :
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Partage des données et des sons :</strong> Vous autorisez AdjaStream à héberger, diffuser et promouvoir vos œuvres musicales sur la plateforme.
              </li>
              <li>
                <strong>Droits d'auteur :</strong> Vous certifiez être le propriétaire légal ou posséder les droits d'exploitation des œuvres que vous publiez.
              </li>
              <li>
                <strong>Monétisation :</strong> Les calculs de vos revenus sont basés sur nos statistiques d'écoutes internes, soumises à vérification contre la fraude.
              </li>
              <li>
                <strong>Vérification KYC :</strong> Vos données d'identification (pièce d'identité, selfie) sont collectées uniquement à des fins de vérification légale et resteront strictement confidentielles.
              </li>
            </ul>
            <p className="mt-4 italic">
              Cette confirmation tient lieu d'accord légal et contractuel entre l'artiste et AdjaStream.
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <button 
            onClick={completeConsent}
            className="w-full bg-adja-yellow text-adja-dark font-semibold py-4 rounded-xl hover:bg-yellow-400 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            J'ai lu et j'accepte les conditions
          </button>
          
          <button 
            onClick={() => setStep('artiste_info')}
            className="w-full mt-4 text-adja-cream/70 hover:text-white transition-colors py-2 text-sm"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (step === 'artiste_kyc') {
    return (
      <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-12 font-sans">
        <h2 className="text-2xl font-bold mb-2 pt-6">Documents KYC</h2>
        <p className="text-adja-cream/70 text-sm mb-8">Étape 3/3 : Téléchargez vos documents pour valider votre compte Artiste.</p>

        <div className="mb-auto max-w-sm w-full mx-auto space-y-4">
          
          {/* Recto */}
          <div 
            onClick={() => idFrontRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 flex items-center gap-4 cursor-pointer transition-colors ${
              idFront ? 'border-adja-yellow bg-adja-yellow/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-adja-dark/30 flex items-center justify-center shrink-0 overflow-hidden">
              {idFront ? (
                <img src={URL.createObjectURL(idFront)} alt="Recto preview" className="w-full h-full object-cover" />
              ) : (
                <UploadCloud className="w-6 h-6 opacity-50" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block font-medium text-sm mb-1 truncate">{idFront ? idFront.name : "Pièce d'identité (Recto)"}</span>
              <span className="text-xs opacity-60">{idFront ? "Cliquez pour modifier" : "Format image recommandé"}</span>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={idFrontRef} onChange={(e) => e.target.files && setIdFront(e.target.files[0])} />
          </div>

          {/* Verso */}
          <div 
            onClick={() => idBackRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 flex items-center gap-4 cursor-pointer transition-colors ${
              idBack ? 'border-adja-yellow bg-adja-yellow/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-adja-dark/30 flex items-center justify-center shrink-0 overflow-hidden">
              {idBack ? (
                <img src={URL.createObjectURL(idBack)} alt="Verso preview" className="w-full h-full object-cover" />
              ) : (
                <UploadCloud className="w-6 h-6 opacity-50" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block font-medium text-sm mb-1 truncate">{idBack ? idBack.name : "Pièce d'identité (Verso)"}</span>
              <span className="text-xs opacity-60">{idBack ? "Cliquez pour modifier" : "Format image recommandé"}</span>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={idBackRef} onChange={(e) => e.target.files && setIdBack(e.target.files[0])} />
          </div>

          {/* Selfie */}
          <div 
            onClick={() => idSelfieRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 flex items-center gap-4 cursor-pointer transition-colors ${
              idSelfie ? 'border-adja-yellow bg-adja-yellow/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-adja-dark/30 flex items-center justify-center shrink-0 overflow-hidden">
              {idSelfie ? (
                <img src={URL.createObjectURL(idSelfie)} alt="Selfie preview" className="w-full h-full object-cover" />
              ) : (
                <UploadCloud className="w-6 h-6 opacity-50" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block font-medium text-sm mb-1 truncate">{idSelfie ? idSelfie.name : "Selfie avec la pièce"}</span>
              <span className="text-xs opacity-60">{idSelfie ? "Cliquez pour modifier" : "Sous le menton"}</span>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={idSelfieRef} onChange={(e) => e.target.files && setIdSelfie(e.target.files[0])} />
          </div>

        </div>

        <button 
          onClick={completeArtiste}
          disabled={loading || !idFront || !idBack || !idSelfie}
          className="w-full max-w-sm mx-auto mt-10 bg-adja-yellow text-adja-dark font-semibold py-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Envoi en cours...' : 'Soumettre ma demande'}
        </button>
      </div>
    );
  }

  return null;
}

