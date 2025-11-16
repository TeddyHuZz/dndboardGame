import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./Auth.css";

const Signin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        if (window.location.hash.includes("type=signup")) {
            alert("Your account has been successfully verified!");
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);
    
    const handleChange = (e) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            [e.target.name]: e.target.value,
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (e.target.disabled) return;
        e.target.disabled = true;
        
        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });
    
            if (error) throw error;
    
            console.log('Login successful, navigating...');
            
            setTimeout(() => {
                navigate("/game-dashboard", { replace: true });
            }, 300);
    
        } catch (error) {
            alert(error.error_description || error.message);
            e.target.disabled = false;
        }
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
                        id="email"
                        name="email"
                        placeholder="youremail@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <label htmlFor="password" className="input-label">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Signin;