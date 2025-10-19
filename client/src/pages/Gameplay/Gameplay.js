import "./Gameplay.css";
import DisplayMap from "../../components/Gameplay/DisplayMap";
import GameSettings from "../../components/Gameplay/GameSettings";
import OtherPlayersHP from "../../components/Gameplay/OtherPlayersHP";
import PlayerInformation from "../../components/Gameplay/PlayerInformation";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useSocket } from "../../context/SocketContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function Gameplay() {
  const { socket } = useSocket();
  const { sessionDetails } = useRoomSession();
  const navigate = useNavigate();
   
  useEffect(() => {
    // Redirect if no session details
    if (!sessionDetails?.session_id) {
      console.warn('No session details found, redirecting to dashboard');
      navigate('/game-dashboard');
      return;
    }
  }, [sessionDetails?.session_id, navigate]);

  // Listen for QR scan navigation events
  useEffect(() => {
    if (!socket) {
      console.log('No socket available for navigation listener');
      return;
    }

    const handleNavigateToPage = (data) => {
      console.log(`🎯 Received navigation request: ${data.path} (scanned by: ${data.scannedBy})`);
      navigate(data.path);
    };

    console.log('🔌 Setting up navigate_to_page listener');
    socket.on('navigate_to_page', handleNavigateToPage);

    return () => {
      console.log('🧹 Cleaning up navigate_to_page listener');
      socket.off('navigate_to_page', handleNavigateToPage);
    };
  }, [socket, navigate]);

  return (
    <div className="character-selection-container">
      {/* Gameplay Banner Section */}
      <div className="gameplay-banner">
        <img src="/images/banners/game-dashboard-banner.jpg" alt="Gameplay Banner" />
      </div>

      {/* Top section */}
      <div className="top-content">
        <div className="top-left">
          <DisplayMap />
        </div>
        <div className="top-right">
          <GameSettings />
        </div>
      </div>

      {/* Side section */}
      <div className="side-content">
        <OtherPlayersHP socket={socket} />
      </div>

      {/* Middle section */}
      <div className="middle-content">
        <PlayerInformation socket={socket} />
      </div>

      {/* Bottom section */}
      <div className="bottom-content">
        <button onClick={() => navigate('/scanner')}>Scan QR</button>
      </div>
    </div>
  );
}

export default Gameplay;