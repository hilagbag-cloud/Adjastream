import React, { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, CheckCircle2, Music, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'react-hot-toast';

export default function Upload() {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [showNewGenreInput, setShowNewGenreInput] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<{name: string}[]>([]);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      const { data } = await supabase.from('genres').select('name').order('name');
      if (data) setAvailableGenres(data);
    };
    fetchGenres();
  }, []);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
      } else {
        toast.error('Veuillez sélectionner un fichier audio valide.');
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
      } else {
        toast.error('Veuillez sélectionner une image valide.');
      }
    }
  };

  const handleUpload = async () => {
    if (!title || !audioFile) {
      toast.error('Veuillez remplir les champs obligatoires (Titre, Audio).');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté.');
      return;
    }

    setUploading(true);

    try {
      let imageUrl = 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&q=80'; // fallback
      
      // Upload image if selected
      if (imageFile) {
        const imagePath = `covers/${user.id}/${Date.now()}_${imageFile.name}`;
        const { error: imageError } = await supabase.storage
          .from('assets')
          .upload(imagePath, imageFile);
        
        if (imageError) throw imageError;
        const { data: publicImage } = supabase.storage.from('assets').getPublicUrl(imagePath);
        imageUrl = publicImage.publicUrl;
      }

      // Upload audio
      const audioPath = `audio/${user.id}/${Date.now()}_${audioFile.name}`;
      const { error: audioError } = await supabase.storage
        .from('assets')
        .upload(audioPath, audioFile);

      if (audioError) throw audioError;
      const { data: publicAudio } = supabase.storage.from('assets').getPublicUrl(audioPath);
      const audioUrl = publicAudio.publicUrl;
      
      const artistName = profile?.stage_name || profile?.name || 'Artiste Inconnu';

      const finalGenre = genre.trim() || 'Inconnu';
      
      if (finalGenre !== 'Inconnu' && !availableGenres.find(g => g.name.toLowerCase() === finalGenre.toLowerCase())) {
        await supabase.from('genres').insert({ name: finalGenre }).select();
      }

      // Save metadata
      const { error: dbError } = await supabase.from('tracks').insert({
        title,
        artist: artistName,
        genre: finalGenre,
        audio_url: audioUrl,
        image_url: imageUrl,
        uploaded_by: user.id,
        plays: 0
      });

      if (dbError) throw dbError;

      toast.success('Morceau uploadé avec succès !');
      setUploading(false);
      navigate('/library');
      
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur: ${error.message || 'Une erreur est survenue.'}`);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 bg-adja-green text-adja-cream">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Ajouter un titre</h1>
        <button onClick={() => navigate(-1)} className="p-2 -mr-2">
          <X className="w-6 h-6 opacity-70 hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-10 space-y-6">
        
        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium mb-2 opacity-80">Fichier Audio *</label>
          <div 
            onClick={() => audioInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${audioFile ? 'border-adja-yellow bg-adja-yellow/10' : 'border-adja-cream/20 hover:bg-adja-cream/5'}`}
          >
            {audioFile ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-adja-yellow mb-3" />
                <span className="text-center font-medium text-sm break-all">{audioFile.name}</span>
                <span className="text-xs opacity-60 mt-1">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <Music className="w-10 h-10 mb-3 opacity-50" />
                <span className="text-center font-medium text-sm">Appuyez pour choisir un fichier audio</span>
                <span className="text-xs opacity-60 mt-1">MP3, WAV...</span>
              </>
            )}
            <input type="file" accept="audio/*" className="hidden" ref={audioInputRef} onChange={handleAudioChange} />
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2 opacity-80">Pochette (Optionnel)</label>
          <div 
            onClick={() => imageInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 flex items-center gap-4 cursor-pointer transition-colors ${imageFile ? 'border-adja-yellow bg-adja-yellow/10' : 'border-adja-cream/20 hover:bg-adja-cream/5'}`}
          >
            <div className="w-16 h-16 rounded-xl bg-adja-dark/30 flex items-center justify-center shrink-0 overflow-hidden">
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 opacity-50" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{imageFile ? 'Changer l\'image' : 'Ajouter une image'}</span>
              {imageFile && <span className="text-xs opacity-60 break-all">{imageFile.name}</span>}
            </div>
            <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageChange} />
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Titre *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Écho de Tado" 
              className="w-full bg-adja-cream text-adja-dark rounded-xl py-3 px-4 outline-none font-medium placeholder-adja-dark/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Genre musical</label>
            {!showNewGenreInput ? (
               <div className="flex flex-col gap-2">
                 <select 
                   value={genre}
                   onChange={(e) => {
                     if (e.target.value === 'new_genre_add') {
                       setShowNewGenreInput(true);
                       setGenre('');
                     } else {
                       setGenre(e.target.value);
                     }
                   }}
                   className="w-full bg-adja-cream text-adja-dark rounded-xl py-3 px-4 outline-none font-medium placeholder-adja-dark/50"
                 >
                   <option value="" disabled>Sélectionner un genre</option>
                   {availableGenres.map(g => (
                     <option key={g.name} value={g.name}>{g.name}</option>
                   ))}
                   <option value="new_genre_add" className="font-bold border-t border-gray-400">➕ Ajouter un nouveau genre</option>
                 </select>
               </div>
            ) : (
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Saisissez un nouveau genre..." 
                    className="flex-1 bg-adja-cream text-adja-dark rounded-xl py-3 px-4 outline-none font-medium placeholder-adja-dark/50"
                  />
                  <button 
                    onClick={() => {
                       setShowNewGenreInput(false);
                       setGenre('');
                    }}
                    className="bg-red-500/20 text-red-500 px-4 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    Annuler
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-auto">
        {uploading ? (
          <div className="w-full flex justify-center py-4 text-adja-yellow">
            <span className="font-semibold animate-pulse">Mise en ligne en cours...</span>
          </div>
        ) : (
          <button 
            onClick={handleUpload}
            disabled={!audioFile || !title}
            className="w-full bg-adja-yellow text-adja-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors shadow-xl"
          >
            <UploadIcon className="w-5 h-5" />
            Mettre en ligne
          </button>
        )}
      </div>
    </div>
  );
}
