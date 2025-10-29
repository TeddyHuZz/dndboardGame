import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { RoomSessionProvider } from "../../context/RoomSessionContext";
import { SocketProvider } from "../../context/SocketContext";

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

const LocationHandler = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      // Use setTimeout to avoid blocking the render
      setTimeout(() => {
        alert(location.state.message);
      }, 100);

      // Clear the message immediately to prevent re-showing
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
        <Outlet />
      </SocketProvider>
    </RoomSessionProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

const PublicRoutes = () => {
  const { session } = useAuth();
  return !session ? <Outlet /> : <Navigate to="/" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <LocationHandler />
        <Routes>
          {/* --- Publicly accessible routes --- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          {/* --- Routes for logged-in users --- */}
          {/* This structure is now correct. The provider is inside the element. */}
          <Route element={<PrivateRoutes />}>
            <Route element={<MainLayout />}>
              <Route path="/game-dashboard" element={<GameDashboard />} />
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
              <Route path="/combat/:enemySlug" element={<CombatRoom />} />
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
