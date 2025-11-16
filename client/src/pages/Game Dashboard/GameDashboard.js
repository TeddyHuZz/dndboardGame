import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "./GameDashboard.css";
import CreateGamePopup from "../../components/Popup/CreateGamePopup";
import JoinGamePopup from "../../components/Popup/JoinGamePopup";
import { useAuth } from "../../context/AuthContext";
import { useRoomSession } from "../../context/RoomSessionContext";
import { supabase } from "../../supabaseClient";

export function GameDashboard() {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isJoinGamePopupVisible, setIsJoinGamePopupVisible] = useState(false);
  const { setPlayers, setSessionDetails } = useRoomSession();
  const { session, profile } = useAuth();
  const navigate = useNavigate(); 

  const handleClosePopup = () => {
    setIsPopupVisible(false);
    setIsJoinGamePopupVisible(false);
  };

  const handleJoinGameClick = () => {
    setIsJoinGamePopupVisible(true);
  };

  const handleJoinRoom = async (sessionCode) => {
    if (!session || !profile) {
      alert("You must be logged in to join a game.");
      return false;
    }

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("session_code", sessionCode.toUpperCase())
        .eq("session_status", "Waiting")
        .single();

      if (roomError || !roomData) {
        throw new Error(
          "Room not found or has been closed. Please check the code and try again."
        );
      }

      if (roomData.user_id === profile.user_id) {
        throw new Error("You can't join your own game.");
      }

      const { data: existingPlayer } = await supabase
        .from("room_players")
        .select("player_id")
        .eq("session_id", roomData.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (existingPlayer) {
        throw new Error("You are already in this room.");
      }

      const { error: insertError } = await supabase
        .from("room_players")
        .insert({
          session_id: roomData.session_id,
          user_id: profile.user_id,
        });

      if (insertError) throw insertError;

      const { data: playersData, error: playersError } = await supabase
        .from("room_players")
        .select(
          `
          user_id,
          user:user_id (username, user_id)
        `
        )
        .eq("session_id", roomData.session_id);

      if (playersError) throw playersError;

      const playersList = playersData.map((p) => ({
        user_id: p.user.user_id,
        username: p.user.username,
      }));

      setSessionDetails(roomData);
      setPlayers(playersList);

      setIsJoinGamePopupVisible(false);
      setIsPopupVisible(true);
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      alert(error.message);
      return false;
    }
  };

  const generateSessionCode = (length = 7) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };

  const handleCreateGame = async () => {
    if (!session || !profile) {
      alert("You must be logged in to create a game.");
      return;
    }

    try {
      const sessionCode = generateSessionCode();

      const { data: roomData, error: roomError } = await supabase
        .from("room_sessions")
        .insert({
          session_code: sessionCode,
          user_id: session.user.id,
          session_status: "Waiting",
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: playerError } = await supabase
        .from("room_players")
        .insert({
          session_id: roomData.session_id,
          user_id: profile.user_id,
        });

      if (playerError) throw playerError;

      setSessionDetails(roomData);
      setPlayers([profile]);
      setIsPopupVisible(true);
      setIsJoinGamePopupVisible(false);
    } catch (error) {
      console.error("Error creating room session:", error);
      alert(
        "Failed to create a new game room. Please check the console for errors."
      );
    }
  };

  const handleLoadSavedGame = () => {
    navigate("/load-game");
  };

  return (
    <div className="game-dashboard-container">
      {/* Game Dashboard Banner Section */}
      <div className="game-dashboard-banner">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Game Dashboard Banner"
        />
      </div>

      {/* Game Dashboard Menu Section */}
      <div className="game-dashboard-menu">
        <h1>Realm Quest</h1>
        <ul>
          <li onClick={handleCreateGame}>Create Game</li>
          <li onClick={handleLoadSavedGame}>Load Saved Game</li>
          <li onClick={handleJoinGameClick}>Join Game</li>
        </ul>
      </div>

      {isPopupVisible && <CreateGamePopup onClose={handleClosePopup} />}

      {isJoinGamePopupVisible && (
        <JoinGamePopup onClose={handleClosePopup} onJoin={handleJoinRoom} />
      )}
    </div>
  );
}

export default GameDashboard;
