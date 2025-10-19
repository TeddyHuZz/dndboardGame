import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const DropdownMenu = ({ onSignOut }) => {
  return (
    <div className="dropdown-menu">
      <Link to="/profile">Profile</Link>
      <button onClick={onSignOut} className="dropdown-logout-button">Log Out</button>
    </div>
  );
};

const Header = ({ variant = 'full' }) => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Wait for signout to complete before navigating
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      alert(error.message);
    }
  };

  // The minimal header
  if (variant === 'minimal') {
    return (
      <header className="header">
            <div className="header-content-wrapper">
              <div className="header-logo">
                <Link to="/" className="header-logo-link">
                  <img src="/images/logo/gameLogo.png" alt="Game Logo" />
                  <span className="header-logo-text">Realm Quest</span>
                </Link>
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
              <Link to="/" className="header-logo-link">
                <img src="/images/logo/gameLogo.png" alt="Game Logo" />
                <span className="header-logo-text">Realm Quest</span>
              </Link>
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
              {/* 5. Make the username clickable to toggle the dropdown */}
              <button onClick={toggleDropdown} className="user-profile-button">
                Welcome back, {profile ? profile.username : session.user.email}
              </button>
              {/* 6. Conditionally render the dropdown */}
              {isOpen && <DropdownMenu onSignOut={handleSignOut} />}
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


export { DropdownMenu };
export default Header;