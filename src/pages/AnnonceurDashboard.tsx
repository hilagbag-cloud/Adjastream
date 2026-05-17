import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, BarChart3, Megaphone, Play } from 'lucide-react';

export default function AnnonceurDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'new_campaign'>('campaigns');

  useEffect(() => {
    // Fetch campaigns logic here
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-adja-green text-adja-cream px-6 py-10 font-sans pb-28">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Espace Annonceur</h1>
          <p className="text-adja-cream/70 text-sm">Gérez vos campagnes publicitaires</p>
        </div>
      </div>

      <div className="flex space-x-2 bg-adja-dark/40 p-1 rounded-xl mb-6 border border-adja-light-green overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('campaigns')} 
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-purple-600 text-white shadow-lg' : 'text-adja-cream/60 hover:text-white hover:bg-adja-light-green'}`}
        >
          <Megaphone size={18} /> Campagnes
        </button>
        <button 
          onClick={() => setActiveTab('new_campaign')} 
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'new_campaign' ? 'bg-purple-600 text-white shadow-lg' : 'text-adja-cream/60 hover:text-white hover:bg-adja-light-green'}`}
        >
          <Plus size={18} /> Nouvelle
        </button>
      </div>

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="bg-adja-light-green/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
             <BarChart3 size={40} className="text-purple-400 mb-4 opacity-70" />
             <p className="text-adja-cream/70 text-sm">Vous n'avez pas encore de campagne active.</p>
             <button onClick={() => setActiveTab('new_campaign')} className="mt-4 bg-purple-600 text-white font-bold py-2 px-6 rounded-full inline-flex items-center gap-2">
                 <Plus size={16} /> Créer une campagne
             </button>
          </div>
        </div>
      )}

      {activeTab === 'new_campaign' && (
        <div className="bg-adja-light-green/20 p-6 rounded-2xl border border-purple-500/30">
          <h2 className="text-xl font-bold mb-4">Créer une Campagne</h2>
          <div className="mb-8 p-4 bg-purple-500/10 rounded-xl text-sm border-l-4 border-purple-500 text-purple-200">
             Vos publicités seront intégrées (audio/visuel) dans l'expérience des auditeurs AdjaStream.
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-adja-cream/70">Nom de la campagne</label>
              <input type="text" placeholder="Ex: Promo Été 2026" className="w-full bg-adja-dark text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
            </div>
            
            <button 
               onClick={() => toast.success("Creation de campagne sera bientot disponible")}
               className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-500 mt-6 flex justify-center items-center gap-2"
            >
               <Play size={18} /> Lancer la campagne
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
