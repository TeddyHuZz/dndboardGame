import React, { createContext, useContext, useState, useEffect } from "react";

const RoomSessionContext = createContext();

export const useRoomSession = () => useContext(RoomSessionContext);

const getInitialState = (key, defaultValue) => {
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading sessionStorage key “${key}”:`, error);
    return defaultValue;
  }
};

export const RoomSessionProvider = ({ children }) => {
  const [sessionDetails, setSessionDetailsState] = useState(() =>
    getInitialState("sessionDetails", null)
  );
  const [players, setPlayersState] = useState(() =>
    getInitialState("players", [])
  );

  const setSessionDetails = (data) => {
    setSessionDetailsState(data);
    try {
      if (data) {
        window.sessionStorage.setItem("sessionDetails", JSON.stringify(data));
      } else {
        window.sessionStorage.removeItem("sessionDetails");
      }
    } catch (error) {
      console.error("Error setting sessionDetails in sessionStorage:", error);
    }
  };

  const setPlayers = (data) => {
    setPlayersState(data);
    try {
      if (data) {
        window.sessionStorage.setItem("players", JSON.stringify(data));
      } else {
        window.sessionStorage.removeItem("players");
      }
    } catch (error) {
      console.error("Error setting players in sessionStorage:", error);
    }
  };

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
