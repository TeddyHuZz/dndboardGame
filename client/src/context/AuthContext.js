import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This single listener handles initial session, login, and logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (session) {
          try {
            // Fetch profile only when a session exists
            const { data, error } = await supabase
              .from('user')
              .select('username', 'user_id')
              .eq('user_id', session.user.id)
              .single();

            if (error) {
              console.error('Error fetching user profile:', error);
              setProfile(null);
            } else if (data) {
              setProfile(data);
            }
          } catch (error) {
            console.error("An unexpected error occurred while fetching profile:", error);
            setProfile(null);
          }
        } else {
          // User is logged out, so clear the profile
          setProfile(null);
        }
        
        // Loading is finished after the first check
        setLoading(false);
      }
    );

    // Cleanup the subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty array ensures this runs only once

  const value = {
    session,
    profile,
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};