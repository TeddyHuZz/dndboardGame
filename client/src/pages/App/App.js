import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../../context/AuthContext';

// Layouts
import MainLayout from '../../layouts/MainLayout';
import MinimalLayout from '../../layouts/MinimalLayout';

// Pages
import LandingPage from '../Landing/Landing';

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

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;