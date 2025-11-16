import { supabase } from "../../supabaseClient";
import { useState, useEffect } from "react";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";
import "./CharacterSelection.css";

export function CharacterSelection() {
  const { sessionDetails } = useRoomSession();
  const { profile } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [playerSelections, setPlayerSelections] = useState({});

  const WarriorID = "51d95f67-01c0-42e8-aed7-85435742af4d";
  const HealerID = "23a98afc-1a3d-47ed-a991-31229a0650c3";
  const MageID = "35169b3e-b282-483a-a39e-5e9162794aa8";
  const [characterWarrior, setCharacterWarrior] = useState(null);
  const [characterHealer, setCharacterHealer] = useState(null);
  const [characterMage, setCharacterMage] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleSelectionUpdate = (selections) => {
      console.log("Received selection update: ", selections);
      setPlayerSelections(selections);
    };

    const handleStartGame = () => {
      console.log("ALL players are ready! Starting the game...");
      navigate("/gameplay");
    };

    socket.on("selection_update", handleSelectionUpdate);
    socket.on("start_game", handleStartGame);

    return () => {
      socket.off("selection_update", handleSelectionUpdate);
      socket.off("start_game", handleStartGame);
    };
  }, [socket, navigate]);

  useEffect(() => {
    const fetchCharacterWarrior = async () => {
      const { data, error } = await supabase
        .from("character_classes")
        .select(
          "character_id, character_name, character_description, character_image"
        )
        .eq("character_id", WarriorID)
        .single();

      if (error) {
        console.error("Error fetching warrior data", error);
      } else {
        setCharacterWarrior(data);
      }
    };

    fetchCharacterWarrior();
  }, [WarriorID]);

  useEffect(() => {
    const fetchCharacterHealer = async () => {
      const { data, error } = await supabase
        .from("character_classes")
        .select(
          "character_id, character_name, character_description, character_image"
        )
        .eq("character_id", HealerID)
        .single();

      if (error) {
        console.error("Error fetching healer data", error);
      } else {
        setCharacterHealer(data);
      }
    };

    fetchCharacterHealer();
  }, [HealerID]);

  useEffect(() => {
    const fetchCharacterMage = async () => {
      const { data, error } = await supabase
        .from("character_classes")
        .select(
          "character_id, character_name, character_description, character_image"
        )
        .eq("character_id", MageID)
        .single();

      if (error) {
        console.error("Error fetching mage data", error);
      } else {
        setCharacterMage(data);
      }
    };

    fetchCharacterMage();
  }, [MageID]);

  const handleSelectCharacter = async (characterId) => {
    console.log(
      "Attempting to select character. Socket ready?",
      !!socket,
      "Session ready?",
      !!sessionDetails?.session_id,
      "Profile ready?",
      !!profile?.user_id
    );

    if (socket && sessionDetails?.session_id && profile?.user_id) {
      socket.emit("character_selected", {
        sessionId: sessionDetails.session_id,
        characterId: characterId,
        userId: profile.user_id,
      });
    }

    const { data: characterData, error: characterError } = await supabase
      .from("character_classes")
      .select("base_hp")
      .eq("character_id", characterId)
      .single();

    if (characterError || !characterData) {
      console.error("Error fetching character data", characterError);
    }

    const baseHp = characterData.base_hp;

    const { data: updateData, error: updateError } = await supabase
      .from("room_players")
      .update({
        character_id: characterId,
        current_hp: baseHp,
        max_hp: baseHp,
      })
      .eq("session_id", sessionDetails.session_id)
      .eq("user_id", profile.user_id);

    if (updateError) {
      console.error("Error updating character selection", updateError);
    } else {
      console.log("Character selection and health updated successfully");
    }
  };

  return (
    <div className="character-selection-container">
      <div className="character-selection-banner">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Character Selection Banner"
        />
      </div>

      <div className="character-selection-content">
        <div className="character-selection-top-menu">
          <h1>Character Selection</h1>
        </div>

        <div className="character-selection-middle-content">
          {characterWarrior && (
            <div className="character-card">
              <h3>{characterWarrior.character_name}</h3>
              <img
                src={characterWarrior.character_image}
                alt="Character Warrior"
              />
              <p>{characterWarrior.character_description}</p>
              <button
                onClick={() =>
                  handleSelectCharacter(characterWarrior.character_id)
                }
              >
                Select Warrior
              </button>
            </div>
          )}
          {characterHealer && (
            <div className="character-card">
              <h3>{characterHealer.character_name}</h3>
              <img
                src={characterHealer.character_image}
                alt="Character Healer"
              />
              <p>{characterHealer.character_description}</p>
              <button
                onClick={() =>
                  handleSelectCharacter(characterHealer.character_id)
                }
              >
                Select Healer
              </button>
            </div>
          )}
          {characterMage && (
            <div className="character-card">
              <h3>{characterMage.character_name}</h3>
              <img src={characterMage.character_image} alt="Character Mage" />
              <p>{characterMage.character_description}</p>
              <button
                onClick={() =>
                  handleSelectCharacter(characterMage.character_id)
                }
              >
                Select Mage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharacterSelection;
