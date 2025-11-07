import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./GameSettings.css";
import saveGameState from "../GameFile/SaveGame";
import { useRoomSession } from "../../context/RoomSessionContext";

const GameSettings = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleExitWithoutSaving = () => {
    navigate("/game-dashboard");
  };

  const { sessionDetails, players, setPlayers } = useRoomSession();

  const handleSaveGame = async () => {
    const gameData = {
      sessionId: sessionDetails.session_id,
      players: players,
    };

    const result = await saveGameState(gameData);

    if (result && result.success) {
      setPlayers(result.updatedPlayers);
      alert("Game Saved!");
    } else {
      alert("Failed to save game.");
    }
  };

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button className="settings-button" onClick={toggleDropdown}>
        <img src="/images/logo/settings-button.png" alt="Settings Button" />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <ul>
            <li onClick={handleSaveGame}>Save Game</li>
            <li onClick={handleExitWithoutSaving}>Exit to Main Menu</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GameSettings;
