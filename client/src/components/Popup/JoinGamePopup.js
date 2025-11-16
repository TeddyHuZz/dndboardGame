import { useState } from "react";
import "./JoinGamePopup.css";

function JoinGamePopup({ onClose, onJoin }) {
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinClick = async () => {
    if (!sessionCode || sessionCode.trim().length < 6) {
      setError("Please enter a valid Session ID.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const success = await onJoin(sessionCode.trim());
    
    if (!success) {
      setIsLoading(false);
      setError("Failed to join room.");
    }
  };

  const handleChange = (e) => {
    setError(null);
    setSessionCode(e.target.value.toUpperCase());
  }

  return (
    <div className="join-game-popup-overlay">
        <div className="join-game-popup-content">
            <div className="join-game-popup-top-header">
                <h1>Join Room</h1>
            </div>

            <div className="join-game-popup-middle-content">
                <span>Enter the given Session ID to join the room.</span>
                <input 
                type="text" 
                placeholder="ENTER 6-DIGIT SESSION ID..." 
                value={sessionCode}
                onChange={handleChange}
                maxLength={7}
                />
                {error && <p className="error-message">{error}</p>}
            </div>

            <div className="join-game-popup-bottom-menu">
                <button onClick={onClose} disabled={isLoading}>Exit</button>
                <button onClick={handleJoinClick} disabled={isLoading}>
                {isLoading ? "Joining..." : "Join Room"}
                    </button>
                </div>
        </div>
    </div>
  )
}
export default JoinGamePopup;