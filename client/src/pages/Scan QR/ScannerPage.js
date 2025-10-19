import QRCodeScanner from "../../components/Gameplay/QRCodeScanner";
import './ScannerPage.css';
import GameSettings from "../../components/Gameplay/GameSettings";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";  // ✅ Add useEffect
import { useSocket } from "../../context/SocketContext";
import { useRoomSession } from "../../context/RoomSessionContext";

const ScannerPage = () => {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const { sessionDetails } = useRoomSession();
    const [errorMessage, setErrorMessage] = useState('');

    const ALLOWED_HOSTS = [
        'realmquest.vercel.app',
        'localhost:3000',
        'localhost'
    ];

    // ✅ Add listener for navigation events
    useEffect(() => {
        if (!socket) {
            console.log('No socket available for navigation listener in ScannerPage');
            return;
        }

        const handleNavigateToPage = (data) => {
            console.log(`🎯 ScannerPage: Received navigation request: ${data.path}`);
            navigate(data.path);
        };

        console.log('🔌 ScannerPage: Setting up navigate_to_page listener');
        socket.on('navigate_to_page', handleNavigateToPage);

        return () => {
            console.log('🧹 ScannerPage: Cleaning up navigate_to_page listener');
            socket.off('navigate_to_page', handleNavigateToPage);
        };
    }, [socket, navigate]);

    const handleScan = (result) => {
        if (errorMessage) return;

        try {
            const url = new URL(result);
            const host = url.host;
            
            if (!ALLOWED_HOSTS.includes(host)) {
                setErrorMessage(`Invalid QR code: Not a game link from Realm Quest (got: ${host})`);
                return;
            }

            const path = url.pathname;
            if (path.startsWith('/combat/') || path.startsWith('/treasure/')) {
                console.log('🔍 Socket status:', socket ? 'Connected' : 'Not connected');
                console.log('🔍 Session ID:', sessionDetails?.session_id);
                
                if (socket && sessionDetails?.session_id) {
                    console.log('📡 Emitting qr_code_scanned event...');
                    socket.emit('qr_code_scanned', {
                        sessionId: sessionDetails.session_id,
                        path: path,
                        scannedBy: 'current_user'
                    });
                    console.log(`QR code scanned, notifying all players in session ${sessionDetails.session_id}`);
                } else {
                    console.log('❌ Missing socket or session, falling back to direct navigation');
                    navigate(path);
                }
            } else {
                setErrorMessage('Invalid QR code: Not a valid game activity');
            }
        } catch (error) {
            setErrorMessage('Invalid QR code: Not a valid URL');
        }
    };

    return (
        <div className="scanner-page">
            <div className="scanner-page-banner">
                <img src="/images/banners/game-dashboard-banner.jpg" alt="Scanner Banner" />
            </div>

            <div className="scanner-page-top-content">
                <div className="scanner-page-top-left">
                    <button onClick={() => navigate('/gameplay')}>Close Camera</button>
                </div>
                <div className="scanner-page-top-right">
                    <GameSettings />
                </div>
            </div>

            <div className="scanner-page-middle-content">
                <h1>Scan QR Code</h1>
                {errorMessage && (
                    <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>
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