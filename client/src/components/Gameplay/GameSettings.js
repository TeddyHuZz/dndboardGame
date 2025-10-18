import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./GameSettings.css";

const GameSettings = () => {
    const navigate = useNavigate();
    const [ isOpen, setIsOpen ] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleExitWithoutSaving = () => {
        navigate('/game-dashboard');
    };
    
    return (
        <div className="dropdown-container" ref={dropdownRef}>
            <button className="settings-button" onClick={toggleDropdown}>
                <img src="/images/logo/settings-button.png" alt="Settings Button" />
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                <ul>
                    <li>Save Game</li>
                    <li>Save Game & Exit</li>
                    <li onClick={handleExitWithoutSaving}>Exit to Main Menu</li>
                </ul>
                </div>
            )}
        </div>
    );
};

export default GameSettings;