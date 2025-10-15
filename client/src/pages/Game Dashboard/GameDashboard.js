import { useState } from "react";
import "./GameDashboard.css";
import CreateGamePopup from "../../components/Popup/CreateGamePopup";
import { useAuth } from "../../context/AuthContext";
import { useRoomSession } from "../../context/RoomSessionContext";
import { supabase } from "../../supabaseClient";

export function GameDashboard() {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const { setPlayers, setSessionDetails } = useRoomSession();
  const { session, profile } = useAuth();

  const handleClosePopup = () => {
    setIsPopupVisible(false);
  };

  const generateSessionCode = (length = 7) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleCreateGame = async () => {
    if (!session) {
      alert("You must be logged in to create a game.");
      return;
    }

    const sessionCode = generateSessionCode();

    const { data, error } = await supabase
      .from("room_sessions") // Correct table name
      .insert({
        session_code: sessionCode,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating room session:", error);
      alert("Failed to create a new game room. Please check the console for errors.");
    } else {
      setSessionDetails(data);
      setPlayers(profile ? [profile] : []);
      setIsPopupVisible(true);
    }
  };

  return (
    <div className="game-dashboard-container">
      {/* Game Dashboard Banner Section */}
      <div className="game-dashboard-banner">
        <img src="/images/banners/game-dashboard-banner.jpg" alt="Game Dashboard Banner" />
      </div>

      {/* Game Dashboard Menu Section */}
      <div className="game-dashboard-menu">
        <h1>Realm Quest</h1>
        <ul>
          <li onClick={handleCreateGame}>Create Game</li>
          <li>Load Saved Game</li>
          <li>Join Game</li>
          <li>Browse Game</li>
        </ul>
      </div>

      {isPopupVisible && (
        <CreateGamePopup
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}

export default GameDashboard;