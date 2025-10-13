import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = ({ variant = 'full' }) => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { state: { message: 'Signed out successfully!' } });
    } catch (error) {
      alert(error.message);
    }
    navigate('/', { state: { message: 'Signed out successfully!' } });
  }

  // The minimal header
  if (variant === 'minimal') {
    return (
      <header className="header">
        <div className="header-content-wrapper">
          <div className="header-logo">
            <Link to="/">Game Logo</Link>
          </div>
        </div>
      </header>
    );
  }

  // The full header
  return (
    <header className="header">
      <div className="header-content-wrapper">
        <div className="header-left">
          <div className="header-logo">
            <Link to="/">Game Logo</Link>
          </div>
        </div>

        <div className="header-center">
          <nav className="navigation-menu">
            <Link to="/Characters">Characters</Link>
            <Link to="/Rules">Rules</Link>
            <Link to="/Community">Community</Link>
            <Link to="/Contact">Contact</Link>
          </nav>
        </div>

        <div className="header-right">
          {session ? (
              <div className="user-profile">
                {/* Corrected ternary operator with a fallback to the email */}
                <span>Welcome back, {profile ? profile.username : session.user.email}</span>
                <button onClick={handleSignOut} className="logoutButton">Log Out</button>
              </div>
            ) : (
            // If user is not logged in
            <div className="auth-buttons">
              <Link to="/login" className="signinButton">Log In</Link>
              <Link to="/signup" className="signupButton">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;