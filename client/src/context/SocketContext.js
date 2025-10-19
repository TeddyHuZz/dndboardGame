// client/src/context/SocketContext.js
import { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { useRoomSession } from './RoomSessionContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { sessionDetails } = useRoomSession();

  useEffect(() => {
    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketURL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Socket connected with ID: ${newSocket.id}`);
      
      // Auto-join room if session exists
      if (sessionDetails?.session_id) {
        newSocket.emit('join_room', sessionDetails.session_id);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [sessionDetails?.session_id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};