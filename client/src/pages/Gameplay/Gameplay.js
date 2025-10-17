import "./Gameplay.css";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from 'socket.io-client';

export function Gameplay() {
  const [socket, setSocket] = useState(null);
  const { sessionDetails } = useRoomSession();
  const navigate = useNavigate();
   
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Connected to the server with ID: ${newSocket.id}`);

      // Join the room once connected
      if (sessionDetails?.session_id) {
        newSocket.emit('join_room', sessionDetails.session_id);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionDetails, navigate]);

  return (
    <div className="character-selection-container">
      {/* Gameplay Banner Section */}
      <div className="gameplay-banner">
        <img src="/images/banners/game-dashboard-banner.jpg" alt="Gameplay Banner" />
      </div>
    </div>
  );
}

export default Gameplay;