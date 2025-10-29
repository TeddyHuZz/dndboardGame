import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import "./EnemyInformation.css";

const EnemyInformation = ({ socket, encounterId }) => {
  const [enemy, setEnemy] = useState(null);
  const [loading, setLoading] = useState(true);
  const { sessionDetails } = useRoomSession();

  // Fetch enemy data from room_encounters and enemy_data
  useEffect(() => {
    const fetchEnemyData = async () => {
      if (!sessionDetails?.session_id) return;

      try {
        // Get encounter data with enemy details
        const { data: encounterData, error: encounterError } = await supabase
          .from("room_encounters")
          .select(
            `
                        encounter_id,
                        enemy_id,
                        current_hp,
                        max_hp,
                        is_alive,
                        enemy_data (
                            enemy_name,
                            enemy_image,
                            base_hp
                        )
                    `
          )
          .eq("session_id", sessionDetails.session_id)
          .eq("encounter_id", encounterId)
          .single();

        if (encounterError) {
          console.error("Error fetching encounter:", encounterError);
          return;
        }

        // Combine the data
        setEnemy({
          encounter_id: encounterData.encounter_id,
          enemy_id: encounterData.enemy_id,
          current_hp: encounterData.current_hp,
          max_hp: encounterData.max_hp,
          is_alive: encounterData.is_alive,
          enemy_name: encounterData.enemy_data.enemy_name,
          enemy_image: encounterData.enemy_data.enemy_image,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };

    fetchEnemyData();
  }, [sessionDetails?.session_id, encounterId]);

  // Listen for real-time HP updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleEnemyHpUpdate = (updatedEnemy) => {
      console.log("Enemy HP update received:", updatedEnemy);

      // Update if it's the same encounter
      if (updatedEnemy.encounter_id === encounterId) {
        setEnemy((prevEnemy) => ({
          ...prevEnemy,
          current_hp: updatedEnemy.current_hp,
          max_hp: updatedEnemy.max_hp,
          is_alive: updatedEnemy.is_alive,
        }));
      }
    };

    socket.on("enemy_hp_update", handleEnemyHpUpdate);

    // Cleanup
    return () => {
      socket.off("enemy_hp_update", handleEnemyHpUpdate);
    };
  }, [socket, encounterId]);

  // Subscribe to Supabase real-time updates
  useEffect(() => {
    if (!sessionDetails?.session_id) return;

    const channel = supabase
      .channel(`room_encounters:${sessionDetails.session_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_encounters",
          filter: `encounter_id=eq.${encounterId}`,
        },
        (payload) => {
          console.log("Supabase real-time update:", payload);
          setEnemy((prevEnemy) => ({
            ...prevEnemy,
            current_hp: payload.new.current_hp,
            max_hp: payload.new.max_hp,
            is_alive: payload.new.is_alive,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionDetails?.session_id, encounterId]);

  // Calculate health percentage for the health bar
  const getHealthPercentage = () => {
    if (!enemy || enemy.max_hp === 0) return 0;
    return (enemy.current_hp / enemy.max_hp) * 100;
  };

  // Get color based on health percentage
  const getHealthBarColor = () => {
    const percentage = getHealthPercentage();
    if (percentage > 60) return "#4caf50"; // Green
    if (percentage > 30) return "#ff9800"; // Orange
    return "#f44336"; // Red
  };

  if (loading) {
    return <div className="enemy-information">Loading enemy data...</div>;
  }

  if (!enemy) {
    return <div className="enemy-information">No enemy found</div>;
  }

  return (
    <div className="enemy-information-container">
      <div className="enemy-card">
        <h3 className="enemy-name">{enemy.enemy_name}</h3>

        <div className="enemy-hp-container">
          <div className="enemy-hp-section">
            <div
              className="enemy-hp-bar-fill"
              style={{
                width: `${getHealthPercentage()}%`,
                backgroundColor: getHealthBarColor(),
                transition: "width 0.3s ease-in-out",
              }}
            />
          </div>
        </div>

        <div className="enemy-image-container">
          {enemy.enemy_image && (
            <img
              src={enemy.enemy_image}
              alt={enemy.enemy_name}
              className="enemy-image"
            />
          )}
        </div>

        {!enemy.is_alive && <div className="enemy-defeated">DEFEATED</div>}
      </div>
    </div>
  );
};

export default EnemyInformation;
