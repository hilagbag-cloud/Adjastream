import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, UploadCloud, Building2, Briefcase, FileText } from 'lucide-react';

export default function AnnonceurKyc() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  
  const [companyName, setCompanyName] = useState('');
  const [profession, setProfession] = useState('');
  const [objectives, setObjectives] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idSelfie, setIdSelfie] = useState<File | null>(null);

  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const idSelfieRef = useRef<HTMLInputElement>(null);

  const submitApplication = async () => {
    if (!user) return;
    if (!companyName || !profession || !objectives || !idFront || !idBack || !idSelfie) {
      return toast.error('Veuillez remplir tous les champs et fournir les 3 pièces d\'identité (recto, verso, selfie)');
    }
    
    setLoading(true);
    try {
      const ts = Date.now();
      const frontPath = `kyc_pro/${user.id}/${ts}_front_${idFront.name}`;
      const backPath = `kyc_pro/${user.id}/${ts}_back_${idBack.name}`;
      const selfiePath = `kyc_pro/${user.id}/${ts}_selfie_${idSelfie.name}`;

      const { error: uploadFront } = await supabase.storage.from('assets').upload(frontPath, idFront);
      if (uploadFront) throw uploadFront;

      const { error: uploadBack } = await supabase.storage.from('assets').upload(backPath, idBack);
      if (uploadBack) throw uploadBack;

      const { error: uploadSelfie } = await supabase.storage.from('assets').upload(selfiePath, idSelfie);
      if (uploadSelfie) throw uploadSelfie;

      const { error: dbError } = await supabase
        .from('users')
        .update({
          is_annonceur_pending: true,
          annonceur_kyc_front: frontPath,
          annonceur_kyc_back: backPath,
          annonceur_kyc_selfie: selfiePath,
          company_name: companyName,
          profession: profession,
          objectives: objectives
        })
        .eq('id', user.id);
        
      if (dbError) throw dbError;

      toast.success('Demande envoyée avec succès !');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-10 font-sans pb-28">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-adja-cream/70 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Devenir Annonceur</h1>
      </div>

      <p className="text-adja-cream/70 text-sm mb-6">
        Remplissez ce formulaire Pro pour diffuser vos publicités sur AdjaStream.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-adja-cream/70 flex items-center gap-2"><Building2 size={16}/> Nom de l'entreprise ou Marque</label>
          <input 
            type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
            className="w-full bg-adja-light-green/30 text-white rounded-xl px-4 py-3 outline-none border border-adja-light-green focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-adja-cream/70 flex items-center gap-2"><Briefcase size={16}/> Secteur d'activité / Profession</label>
          <input 
            type="text" value={profession} onChange={e => setProfession(e.target.value)}
            className="w-full bg-adja-light-green/30 text-white rounded-xl px-4 py-3 outline-none border border-adja-light-green focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-adja-cream/70 flex items-center gap-2"><FileText size={16}/> Objectifs de la campagne</label>
          <textarea 
            value={objectives} onChange={e => setObjectives(e.target.value)} rows={3}
            className="w-full bg-adja-light-green/30 text-white rounded-xl px-4 py-3 outline-none border border-adja-light-green focus:border-purple-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Pièce d'identité (Recto)</label>
            <div 
              onClick={() => idFrontRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                idFront ? 'border-purple-500 bg-purple-500/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
              }`}
            >
              {idFront ? (
                 <img src={URL.createObjectURL(idFront)} alt="Preview" className="w-full h-24 object-contain rounded-xl" />
              ) : (
                <>
                  <UploadCloud size={24} className="opacity-50 mb-2" />
                  <span className="text-xs font-bold text-center">Recto</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" ref={idFrontRef} onChange={(e) => e.target.files && setIdFront(e.target.files[0])} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Pièce d'identité (Verso)</label>
            <div 
              onClick={() => idBackRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                idBack ? 'border-purple-500 bg-purple-500/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
              }`}
            >
              {idBack ? (
                 <img src={URL.createObjectURL(idBack)} alt="Preview" className="w-full h-24 object-contain rounded-xl" />
              ) : (
                <>
                  <UploadCloud size={24} className="opacity-50 mb-2" />
                  <span className="text-xs font-bold text-center">Verso</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" ref={idBackRef} onChange={(e) => e.target.files && setIdBack(e.target.files[0])} />
            </div>
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Selfie avec la pièce</label>
           <div 
              onClick={() => idSelfieRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                idSelfie ? 'border-purple-500 bg-purple-500/10' : 'border-adja-cream/30 hover:bg-adja-cream/5'
              }`}
            >
              {idSelfie ? (
                 <img src={URL.createObjectURL(idSelfie)} alt="Preview" className="w-full h-32 object-contain rounded-xl" />
              ) : (
                <>
                  <UploadCloud size={32} className="opacity-50 mb-2" />
                  <span className="text-sm font-bold text-center">Cliquez pour importer le selfie</span>
                  <span className="text-xs opacity-60">Format image (.jpg, .png)</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" ref={idSelfieRef} onChange={(e) => e.target.files && setIdSelfie(e.target.files[0])} />
            </div>
        </div>
      </div>

      <button 
        onClick={submitApplication}
        disabled={loading || !companyName || !profession || !objectives || !idFront}
        className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50 mt-auto"
      >
        {loading ? 'Soumission...' : 'Soumettre le dossier KYC Pro'}
      </button>
    </div>
  );
}
