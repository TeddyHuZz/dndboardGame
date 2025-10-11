import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = ({ variant = 'full' }) => {
  const { isLoggedIn } = useAuth();

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
          {isLoggedIn ? (
            <div className="user-profile">
              {/* User Profile Component/Link */}
              <span>User Profile</span>
            </div>
          ) : (
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