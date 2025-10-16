import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use a ref to track the current session to avoid stale closures in the listener
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    // Supabase fires an initial event 'INITIAL_SESSION' or 'SIGNED_IN' on page load.
    // We listen for all auth events here.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`-> Auth event received: ${event}`);
        
        // ** THE CRITICAL FIX IS HERE **
        // If we get a SIGNED_IN event, but we already have a session for the same user,
        // then it's a redundant event from a tab focus. We can safely ignore it.
        const currentSession = sessionRef.current;
        if (event === 'SIGNED_IN' && currentSession?.user?.id === newSession?.user?.id) {
          console.log('-> Redundant event for same user. Ignoring to prevent freeze.');
          setLoading(false); // Ensure app is usable
          return;
        }

        console.log('-> Processing auth state change.');
        setSession(newSession);

        if (newSession) {
          try {
            const { data, error } = await supabase
              .from('user')
              .select('username, user_id')
              .eq('user_id', newSession.user.id)
              .single();

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

    // Cleanup the subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Run this effect only once on mount

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