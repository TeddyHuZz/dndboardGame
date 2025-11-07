import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import EnemyInformation from "../../components/Combat/EnemyInformation";
import GameSettings from "../../components/Gameplay/GameSettings";
import OtherPlayersHP from "../../components/Gameplay/OtherPlayersHP";
import PlayerInformation from "../../components/Gameplay/PlayerInformation";
import CombatSystem from "../../components/Combat/CombatSystem";
import "./CombatRoom.css";

const CombatRoom = ({ socket }) => {
  // The URL now contains the numeric encounterId, not the slug.
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const { sessionDetails } = useRoomSession();

  // State to hold the fetched data
  const [encounter, setEncounter] = useState(null);
  const [enemy, setEnemy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const initializeCombat = async () => {
      if (!encounterId) {
        setLoading(false);
        return;
      }

      try {
        // ADD LOGGING: Log what we're searching for
        console.log(`[CombatRoom] Fetching encounter with ID: ${encounterId}`);

        // Step 1: Fetch the encounter details from `room_encounters` using the ID.
        const { data: encounterData, error: encounterError } = await supabase
          .from("room_encounters")
          .select("*")
          .eq("encounter_id", encounterId)
          .single();

        // ADD LOGGING: Log the result
        console.log(`[CombatRoom] Encounter query result:`, {
          encounterData,
          encounterError,
        });

        if (encounterError) {
          throw new Error(
            `Encounter with ID ${encounterId} not found: ${encounterError.message}`
          );
        }

        if (!encounterData) {
          throw new Error(`Encounter with ID ${encounterId} returned no data.`);
        }

        setEncounter(encounterData);

        // ADD LOGGING: Log what enemy we're searching for
        console.log(
          `[CombatRoom] Fetching enemy with ID: ${encounterData.enemy_id}`
        );

        // Step 2: Use the `enemy_id` from the encounter to get enemy base stats
        const { data: enemyData, error: enemyError } = await supabase
          .from("enemy_data")
          .select("*")
          .eq("enemy_id", encounterData.enemy_id)
          .single();

        // ADD LOGGING: Log the result
        console.log(`[CombatRoom] Enemy query result:`, {
          enemyData,
          enemyError,
        });

        if (enemyError) {
          throw new Error(
            `Base data for enemy ID ${encounterData.enemy_id} not found: ${enemyError.message}`
          );
        }

        if (!enemyData) {
          throw new Error(
            `Enemy with ID ${encounterData.enemy_id} returned no data.`
          );
        }

        setEnemy(enemyData);
      } catch (err) {
        console.error("[CombatRoom] Error initializing combat room:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeCombat();
  }, [encounterId]); // Removed navigate from dependencies, it's not needed.

  // FIX: Adjust the loading and error guards for clarity.
  if (loading) {
    return <div className="combat-room-information">Loading Combat...</div>;
  }

  if (error) {
    return (
      <div className="combat-room-information">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate("/gameplay")}>Back to Game</button>
      </div>
    );
  }

  // If we are not loading and have no error, but still no encounter, something is wrong.
  if (!encounter || !enemy) {
    return (
      <div className="combat-room-information">
        Could not load combat data. Please return to the game.
        <button onClick={() => navigate("/gameplay")}>Back to Game</button>
      </div>
    );
  }

  return (
    <div className="combat-room-information">
      <div className="combat-room-background">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Combat Room Background"
        />
      </div>
      <div className="combat-room-top">
        <div className="combat-room-top-right">
          <GameSettings />
        </div>
        <div className="combat-room-top-left">
          {/* Pass the full enemy and encounter objects to the display component */}
          {encounter && enemy && (
            <EnemyInformation
              socket={socket}
              encounter={encounter}
              enemy={enemy}
            />
          )}
        </div>
      </div>

      <div className="combat-room-side-panel">
        <OtherPlayersHP socket={socket} />
      </div>

      <div className="combat-room-middle">
        <PlayerInformation socket={socket} />
      </div>

      <div className="combat-room-bottom">
        {/* This part is correct: pass the full encounter object as a prop */}
        <CombatSystem encounter={encounter} />
      </div>
    </div>
  );
};

export default CombatRoom;
