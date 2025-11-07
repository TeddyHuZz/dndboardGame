import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

const DropdownMenu = ({ onSignOut }) => {
  return (
    <div className="dropdown-menu">
      <Link className="dropdown-link" to="/profile">
        Profile
      </Link>
      <button onClick={onSignOut} className="dropdown-logout-button">
        Log Out
      </button>
    </div>
  );
};

const Header = ({ variant = "full" }) => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      closeMobileMenu();
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
    } catch (error) {
      console.error("Sign out error:", error);
      alert(error.message);
    }
  };

  // The minimal header
  if (variant === "minimal") {
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

  // The full header with mobile menu
  return (
    <header className="header">
      <div className="header-content-wrapper">
        <div className="header-left">
          <div className="header-logo">
            <Link to="/" className="header-logo-link" onClick={closeMobileMenu}>
              <img src="/images/logo/gameLogo.png" alt="Game Logo" />
              <span className="header-logo-text">Realm Quest</span>
            </Link>
          </div>
        </div>

        {/* Hamburger Menu Button */}
        <button
          className={`hamburger-menu ${isMobileMenuOpen ? "active" : ""}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation - Render based on mobile menu state for better accessibility and to prevent overlap */}
        {(isMobileMenuOpen || window.innerWidth >= 768) && (
          <div
            className={`header-nav-container ${
              isMobileMenuOpen ? "mobile-open" : ""
            }`}
          >
            <div className="header-center">
              <nav className="navigation-menu">
                <Link to="/Characters" onClick={closeMobileMenu}>
                  Characters
                </Link>
                <Link to="/Rules" onClick={closeMobileMenu}>
                  Rules
                </Link>
                <Link to="/Community" onClick={closeMobileMenu}>
                  Community
                </Link>
                <Link to="/Contact" onClick={closeMobileMenu}>
                  Contact
                </Link>
              </nav>
            </div>

            <div className="header-right">
              {session ? (
                <div className="user-profile">
                  <button
                    onClick={toggleDropdown}
                    className="user-profile-button"
                  >
                    Welcome back,{" "}
                    {profile ? profile.username : session.user.email}
                  </button>
                  {isOpen && <DropdownMenu onSignOut={handleSignOut} />}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link
                    to="/login"
                    className="signinButton"
                    onClick={closeMobileMenu}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="signupButton"
                    onClick={closeMobileMenu}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
        )}
      </div>
    </header>
  );
};

export { DropdownMenu };
export default Header;
