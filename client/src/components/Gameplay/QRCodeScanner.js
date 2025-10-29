import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./QRCodeScanner.css";

const QRCodeScanner = ({ onDecode, onError }) => {
  const devices = useDevices();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [scanError, setScanError] = useState(null);
  const navigate = useNavigate();

  const highlightCodeOnCanvas = (detectedCodes, ctx) => {
    detectedCodes.forEach((detectedCode) => {
      const { boundingBox, cornerPoints } = detectedCode;

      // Draw bounding box
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 4;
      ctx.strokeRect(
        boundingBox.x,
        boundingBox.y,
        boundingBox.width,
        boundingBox.height
      );

      // Draw corner points
      ctx.fillStyle = "#FF0000";
      cornerPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  // ✅ Handle scan result with navigation
  const handleScan = (result) => {
    if (result && result.length > 0) {
      const rawValue = result[0].rawValue;
      console.log("QR Scanned:", rawValue);

      try {
        // Try to parse as URL
        const url = new URL(rawValue);
        const path = url.pathname;

        // Check if it's a combat encounter
        if (path.startsWith("/combat/")) {
          const encounterId = path.split("/combat/")[1];
          console.log("Navigating to combat:", encounterId);
          navigate(`/combat/${encounterId}`);
        }
        // Check if it's a treasure encounter
        else if (path.startsWith("/treasure/")) {
          const encounterId = path.split("/treasure/")[1];
          console.log("Navigating to treasure:", encounterId);
          navigate(`/treasure/${encounterId}`);
        } else {
          setScanError(
            "Invalid QR code format. Expected /combat/ or /treasure/ URL."
          );
          console.error("Invalid path:", path);
        }
      } catch (err) {
        // If it's not a full URL, try to extract path directly
        const rawPath = rawValue.trim();

        if (rawPath.startsWith("/combat/")) {
          const encounterId = rawPath.split("/combat/")[1];
          console.log("Navigating to combat (direct path):", encounterId);
          navigate(`/combat/${encounterId}`);
        } else if (rawPath.startsWith("/treasure/")) {
          const encounterId = rawPath.split("/treasure/")[1];
          console.log("Navigating to treasure (direct path):", encounterId);
          navigate(`/treasure/${encounterId}`);
        } else {
          setScanError(
            "Invalid QR code format. Please scan a valid encounter QR code."
          );
          console.error("Failed to parse QR code:", rawValue);
        }
      }

      // Call parent's onDecode function if provided
      if (onDecode) {
        onDecode(rawValue);
      }
    }
  };

  // ✅ Handle scan errors
  const handleError = (error) => {
    console.error("Scanner error:", error);
    setScanError("Camera error. Please check permissions.");

    if (onError) {
      onError(error);
    }
  };

  return (
    <div className="scanner-container">
      <select
        onChange={(e) => setSelectedDevice(e.target.value)}
        value={selectedDevice || ""}
        className="camera-select"
      >
        <option value="">Default Camera</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>

      {scanError && <div className="scan-error">⚠️ {scanError}</div>}

      <div className="scanner-video-wrapper">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          constraints={
            selectedDevice
              ? {
                  deviceId: { exact: selectedDevice },
                  aspectRatio: 1,
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                }
              : {
                  facingMode: "environment",
                  aspectRatio: 1,
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                }
          }
          components={{
            tracker: highlightCodeOnCanvas,
            audio: true,
            torch: true,
            zoom: true,
            finder: true,
          }}
          sound="/sounds/qr-code-scan-sound.mp3"
        />
      </div>
    </div>
  );
};

export default QRCodeScanner;
