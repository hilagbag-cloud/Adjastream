import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousWallet, setPreviousWallet] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let userSubscription: any = null;

    const fetchProfile = async (sessionUser: User | null) => {
      if (!sessionUser) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (error) throw error;
        if (mounted) {
           setProfile(data);
           if (previousWallet === null) setPreviousWallet(data.wallet_fcfa || 0);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const subscribeToProfile = async (userId: string) => {
      if (userSubscription) {
         supabase.removeChannel(userSubscription);
      }
      userSubscription = supabase
        .channel(`public:users:id=eq.${userId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          (payload) => {
             if (mounted) {
                setProfile(payload.new);
                const newWallet = payload.new.wallet_fcfa || 0;
                setPreviousWallet((prevWallet) => {
                  if (prevWallet !== null && newWallet > prevWallet) {
                    const diff = newWallet - prevWallet;
                    import('react-hot-toast').then(mod => {
                      mod.toast.success(`Votre solde a été crédité de ${diff} FCFA !`, {
                        icon: '💰',
                        duration: 5000,
                      });
                    });
                  }
                  return newWallet;
                });
             }
          }
        )
        .subscribe();
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('getSession error:', error);
      }
      const currentUser = session?.user ?? null;
      if (mounted) setUser(currentUser);
      fetchProfile(currentUser);
      if (currentUser) subscribeToProfile(currentUser.id);
    }).catch(err => {
      console.error('getSession exception:', err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (mounted) setUser(currentUser);
      fetchProfile(currentUser);
      if (currentUser) subscribeToProfile(currentUser.id);
      else if (userSubscription) supabase.removeChannel(userSubscription);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (userSubscription) supabase.removeChannel(userSubscription);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
