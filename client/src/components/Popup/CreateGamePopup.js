import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import "./CreateGamePopup.css";

function CreateGamePopup({ onClose }) {
  // Data comes directly from the context, not from props
  const { sessionDetails, setSessionDetails, players, setPlayers } = useRoomSession();
  const { profile: hostProfile } = useAuth();

  const handleCopy = () => {
    if (sessionDetails?.session_code) {
      navigator.clipboard.writeText(sessionDetails.session_code)
        .then(() => alert("Session ID copied to clipboard!"))
        .catch(err => console.error("Failed to copy text: ", err));
    }
  };

  const handleExitRoom = async () => {
    if (!sessionDetails?.session_id) {
      console.error("No session ID found, cannot close room.");
      onClose(); // Still close the popup to avoid getting stuck
      return;
    }

    try {
        const { error } = await supabase
          .from("room_sessions")
          .update({ session_status: 'Closed' })
          .eq('session_id', sessionDetails.session_id);
  
        if (error) throw error; // If Supabase returns an error, throw it to the catch block
  
      } catch (error) {
        console.error("Error closing room:", error);
        alert("There was an issue closing the room.");
      } finally {
        setSessionDetails(null);
        setPlayers([]);
        onClose();
      }
    };
    
  return (
    <div className="create-game-popup-overlay">
      <div className="create-game-popup-content" onClick={e => e.stopPropagation()}>
        <div className="create-game-top-menu">
          <span>Current Players: {players.length} / {sessionDetails?.max_players || 4}</span>
          <div className="create-game-top-menu-session-id"> {/* Using session-info class as suggested before */}
            <span>Session ID: {sessionDetails?.session_code}</span>
            <button onClick={handleCopy}>Copy</button>
          </div>
        </div>

        <div className="create-game-middle-content">
          <h2>{hostProfile?.username}'s Room</h2>
          <span>Current Users in the Room: </span>
          <ul>
            {/* Using player.id for the key is more reliable than username */}
            {players.map((player) => (
              <li key={player.user_id}>{player.username} (Host)</li>
            ))}
          </ul>
        </div>

        <div className="create-game-bottom-menu">
          <button onClick={handleExitRoom}>Exit</button>
          <button>Start Game</button>
        </div>
      </div>
    </div>
  );
}

export default CreateGamePopup;