import React, { useEffect, useRef } from "react";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./CreateGamePopup.css";

const CreateGamePopup = ({ onClose }) => {
  const { sessionDetails, setSessionDetails, players, setPlayers } =
    useRoomSession();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isHost = sessionDetails?.user_id === profile?.user_id;

  const actualHost = players.find((p) => p.user_id === sessionDetails?.user_id);

  const fetchPlayersRef = useRef();

  useEffect(() => {
    fetchPlayersRef.current = async () => {
      if (!sessionDetails?.session_id) return;

      console.log("Fetching players...");
      const { data, error } = await supabase
        .from("room_players")
        .select("user_id, user:user(username)")
        .eq("session_id", sessionDetails.session_id);

      if (error) {
        console.error("Error fetching players:", error);
        return;
      }

      const playersList = data
        .map((p) => {
          if (p.user && p.user.username) {
            return {
              user_id: p.user_id,
              username: p.user.username,
            };
          }
          console.warn("Found a player with no matching user record:", p);
          return null;
        })
        .filter(Boolean);

      setPlayers(playersList);
    };
  });

  useEffect(() => {
    fetchPlayersRef.current();
  }, []);

  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const sessionId = sessionDetails.session_id;

    const playerChannel = supabase
      .channel(`room-players-updates-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          console.log("Player change detected, re-fetching players...");
          fetchPlayersRef.current();
        }
      )
      .subscribe((status, err) =>
        console.log(`Players subscription status: ${status}`, err || "")
      );

    const roomChannel = supabase
      .channel(`room-session-updates-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("Room session change received:", payload.new);
          if (payload.new.session_status === "In game") {
            console.log("Game is starting, navigating...");
            navigate("/character-selection");
          } else {
            setSessionDetails((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe((status, err) =>
        console.log(`Room session subscription status: ${status}`, err || "")
      );

    return () => {
      console.log("Cleaning up subscriptions");
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [sessionDetails?.session_id, navigate, setSessionDetails]);

  const handleCopy = () => {
    if (sessionDetails?.session_code) {
      navigator.clipboard
        .writeText(sessionDetails.session_code)
        .then(() => alert("Session ID copied to clipboard!"))
        .catch((err) => console.error("Failed to copy text: ", err));
    }
  };

  const handleExitRoom = async () => {
    if (!sessionDetails?.session_id || !profile?.user_id) {
      setSessionDetails(null);
      setPlayers([]);
      onClose();
      return;
    }

    try {
      await supabase
        .from("room_players")
        .delete()
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      if (isHost) {
        const { data: remainingPlayers, error: playersError } = await supabase
          .from("room_players")
          .select("user_id, joined_at")
          .eq("session_id", sessionDetails.session_id)
          .order("joined_at", { ascending: true });

        if (playersError) throw playersError;

        if (remainingPlayers && remainingPlayers.length > 0) {
          const newHostId = remainingPlayers[0].user_id;

          await supabase
            .from("room_sessions")
            .update({
              user_id: newHostId,
            })
            .eq("session_id", sessionDetails.session_id);

          console.log(`✅ Host transferred to user: ${newHostId}`);
        } else {
          await supabase
            .from("room_sessions")
            .update({ session_status: "Closed" })
            .eq("session_id", sessionDetails.session_id);

          console.log("✅ Room closed - no players remaining");
        }
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }

    setSessionDetails(null);
    setPlayers([]);
    onClose();
  };

  const handleStartGame = async () => {
    if (!isHost || !sessionDetails?.session_id) return;
    try {
      await supabase
        .from("room_sessions")
        .update({ session_status: "In game" })
        .eq("session_id", sessionDetails.session_id);
    } catch (error) {
      console.error("Error starting game", error);
    }
  };

  return (
    <div className="create-game-popup-overlay" onClick={handleExitRoom}>
      <div
        className="create-game-popup-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-game-top-menu">
          <span>
            Current Players: {players.length} /{" "}
            {sessionDetails?.max_players || 4}
          </span>
          <div className="create-game-top-menu-session-id">
            <span>Session ID: {sessionDetails?.session_code}</span>
            <button onClick={handleCopy}>Copy</button>
          </div>
        </div>

        <div className="create-game-middle-content">
          <h2>{actualHost?.username || "Unknown"}'s Room</h2>
          <span>Current Users in the Room: </span>
          <ul>
            {players.map((player) => (
              <li key={player.user_id}>
                {player.username}{" "}
                {player.user_id === sessionDetails?.user_id ? "(Host)" : ""}
              </li>
            ))}
          </ul>
        </div>

        <div className="create-game-bottom-menu">
          <button onClick={handleExitRoom}>Exit</button>
          <button onClick={handleStartGame}>Start Game</button>
        </div>
      </div>
    </div>
  );
};

export default CreateGamePopup;
