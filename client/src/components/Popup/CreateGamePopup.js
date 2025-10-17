import { useEffect, useRef } from "react";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./CreateGamePopup.css";

function CreateGamePopup({ onClose }) {
  const { sessionDetails, setSessionDetails, players, setPlayers } = useRoomSession();
  const { profile, session } = useAuth();
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  // Determine if current user is the host
  const isHost = sessionDetails?.user_id === session?.user?.id;

  // Get the actual host from players list
  const actualHost = players.find(p => p.user_id === sessionDetails?.user_id);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Fetch players from database on mount
  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("room_players")
        .select(`
          user_id,
          user:user_id (username, user_id)
        `)
        .eq("session_id", sessionDetails.session_id);

      if (error) {
        console.error("Error fetching players:", error);
        return;
      }

      const playersList = data.map(p => ({
        user_id: p.user.user_id,
        username: p.user.username
      }));

      setPlayers(playersList);
    };

    fetchPlayers();
  }, [sessionDetails?.session_id, setPlayers]);

  // Real-time subscription to listen for player changes
  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const playersChannel = supabase
      .channel(`room_players:${sessionDetails.session_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_players',
          filter: `session_id=eq.${sessionDetails.session_id}`
        },
        async (payload) => {
          console.log('Player joined:', payload);
          
          // Refetch all players when someone joins
          const { data, error } = await supabase
            .from("room_players")
            .select(`
              user_id,
              user:user_id (username, user_id)
            `)
            .eq("session_id", sessionDetails.session_id);

          if (!error && data) {
            const playersList = data.map(p => ({
              user_id: p.user.user_id,
              username: p.user.username
            }));
            setPlayers(playersList);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_players',
          filter: `session_id=eq.${sessionDetails.session_id}`
        },
        (payload) => {
          console.log('Player left:', payload);
          
          // Remove player from local state immediately
          const deletedUserId = payload.old.user_id;
          setPlayers(prevPlayers => 
            prevPlayers.filter(p => p.user_id !== deletedUserId)
          );
        }
      )
      .subscribe((status) => {
        console.log('Players subscription status:', status);
      });

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [sessionDetails?.session_id, setPlayers]);

  // Polling fallback - refetch players every 2 seconds
  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const intervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from("room_players")
        .select(`
          user_id,
          user:user_id (username, user_id)
        `)
        .eq("session_id", sessionDetails.session_id);

      if (!error && data) {
        const playersList = data.map(p => ({
          user_id: p.user.user_id,
          username: p.user.username
        }));
        
        // Only update if the list actually changed
        setPlayers(prevPlayers => {
          const prevIds = prevPlayers.map(p => p.user_id).sort().join(',');
          const newIds = playersList.map(p => p.user_id).sort().join(',');
          
          if (prevIds !== newIds) {
            console.log('Players list updated via polling');
            return playersList;
          }
          return prevPlayers;
        });
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(intervalId);
  }, [sessionDetails?.session_id, setPlayers]);

  // Real-time subscription to listen for room session changes (host transfer)
  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const sessionChannel = supabase
      .channel(`room_session:${sessionDetails.session_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_sessions',
          filter: `session_id=eq.${sessionDetails.session_id}`
        },
        (payload) => {
          console.log('Room session updated:', payload);
          const newStatus = payload.new.session_status;

          // Update session details (including new host)
          setSessionDetails(payload.new);
          
          // If room is closed, exit
          if (newStatus === 'Closed') {
            alert('The room has been closed.');
            setSessionDetails(null);
            setPlayers([]);
            onClose();
          }

          // If game status changes to 'In game', navigate all players
          if (newStatus === 'In game') {
            navigate('/character-selection');
          }
        }
      )
      .subscribe((status) => {
        console.log('Room session subscription status:', status);
      });

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionDetails?.session_id, setSessionDetails, onClose, navigate]);

  const handleCopy = () => {
    if (sessionDetails?.session_code) {
      navigator.clipboard.writeText(sessionDetails.session_code)
        .then(() => alert("Session ID copied to clipboard!"))
        .catch(err => console.error("Failed to copy text: ", err));
    }
  };

  const handleExitRoom = async () => {
    if (!sessionDetails?.session_id || !profile?.user_id) {
      // Just close UI if no session
      setSessionDetails(null);
      setPlayers([]);
      onClose();
      return;
    }

    try {
      // Remove current player from room_players table
      await supabase
        .from("room_players")
        .delete()
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      // Check if current user is the host
      if (isHost) {
        // Get remaining players
        const { data: remainingPlayers, error: playersError } = await supabase
          .from("room_players")
          .select("user_id, joined_at")
          .eq("session_id", sessionDetails.session_id)
          .order("joined_at", { ascending: true });

        if (playersError) throw playersError;

        if (remainingPlayers && remainingPlayers.length > 0) {
          // Transfer host to the first remaining player (earliest joiner)
          const newHostId = remainingPlayers[0].user_id;
          
          await supabase
            .from("room_sessions")
            .update({ 
              user_id: newHostId  // Transfer host
            })
            .eq('session_id', sessionDetails.session_id);

          console.log(`✅ Host transferred to user: ${newHostId}`);
        } else {
          // No players left, close the room
          await supabase
            .from("room_sessions")
            .update({ session_status: 'Closed' })
            .eq('session_id', sessionDetails.session_id);
          
          console.log('✅ Room closed - no players remaining');
        }
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }

    // Close UI
    setSessionDetails(null);
    setPlayers([]);
    onClose();
  };

  const handleStartGame = async () => {
    // Ensure only the host can start the game
    if (!isHost || !sessionDetails?.session_id) {
      console.log("Only the host can start the game.");
      return;
    }

    try {
      // This database update will be detected by all clients, triggering their navigation
      await supabase
        .from("room_sessions")
        .update({ session_status: 'In game'})
        .eq("session_id", sessionDetails.session_id);

      console.log("Game start signal sent successfully.");
    } catch (error) {
      console.error("Error starting game", error);
      alert("Only the host can start the gane!");
    }
  }
    
  return (
    <div className="create-game-popup-overlay" onClick={handleExitRoom}>
      <div className="create-game-popup-content" onClick={e => e.stopPropagation()}>
        <div className="create-game-top-menu">
          <span>Current Players: {players.length} / {sessionDetails?.max_players || 4}</span>
          <div className="create-game-top-menu-session-id">
            <span>Session ID: {sessionDetails?.session_code}</span>
            <button onClick={handleCopy}>Copy</button>
          </div>
        </div>

        <div className="create-game-middle-content">
          <h2>{actualHost?.username || 'Unknown'}'s Room</h2>
          <span>Current Users in the Room: </span>
          <ul>
            {players.map((player) => (
              <li key={player.user_id}>
                {player.username} {player.user_id === sessionDetails?.user_id ? '(Host)' : ''}
              </li>
            ))}
          </ul>
        </div>

        <div className="create-game-bottom-menu">
          <button onClick={handleExitRoom}>Exit</button>
          <button onClick={handleStartGame}>Start Game</button>
        </div>
      </div>
    </div>
  );
}

export default CreateGamePopup;