import "./Gameplay.css";
import DisplayMap from "../../components/Gameplay/DisplayMap";
import GameSettings from "../../components/Gameplay/GameSettings";
import OtherPlayersHP from "../../components/Gameplay/OtherPlayersHP";
import PlayerInformation from "../../components/Gameplay/PlayerInformation";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useSocket } from "../../context/SocketContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export function Gameplay() {
  const navigate = useNavigate();
  const { sessionDetails } = useRoomSession();
  const { socket } = useSocket();

  useEffect(() => {
    if (!sessionDetails) {
      console.warn(
        "No session details found in context, redirecting to dashboard"
      );
      navigate("/game-dashboard");
    }
  }, [sessionDetails, navigate]);

  useEffect(() => {
    if (!socket) {
      console.log("No socket available for navigation listener");
      return;
    }

    const handleNavigateToPage = (data) => {
      console.log(
        `🎯 Received navigation request: ${data.path} (scanned by: ${data.scannedBy})`
      );
      navigate(data.path);
    };

    console.log("🔌 Setting up navigate_to_page listener");
    socket.on("navigate_to_page", handleNavigateToPage);

    return () => {
      console.log("🧹 Cleaning up navigate_to_page listener");
      socket.off("navigate_to_page", handleNavigateToPage);
    };
  }, [socket, navigate]);

  const handleEncounterClick = async (encounterId) => {
    if (!encounterId) return;

    try {
      const { data, error } = await supabase
        .from("room_encounters")
        .select("is_alive")
        .eq("encounter_id", encounterId)
        .single();

      if (error) {
        console.error("Error fetching encounter status:", error);
        alert("Could not check encounter status. Please try again.");
        return;
      }

      if (data && data.is_alive === false) {
        alert("The enemy has been defeated, please proceed to the next stage!");
      } else {
        navigate(`/combat/${encounterId}`);
      }
    } catch (err) {
      console.error("An unexpected error occurred:", err);
    }
  };

  if (!sessionDetails) {
    return <div>Loading Game...</div>;
  }

  return (
    <div className="gameplay-container">
      {/* Gameplay Banner Section */}
      <div className="gameplay-banner">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Gameplay Banner"
        />
      </div>

      {/* Top section */}
      <div className="top-content">
        <div className="top-left">
          <DisplayMap />
        </div>
        <div className="top-right">
          <GameSettings />
        </div>
      </div>

      {/* Side section */}
      <div className="side-content">
        <OtherPlayersHP socket={socket} />
      </div>

      {/* Middle section */}
      <div className="middle-content">
        <PlayerInformation socket={socket} />
      </div>

      {/* Bottom section */}
      <div className="bottom-content">
        <button onClick={() => navigate("/scanner")}>Scan QR</button>
      </div>
    </div>
  );
}

export default Gameplay;
