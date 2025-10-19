import "./Gameplay.css";
import DisplayMap from "../../components/Gameplay/DisplayMap";
import GameSettings from "../../components/Gameplay/GameSettings";
import OtherPlayersHP from "../../components/Gameplay/OtherPlayersHP";
import PlayerInformation from "../../components/Gameplay/PlayerInformation";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from 'socket.io-client';

export function Gameplay() {
  const [socket, setSocket] = useState(null);
  const { sessionDetails } = useRoomSession();
  const navigate = useNavigate();
   
  useEffect(() => {
    // Redirect if no session details
    if (!sessionDetails?.session_id) {
      console.warn('No session details found, redirecting to dashboard');
      navigate('/game-dashboard');
      return;
    }

    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketURL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Connected to the server with ID: ${newSocket.id}`);
      newSocket.emit('join_room', sessionDetails.session_id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [sessionDetails?.session_id]); // Only depend on session_id, not the entire object or navigate

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
        
      </div>
    </div>
  );
}

export default Gameplay;