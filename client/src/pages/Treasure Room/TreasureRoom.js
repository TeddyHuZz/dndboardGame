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
      // 1. Get player's current HP and character info from room_players
      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("current_hp, character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError) throw playerError;

      // 2. Get character's base_hp (max HP) from character_classes
      const { data: characterData, error: characterError } = await supabase
        .from("character_classes")
        .select("base_hp") // FIX: Use the correct column name 'base_hp'
        .eq("character_id", playerData.character_id)
        .single();

      if (characterError) throw characterError;

      const currentHp = playerData.current_hp;
      const maxHp = characterData.base_hp; // FIX: Use the correct property from the fetched data
      let newHp;

      if (result === "win") {
        // REWARD LOGIC: Heal for 30% of max HP
        const healAmount = Math.ceil(maxHp * 0.3);
        newHp = Math.min(currentHp + healAmount, maxHp);
        console.log(
          `Player healed: ${currentHp} -> ${newHp} HP (+${healAmount})`
        );
      } else {
        // PUNISHMENT LOGIC: Damage for 30% of current HP
        const damageAmount = Math.ceil(currentHp * 0.3);
        newHp = Math.max(currentHp - damageAmount, 1); // Ensure player has at least 1 HP
        console.log(
          `Player damaged: ${currentHp} -> ${newHp} HP (-${damageAmount})`
        );
      }

      // 3. Update player HP in database
      const { error: updateError } = await supabase
        .from("room_players")
        .update({ current_hp: newHp })
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      // 4. Emit socket event to update HP for all clients
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
      // 5. Navigate back to the gameplay screen after a delay
      setTimeout(() => {
        navigate("/gameplay");
      }, 3000); // Wait 3s after logic is done before navigating
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
