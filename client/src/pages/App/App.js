import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../../context/AuthContext';

// Layouts
import MainLayout from '../../layouts/MainLayout';
import MinimalLayout from '../../layouts/MinimalLayout';

// Pages
import LandingPage from '../Landing/Landing';
import Login from '../../components/Authentication/Signin';
import Signup from '../../components/Authentication/Signup';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* --- Routes with the FULL header --- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* --- Routes with the MINIMAL header --- */}
          <Route element={<MinimalLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;