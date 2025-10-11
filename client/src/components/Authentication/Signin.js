import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const Signin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
    };

    return (
        <div className="auth-container">
            <div className="auth-form-container">
                <div className="form-toggle">
                    <button className="active" onClick={() => navigate("/login")}>
                        Sign In
                    </button>
                    <button onClick={() => navigate("/signup")}>
                        Sign Up
                    </button>
                </div>
                <h2>Welcome Back</h2>
                <p>Continue your legendary journey</p>
                <form onSubmit={handleLogin}>
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
                    <button type="submit">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Signin;