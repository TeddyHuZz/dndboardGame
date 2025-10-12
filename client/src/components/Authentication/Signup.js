import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./Auth.css";

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                    },
                    emailRedirectTo: `${window.location.origin}/login`,
                },
            });

            if (error) throw error;

            alert("Account created successfully! Please check your email for a verification link.");
            navigate("/login");

        } catch (error) {
            alert(error.error_description || error.message);
        }
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
                    <label htmlFor="username" className="input-label">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        placeholder="Enter your username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
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
                    <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </div>
    );
};

export default Signup;