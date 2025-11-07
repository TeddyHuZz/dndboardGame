import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RoomSessionProvider } from "./context/RoomSessionContext";
import { SocketProvider, useSocket } from "./context/SocketContext";
import { ToastContainer, toast } from 'react-toastify'; // Import toast
import 'react-toastify/dist/ReactToastify.css'; // Import toast CSS
import LoadGame from "./components/GameFile/LoadGame";

// A new component to handle socket-based navigation
const SocketNavigator = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleNavigate = (data) => {
      console.log("Received navigation event:", data.path);
      navigate(data.path);
    };

    // --- This is the new listener ---
    const handleShowNotification = (data) => {
      console.log("Received notification event:", data.message);
      toast.info(data.message); // Display the message as a toast
    };

    socket.on("navigate_to_page", handleNavigate);
    socket.on("show_notification", handleShowNotification); // Listen for notifications

    return () => {
      socket.off("navigate_to_page", handleNavigate);
      socket.off("show_notification", handleShowNotification); // Clean up listener
    };
  }, [socket, navigate]);

  return null; // This component does not render anything
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoomSessionProvider>
          <SocketProvider>
            {/* Add the ToastContainer at the top level */}
            <ToastContainer
              position="top-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
            <SocketNavigator />
            <div className="App">
              <Navbar />
              <main>
                <Routes>
                  {/* ... your other routes ... */}
                  <Route path="/gameplay" element={<Gameplay />} />
                  <Route path="/combat/:encounterId" element={<CombatPage />} />
                  <Route path="/scanner" element={<ScannerPage />} />
                  <Route path="/load-game" element={<LoadGame />} />
                  {/* ... your other routes ... */}
                </Routes>
              </main>
            </div>
          </SocketProvider>
        </RoomSessionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;