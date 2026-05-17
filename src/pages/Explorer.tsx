import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const categories = [
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&q=80',
  'https://images.unsplash.com/photo-1531742416801-9276fedc9298?w=500&q=80',
  'https://images.unsplash.com/photo-1520627581045-8ce66ccfd31a?w=500&q=80',
  'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=500&q=80',
  'https://images.unsplash.com/photo-1621644723049-56cb2fbc266f?w=500&q=80',
  'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=500&q=80',
];

export default function Explorer() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dbGenres, setDbGenres] = useState<any[]>([]);

  useEffect(() => {
    const fetchGenres = async () => {
      const { data } = await supabase.from('genres').select('*').order('name');
      if (data) setDbGenres(data);
    };
    fetchGenres();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.success(`La recherche sera bientôt disponible`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 pb-28">
      <div className="flex items-center justify-center mb-8">
        <h1 className="text-xl font-semibold">Explorer</h1>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-adja-dark/50">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Chercher un artiste, titre..." 
          className="w-full bg-adja-cream text-adja-dark placeholder-adja-dark/50 rounded-full py-3.5 pl-12 pr-4 outline-none font-medium"
        />
      </form>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Catégories Populaires</h2>
        <div className="grid grid-cols-3 gap-4">
          {categories.map((img, i) => (
            <div 
              key={i} 
              onClick={() => navigate(`/playlist/cat-${i}`)}
              className="aspect-square rounded-xl overflow-hidden bg-adja-light-green cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={img} alt={`Category ${i}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Genres Musicaux</h2>
        <div className="grid grid-cols-3 gap-4">
          {dbGenres.map((genre, i) => (
            <div 
              key={genre.id} 
              onClick={() => navigate(`/genre/${encodeURIComponent(genre.name)}`)}
              className="flex flex-col gap-2 cursor-pointer group"
            >
              <div className={`aspect-square rounded-xl overflow-hidden bg-adja-light-green group-hover:scale-105 transition-transform bg-gradient-to-br ${i % 2 === 0 ? 'from-orange-500 to-red-600' : 'from-blue-500 to-purple-600'}`}>
                 <div className="w-full h-full flex items-center justify-center text-white/50 text-3xl font-black mix-blend-overlay uppercase overflow-hidden leading-none break-all">{genre.name}</div>
              </div>
              <span className="text-xs font-medium leading-tight text-center">{genre.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
