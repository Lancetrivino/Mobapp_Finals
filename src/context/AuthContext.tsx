import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types/index';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: fetch profile row, return null (don't throw) if missing
  const fetchProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) return null;
      return profile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) setUser(profile);
          // If no profile yet (e.g. email not confirmed / trigger not run), stay logged out
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only set user on actual sign-in events, not on every state change
        if (event === 'SIGNED_IN' && session?.user) {
          // The DB trigger may take a moment — retry a couple of times
          let profile: User | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            profile = await fetchProfile(session.user.id);
            if (profile) break;
            // Wait 500ms before retrying (trigger might be slow)
            await new Promise(res => setTimeout(res, 500));
          }
          if (profile) setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Surface the real Supabase error message (e.g. "Invalid login credentials")
      throw new Error(signInError.message);
    }

    if (!sessionData.user) {
      throw new Error('Login successful, but no user session returned.');
    }

    // Fetch profile — retry in case the trigger is slightly delayed
    let profile: User | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      profile = await fetchProfile(sessionData.user.id);
      if (profile) break;
      await new Promise(res => setTimeout(res, 500));
    }

    if (!profile) {
      await supabase.auth.signOut();
      throw new Error(
        'Your account was found but no profile exists. ' +
        'This usually means the database trigger did not run. ' +
        'Please contact support or re-register.'
      );
    }

    setUser(profile);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    // setUser(null) handled by onAuthStateChange SIGNED_OUT
  };

  const register = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // passed to raw_user_meta_data for the DB trigger
      },
    });

    if (error) throw new Error(error.message);

    // If Supabase email confirmation is DISABLED, a session is returned immediately
    // and the auth listener will handle setting the user.
    // If email confirmation is ENABLED, data.session will be null — the user
    // must confirm their email before they can log in.
    if (!data.session) {
      // Let the caller know confirmation is needed
      throw new Error('CONFIRM_EMAIL');
    }
  };

  const updateAvatar = async (uri: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ avatar_url: uri })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
    setUser({ ...user, avatar_url: uri });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};