import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import "./EnemyInformation.css";

const EnemyInformation = ({
  socket,
  encounter: initialEncounter,
  enemy: enemyData,
}) => {
  const [enemy, setEnemy] = useState({
    encounter_id: initialEncounter.encounter_id,
    enemy_id: initialEncounter.enemy_id,
    current_hp: initialEncounter.current_hp,
    max_hp: initialEncounter.max_hp,
    is_alive: initialEncounter.is_alive,
    enemy_name: enemyData.enemy_name,
    enemy_image: enemyData.enemy_image,
  });
  const { sessionDetails } = useRoomSession();

  useEffect(() => {
    if (!socket) return;

    const handleEnemyHpUpdate = (updatedEnemy) => {
      console.log("Enemy HP update received:", updatedEnemy);

      if (updatedEnemy.encounterId === initialEncounter.encounter_id) {
        setEnemy((prevEnemy) => ({
          ...prevEnemy,
          current_hp: updatedEnemy.newHp,
          is_alive: updatedEnemy.newHp > 0,
        }));
      }
    };

    socket.on("enemy_hp_update", handleEnemyHpUpdate);

    return () => {
      socket.off("enemy_hp_update", handleEnemyHpUpdate);
    };
  }, [socket, initialEncounter.encounter_id]);

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
          filter: `encounter_id=eq.${initialEncounter.encounter_id}`,
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
  }, [sessionDetails?.session_id, initialEncounter.encounter_id]);

  const getHealthPercentage = () => {
    if (!enemy || enemy.max_hp === 0) return 0;
    return (enemy.current_hp / enemy.max_hp) * 100;
  };

  const getHealthBarColor = () => {
    const percentage = getHealthPercentage();
    if (percentage > 60) return "#4caf50";
    if (percentage > 30) return "#ff9800";
    return "#f44336";
  };

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
