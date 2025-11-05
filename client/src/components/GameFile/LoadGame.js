import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoomSession } from "../../context/RoomSessionContext"; // Import the context
import "./LoadGame.css";

const LoadGame = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { setSessionDetails, setPlayers } = useRoomSession(); // Get setters from context
  const [savedGames, setSavedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile?.user_id) {
      fetchSavedGames();
    } else {
      setError("Please log in to view saved games");
      setLoading(false);
    }
  }, [profile]);

  const fetchSavedGames = async () => {
    try {
      const userId = profile.user_id; // Get from Auth context
      const response = await fetch(
        `http://localhost:3001/api/games/load/${userId}`
      );
      const data = await response.json();

      if (data.success) {
        setSavedGames(data.games);
      } else {
        setError("No saved games found");
      }
    } catch (err) {
      console.error("Error fetching saved games:", err);
      setError("Failed to load saved games");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGame = async (sessionId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/games/session/${sessionId}`
      );
      const data = await response.json();

      if (data.success && data.sessionDetails) {
        // Set the context, which now automatically saves to sessionStorage
        setSessionDetails(data.sessionDetails);
        setPlayers(data.players);

        // Just navigate. The data will be there when Gameplay loads.
        navigate("/gameplay");
      } else {
        alert("Failed to load game state.");
      }
    } catch (err) {
      console.error("Error loading game:", err);
      alert("Failed to load game.");
    }
  };

  const handleExit = () => {
    navigate("/game-dashboard");
  };

  return (
    <div className="load-game-container">
      <h1>Load Game</h1>

      <div className="saved-games-list">
        {loading && <p>Loading saved games...</p>}

        {error && <p className="error-message">{error}</p>}

        {!loading && !error && savedGames.length === 0 && (
          <p>No saved games found.</p>
        )}

        {!loading && savedGames.length > 0 && (
          <div className="games-grid">
            {savedGames.map((game) => (
              <div
                key={game.session_id}
                className="game-card"
                onClick={() => handleLoadGame(game.session_id)}
              >
                <div className="game-info">
                  <h3>Session: {game.session_code}</h3>
                  <p>Players: {game.player_count}</p>
                  <p>Stage: {game.current_stage}</p>
                  <p className="game-date">
                    Last Saved: {new Date(game.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="button-container">
        <button className="exit-button" onClick={handleExit}>
          Exit
        </button>
      </div>
    </div>
  );
};

export default LoadGame;
