import React, { createContext, useState, useContext } from 'react';

const RoomSessionContext = createContext(null);

export const RoomSessionProvider = ({ children }) => {
  const [sessionDetails, setSessionDetails] = useState(null);
  const [players, setPlayers] = useState([]);

  const value = {
    sessionDetails,
    setSessionDetails,
    players,
    setPlayers,
  };

  return (
    <RoomSessionContext.Provider value={value}>
      {children}
    </RoomSessionContext.Provider>
  );
};

export const useRoomSession = () => {
  return useContext(RoomSessionContext);
};