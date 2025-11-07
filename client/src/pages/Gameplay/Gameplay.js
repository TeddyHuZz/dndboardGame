import "./Gameplay.css";
import DisplayMap from "../../components/Gameplay/DisplayMap";
import GameSettings from "../../components/Gameplay/GameSettings";
import OtherPlayersHP from "../../components/Gameplay/OtherPlayersHP";
import PlayerInformation from "../../components/Gameplay/PlayerInformation";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useSocket } from "../../context/SocketContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // Make sure supabase is imported

export function Gameplay() {
  const navigate = useNavigate();
  const { sessionDetails } = useRoomSession();
  const { socket } = useSocket();

  // --- Hook 1: Session data handling (now much simpler) ---
  useEffect(() => {
    if (!sessionDetails) {
      console.warn(
        "No session details found in context, redirecting to dashboard"
      );
      navigate("/game-dashboard");
    }
  }, [sessionDetails, navigate]);

  // --- Hook 2: Socket listener (no changes needed) ---
  useEffect(() => {
    if (!socket) {
      console.log("No socket available for navigation listener");
      return; // Early return inside a hook's callback is OK
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
        // If the enemy is not alive, show an alert and do nothing else.
        alert("The enemy has been defeated, please proceed to the next stage!");
      } else {
        // If the enemy is alive, navigate to the combat page.
        navigate(`/combat/${encounterId}`);
      }
    } catch (err) {
      console.error("An unexpected error occurred:", err);
    }
  };

  // --- Conditional return ---
  // If there are no session details, show a loading screen while the redirect happens.
  if (!sessionDetails) {
    return <div>Loading Game...</div>;
  }

  // --- Main component render ---
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
