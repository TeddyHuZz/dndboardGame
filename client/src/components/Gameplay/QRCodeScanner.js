import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import { useState } from 'react';
import './QRCodeScanner.css';

// ✅ Accept props
const QRCodeScanner = ({ onDecode, onError }) => {
    const devices = useDevices();
    const [selectedDevice, setSelectedDevice] = useState(null);

    const highlightCodeOnCanvas = (detectedCodes, ctx) => {
        detectedCodes.forEach((detectedCode) => {
          const { boundingBox, cornerPoints } = detectedCode;
    
          // Draw bounding box
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 4;
          ctx.strokeRect(
            boundingBox.x,
            boundingBox.y,
            boundingBox.width,
            boundingBox.height
          );
    
          // Draw corner points
          ctx.fillStyle = '#FF0000';
          cornerPoints.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          });
        });
    };

    // ✅ Handle scan result
    const handleScan = (result) => {
        if (result && result.length > 0) {
            const rawValue = result[0].rawValue;
            console.log('QR Scanned:', rawValue);
            
            // Call parent's onDecode function
            if (onDecode) {
                onDecode(rawValue);
            }
        }
    };

    return (
        <div className="scanner-container">
          <select onChange={(e) => setSelectedDevice(e.target.value)} value={selectedDevice || ''}>
            <option value="">Default Camera</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId}`}
              </option>
            ))}
          </select>

          <div className="scanner-video-wrapper">
            <Scanner
                onScan={handleScan}  // ✅ Use our handler
                onError={onError}    // ✅ Pass through error handler
                constraints={
                    selectedDevice 
                    ? {
                        deviceId: { exact: selectedDevice },
                        aspectRatio: 1,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    }
                    : {
                        facingMode: 'environment',
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