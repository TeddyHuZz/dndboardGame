import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();

    const handleSignup = (e) => {
        e.preventDefault();
        console.log("Signup email:", email, "password:", password);
    };

    return (
        <div className="auth-container">
            <div className="auth-form-container">
                 <div className="form-toggle">
                    <button onClick={() => navigate("/login")}>
                        Sign In
                    </button>
                    <button className="active" onClick={() => navigate("/signup")}>
                        Sign Up
                    </button>
                </div>
                <h2>Create Account</h2>
                <p>Start your legendary journey</p>
                <form onSubmit={handleSignup}>
                    <label htmlFor="email" className="input-label">Email</label>
                    <input
                        type="email"
                        placeholder="youremail@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <label htmlFor="password" className="input-label">Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                    <input
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </div>
    );
};

export default Signup;