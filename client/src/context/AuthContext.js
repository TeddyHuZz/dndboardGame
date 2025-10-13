import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Start in a loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an active session when the component mounts
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      // 2. If a session exists, fetch the user's profile
      if (session) {
        try {
          const { data, error } = await supabase
            .from('user')
            .select('username')
            .eq('user_id', session.user.id)
            .single();

          if (error) throw error;
          if (data) setProfile(data);

        } catch (error) {
          console.error('Error fetching profile on initial load:', error);
        }
      }
      // 3. Once everything is checked, set loading to false
      setLoading(false);
    });

    // 4. Set up a listener for future auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // If the user logs out, clear their profile
        if (!session) {
          setProfile(null);
        }
      }
    );

    // 5. Clean up the listener when the component unmounts
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // The empty array ensures this effect runs only once

  const value = {
    session,
    profile,
    signOut: () => supabase.auth.signOut(),
  };

  // Render children only after the initial loading check is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};