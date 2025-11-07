import QRCodeScanner from "../../components/Gameplay/QRCodeScanner";
import "./ScannerPage.css";
import GameSettings from "../../components/Gameplay/GameSettings";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { useRoomSession } from "../../context/RoomSessionContext";

const ScannerPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { sessionDetails } = useRoomSession();
  const [errorMessage, setErrorMessage] = useState("");

  const handleScan = (data) => {
    if (data && sessionDetails && socket) {
      try {
        const url = new URL(data);
        const path = url.pathname;

        // The only job of this function is to emit the event.
        socket.emit("qr_code_scanned", {
          sessionId: sessionDetails.session_id,
          path: path,
        });

        // Navigate away immediately. The SocketNavigator in App.js will handle the response.
        navigate("/gameplay");
      } catch (error) {
        console.error("Scanned data is not a valid URL:", error);
        setErrorMessage("Invalid QR Code. Not a valid URL.");
      }
    }
  };

  return (
    <div className="scanner-page">
      <div className="scanner-page-banner">
        <img
          src="/images/banners/game-dashboard-banner.jpg"
          alt="Scanner Banner"
        />
      </div>

      <div className="scanner-page-top-content">
        <div className="scanner-page-top-left">
          <button onClick={() => navigate("/gameplay")}>Close Camera</button>
        </div>
        <div className="scanner-page-top-right">
          <GameSettings />
        </div>
      </div>

      <div className="scanner-page-middle-content">
        <h1>Scan QR Code</h1>
        {errorMessage && (
          <div
            className="error-message"
            style={{ color: "red", marginBottom: "10px" }}
          >
            {errorMessage}
          </div>
        )}
        <QRCodeScanner
          onDecode={handleScan}
          onError={(error) => console.log(error?.message)}
        />
      </div>
    </div>
  );
};

export default ScannerPage;
