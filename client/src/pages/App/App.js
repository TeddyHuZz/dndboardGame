import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Layouts
import MainLayout from '../../layouts/MainLayout';
import MinimalLayout from '../../layouts/MinimalLayout';

// Pages
import Landing from '../Landing/Landing';
import Signin from '../../components/Authentication/Signin';
import Signup from '../../components/Authentication/Signup';
import GameDashboard from '../Game Dashboard/GameDashboard';

const LocationHandler = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      alert(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return null;
};

const PrivateRoutes = () => {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoutes = () => {
  const { session } = useAuth();
  return !session ? <Outlet /> : <Navigate to="/game-dashboard" replace />;
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