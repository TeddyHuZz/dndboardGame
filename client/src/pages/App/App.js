import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { RoomSessionProvider } from "../../context/RoomSessionContext";
import { SocketProvider, useSocket } from "../../context/SocketContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navigate } from "react-router-dom";

// Layouts
import MainLayout from "../../layouts/MainLayout";
import MinimalLayout from "../../layouts/MinimalLayout";

// Pages
import Landing from "../Landing/Landing";
import Signin from "../../components/Authentication/Signin";
import Signup from "../../components/Authentication/Signup";
import GameDashboard from "../Game Dashboard/GameDashboard";
import CharacterSelection from "../Character Selection/CharacterSelection";
import Gameplay from "../Gameplay/Gameplay";
import ScannerPage from "../Scan QR/ScannerPage";
import CombatRoom from "../Combat/CombatRoom";
import TreasureRoom from "../Treasure Room/TreasureRoom";
import LoadGame from "../../components/GameFile/LoadGame";

const SocketNavigator = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleNavigate = (data) => {
      console.log("Received navigation event:", data.path);
      navigate(data.path);
    };

    const handleShowNotification = (data) => {
      console.log("Received notification event:", data.message);
      toast.info(data.message);
    };

    socket.on("navigate_to_page", handleNavigate);
    socket.on("show_notification", handleShowNotification);

    return () => {
      socket.off("navigate_to_page", handleNavigate);
      socket.off("show_notification", handleShowNotification);
    };
  }, [socket, navigate]);

  return null;
};

const LocationHandler = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setTimeout(() => {
        alert(location.state.message);
      }, 100);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return null;
};

const PrivateRoutes = () => {
  const { session } = useAuth();
  return session ? (
    <RoomSessionProvider>
      <SocketProvider>
        <SocketNavigator />
        <Outlet />
      </SocketProvider>
    </RoomSessionProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

const PublicRoutes = () => {
  const { session } = useAuth();
  return !session ? <Outlet /> : <Navigate to="/game-dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
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
        <LocationHandler />
        <Routes>
          {/* --- Publicly accessible routes --- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          {/* --- Routes for logged-in users --- */}
          <Route element={<PrivateRoutes />}>
            <Route element={<MainLayout />}>
              <Route path="/game-dashboard" element={<GameDashboard />} />
              <Route path="/load-game" element={<LoadGame />} />
            </Route>
            <Route element={<MinimalLayout />}>
              <Route
                path="/character-selection"
                element={<CharacterSelection />}
              />
            </Route>
            {/* Zero header for gameplay */}
            <Route>
              <Route path="/gameplay" element={<Gameplay />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/combat/:encounterId" element={<CombatRoom />} />
              <Route path="/treasure/:encounterId" element={<TreasureRoom />} />
            </Route>
          </Route>

          {/* --- Routes for non-logged-in users --- */}
          <Route element={<PublicRoutes />}>
            <Route element={<MinimalLayout />}>
              <Route path="/login" element={<Signin />} />
              <Route path="/signup" element={<Signup />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
