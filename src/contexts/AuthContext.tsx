import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'admin' | 'partner' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  profile: any | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isManualSignOutRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' && !isManualSignOutRef.current) {
          // Only show toast if we had a session before (forced sign out)
          if (sessionIdRef.current) {
            toast.error('Your session was terminated because this account logged in on another device.');
            sessionIdRef.current = null;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setProfile(null);
          setLoading(false);
          // Cleanup realtime channel when signed out
          if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
            realtimeChannelRef.current = null;
          }
        }

        // Reset manual sign out flag
        if (event === 'SIGNED_OUT') {
          isManualSignOutRef.current = false;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setupRealtimeSessionWatch = (userId: string, currentSessionId: string) => {
    // Remove any existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`session-watch:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newSessionId = (payload.new as any).active_session_id;
          // If the session ID changed and it's not ours, force sign out
          if (newSessionId && newSessionId !== currentSessionId) {
            sessionIdRef.current = currentSessionId; // Keep ref so toast shows
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const fetchUserData = async (userId: string) => {
    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      ]);

      if (roleResult.data) {
        setUserRole(roleResult.data.role as UserRole);
      }
      if (profileResult.data) {
        setProfile(profileResult.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data?.session && data?.user) {
      // Generate a unique session ID for this login
      const newSessionId = crypto.randomUUID();
      sessionIdRef.current = newSessionId;

      // Write the new session ID to the profile — this triggers realtime on other devices
      await supabase
        .from('profiles')
        .update({ active_session_id: newSessionId } as any)
        .eq('id', data.user.id);

      // Start watching for session changes on this device
      setupRealtimeSessionWatch(data.user.id, newSessionId);
    }
    
    return { error };
  };

  const signOut = async () => {
    isManualSignOutRef.current = true;
    sessionIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, profile, signUp, signIn, signOut }}>
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
