import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`-> Auth event received: ${event}`);
        
        const currentSession = sessionRef.current;
        if (event === 'SIGNED_IN' && currentSession?.user?.id === newSession?.user?.id) {
          console.log('-> Redundant event for same user. Ignoring to prevent freeze.');
          setLoading(false);
          return;
        }

        console.log('-> Processing auth state change.');
        setSession(newSession);

        if (newSession) {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );
            
            const fetchPromise = supabase
              .from('user')
              .select('username, user_id')
              .eq('user_id', newSession.user.id)
              .single();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) throw error;
            setProfile(data);

          } catch (error) {
            console.error('Error fetching user profile:', error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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