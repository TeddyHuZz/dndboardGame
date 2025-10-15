import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from '../../context/AuthContext';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <LocationHandler />
        <Routes>
          {/* --- Routes with the FULL header --- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/game-dashboard" element={<GameDashboard />} />
          </Route>

          {/* --- Routes with the MINIMAL header --- */}
          <Route element={<MinimalLayout />}>
            <Route path="/login" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;