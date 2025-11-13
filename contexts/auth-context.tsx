import { supabase } from '@/utils/supabase';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  uid: string;
  email: string | null;
  user_name?: string | null;
  language?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = async (userId: string, email: string | null) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_name, language')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return { uid: userId, email, user_name: null, language: null };
      }

      return {
        uid: userId,
        email,
        user_name: profile?.user_name || null,
        language: profile?.language || null,
      };
    } catch (err) {
      console.error('Exception loading profile:', err);
      return { uid: userId, email, user_name: null, language: null };
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await loadUserProfile(session.user.id, session.user.email ?? null);
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = await loadUserProfile(session.user.id, session.user.email ?? null);
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'earthsmell://reset-password',
    });
    
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signOut: signOutUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
