import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { AuthContextType, User } from '../types/index';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Profile fetch with retry ──────────────────────────────
async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data as User;
  } catch {
    return null;
  }
}

async function fetchProfileWithRetry(
  userId: string,
  retries = 3,
  delayMs = 500
): Promise<User | null> {
  for (let i = 0; i < retries; i++) {
    const profile = await fetchProfile(userId);
    if (profile) return profile;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Restore existing session on mount
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await fetchProfileWithRetry(session.user.id);
          if (profile && mounted) setUser(profile);
        }
      } catch (e) {
        console.error('[AuthContext] initAuth:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // 2. React to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfileWithRetry(session.user.id);
          if (mounted && profile) setUser(profile);
          if (mounted) setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refreshed silently — no need to refetch profile
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw new Error(signInError.message);
    if (!sessionData.user) throw new Error('Login successful, but no user session returned.');

    const profile = await fetchProfileWithRetry(sessionData.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error(
        'Your account was found but no profile exists. ' +
        'This usually means the database trigger did not run. ' +
        'Please contact support or re-register.'
      );
    }

    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    // setUser(null) is handled by onAuthStateChange SIGNED_OUT
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) throw new Error(error.message);

    if (!data.session) {
      // Email confirmation required
      throw new Error('CONFIRM_EMAIL');
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'name'>>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });

    const currentUser = await supabase.auth.getUser();
    const userId = currentUser.data.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      // Rollback optimistic update
      const profile = await fetchProfile(userId);
      if (profile) setUser(profile);
      throw new Error(error.message);
    }
  }, []);

  const updateAvatar = useCallback(async (uri: string) => {
    const currentUser = await supabase.auth.getUser();
    const userId = currentUser.data.user?.id;
    if (!userId) return;

    let finalUri = uri;

    if (uri && !uri.startsWith('http')) {
      const data = new FormData();
      data.append('upload_preset', 'user_avatar');
      data.append('cloud_name', 'dykaegsup');

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        data.append('file', blob);
      } else {
        const filename = uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        data.append('file', { uri, name: filename, type } as any);
      }

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dykaegsup/image/upload',
        { method: 'POST', body: data, headers: { Accept: 'application/json' } }
      );
      const result = await response.json();
      if (result.secure_url) {
        finalUri = result.secure_url;
      } else {
        throw new Error(result.error?.message || 'Cloudinary upload failed');
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ avatar_url: finalUri })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    setUser((prev) => (prev ? { ...prev, avatar_url: finalUri } : prev));
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateAvatar,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};