import React, { useState } from "react";
import logo from "../assets/logo.png";
import "./../App.css";

import BASE_URL from "../config/Api";

const Login = ({ onLogin }) => {
    const [phone, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${BASE_URL}/api/admin-login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem("adminToken", data.token);
                onLogin();
            } else {
                setError(data.error || "Invalid phone or password.");
            }
        } catch (err) {
            setError("Network error occurred: " + err.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="Stayefy Logo" className="login-logo" />
                    <h1 className="login-brand">Stay<span className="brand-purple">efy</span></h1>
                    <p className="login-subtitle">Admin Control Panel</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>phone Address</label>
                        <input
                            type="phone"
                            placeholder="admin@stayefy.com"
                            value={phone}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="login-error">{error}</p>}

                    <button type="submit" className="login-button">
                        Sign In
                    </button>

                    <div className="login-footer">
                        <a href="#">Forgot password?</a>
                    </div>
                </form>
            </div>

            <div className="login-bg-decoration">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
            </div>
        </div>
    );
};

export default Login;

