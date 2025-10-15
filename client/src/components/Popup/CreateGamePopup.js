import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // 1. Import supabase
import "./CreateGamePopup.css";

function CreateGamePopup({ onClose, sessionDetails, hostProfile }) {
  const [players, setPlayers] = useState(hostProfile ? [hostProfile] : []);

  useEffect(() => {
    if (hostProfile) {
      setPlayers([hostProfile]);
    }
  }, [hostProfile]);

  const handleCopy = () => {
    if (sessionDetails?.session_code) {
      navigator.clipboard.writeText(sessionDetails.session_code)
        .then(() => alert("Session ID copied to clipboard!"))
        .catch(err => console.error("Failed to copy text: ", err));
    }
  };

  // 2. Create the handler function for exiting the room
  const handleExitRoom = async () => {
    if (!sessionDetails?.session_id) {
      console.error("No session ID found, cannot close room.");
      onClose(); // Close popup to prevent being stuck
      return;
    }

    const { error } = await supabase
      .from("room_sessions")
      .update({ session_status: 'Closed' }) // Set status to 'Closed'
      .eq('session_id', sessionDetails.session_id);

    if (error) {
      console.error("Error closing room:", error);
      alert("There was an issue closing the room.");
    }

    // Call the original onClose function to hide the popup
    onClose();
  };

  return (
    <div className="create-game-popup-overlay">
      <div className="create-game-popup-content" onClick={e => e.stopPropagation()}>
        {/* ... existing top menu and middle content ... */}
        <div className="create-game-top-menu">
          <span>Current Players: {players.length} / {sessionDetails?.max_players || 4}</span>
          <div className="create-game-top-menu-session-id">
            <span>Session ID: {sessionDetails?.session_code}</span>
            <button onClick={handleCopy}>Copy</button>
          </div>
        </div>

        <div className="create-game-middle-content">
          <h2>{hostProfile?.username}'s Room</h2>
          <span>Current Users in the Room: </span>
          <ul>
            {players.map((player) => (
              <li key={player.username}>{player.username} (Host)</li>
            ))}
          </ul>
        </div>

        {/* Bottom Menu */}
        <div className="create-game-bottom-menu">
          {/* 3. Update the onClick handler */}
          <button onClick={handleExitRoom}>Exit</button>
          <button>Start Game</button>
        </div>
      </div>
    </div>
  );
}

export default CreateGamePopup;