import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useSocket } from "../../context/SocketContext";
import DiceRolling from "../../components/Treasure/DiceRolling";
import "./TreasureRoom.css";

const TreasureRoom = () => {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { sessionDetails } = useRoomSession();
  const { socket } = useSocket();

  const [isProcessing, setIsProcessing] = useState(false);

  const applyOutcome = async (result) => {
    if (!profile || !sessionDetails || isProcessing) return;

    setIsProcessing(true);

    try {
      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("current_hp, character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError) throw playerError;

      const { data: characterData, error: characterError } = await supabase
        .from("character_classes")
        .select("base_hp") 
        .eq("character_id", playerData.character_id)
        .single();

      if (characterError) throw characterError;

      const currentHp = playerData.current_hp;
      const maxHp = characterData.base_hp; 
      let newHp;

      if (result === "win") {
        const healAmount = Math.ceil(maxHp * 0.3);
        newHp = Math.min(currentHp + healAmount, maxHp);
        console.log(
          `Player healed: ${currentHp} -> ${newHp} HP (+${healAmount})`
        );
      } else {
        const damageAmount = Math.ceil(currentHp * 0.3);
        newHp = Math.max(currentHp - damageAmount, 1); 
        console.log(
          `Player damaged: ${currentHp} -> ${newHp} HP (-${damageAmount})`
        );
      }

      const { error: updateError } = await supabase
        .from("room_players")
        .update({ current_hp: newHp })
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      if (socket) {
        socket.emit("update_player_hp", {
          sessionId: sessionDetails.session_id,
          userId: profile.user_id,
          newHp: newHp,
        });
      }
    } catch (error) {
      console.error("Error applying treasure outcome:", error);
    } finally {
      setTimeout(() => {
        navigate("/gameplay");
      }, 3000);
    }
  };

  return (
    <>
      <div className="gameplay-banner">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Treasure Room Banner"
        />
      </div>
      <div className="treasure-room-container">
        <DiceRolling encounterId={encounterId} onResult={applyOutcome} />
      </div>
    </>
  );
};

export default TreasureRoom;
