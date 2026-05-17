-- Table `users` (Profils utilisateurs et artistes)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'auditeur',
  name TEXT,
  stage_name TEXT,
  phone TEXT,
  id_type TEXT,
  id_number TEXT,
  genres JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Si la table existe déjà, ajoutons les colonnes manquantes au cas où :
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'auditeur';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferences JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_front TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_back TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_selfie TEXT;

-- Création d'un trigger pour s'assurer qu'un utilisateur est toujours présent dans public.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger existe (supprime puis recrée)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Activation de RLS (Row Level Security) sur `users`
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les profils sont publics."
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Chacun peut modifier son profil."
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Chacun peut créer son profil."
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Table `tracks` (Sons / Morceaux)
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT,
  audio_url TEXT,
  image_url TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation de RLS sur `tracks`
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les pistes sont publiques."
  ON public.tracks FOR SELECT
  USING (true);

CREATE POLICY "Les artistes créent leurs pistes."
  ON public.tracks FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Les artistes modifient leurs pistes."
  ON public.tracks FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Les artistes suppriment leurs pistes."
  ON public.tracks FOR DELETE
  USING (auth.uid() = uploaded_by);

-- N'oubliez pas également de créer les buckets de stockage Supabase si ce n'est pas fait :
-- Bucket pour les audios : "tracks" (Public)
-- Bucket pour les images : "track_covers" (Public)
-- Bucket pour les KYCs : "kyc_documents" (Privé ou Public selon votre politique)
