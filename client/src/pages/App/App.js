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
import { RoomSessionProvider } from "../../context/RoomSessionContext"; // Ensure this path is correct

// Layouts
import MainLayout from "../../layouts/MainLayout";
import MinimalLayout from "../../layouts/MinimalLayout";

// Pages
import Landing from "../Landing/Landing";
import Signin from "../../components/Authentication/Signin";
import Signup from "../../components/Authentication/Signup";
import GameDashboard from "../Game Dashboard/GameDashboard";

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
  // If authenticated, render child routes within the RoomSessionProvider.
  // Otherwise, redirect.
  return session ? (
    <RoomSessionProvider>
      <Outlet />
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