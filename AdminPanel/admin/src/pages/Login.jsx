import React, { useState } from "react";
import logo from "../assets/AdminLogo.png";
import "./../App.css";
import BASE_URL from "../config/Api";

const Login = ({ onLogin }) => {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");

    const [otpSent, setOtpSent] = useState(false);
    const [showPasswordField, setShowPasswordField] = useState(false);
    const [isCreatePassword, setIsCreatePassword] = useState(false);

    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {

            // ================= STEP 1 =================
            // Check password status first
            if (!otpSent && !showPasswordField) {

                const checkResponse = await fetch(
                    `${BASE_URL}/api/check-admin-password-status/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ phone }),
                    }
                );

                const checkData = await checkResponse.json();

                // Password exists and valid
                if (checkData.status === "valid") {
                    setShowPasswordField(true);
                    setIsCreatePassword(false);
                    setError("");
                    return;
                }

                // Password expired or not exists
                const otpResponse = await fetch(
                    `${BASE_URL}/api/send-admin-otp/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ phone }),
                    }
                );

                const otpData = await otpResponse.json();

                if (otpResponse.ok) {
                    setOtpSent(true);
                    setError("");
                    alert("OTP sent successfully");
                } else {
                    setError(otpData.error);
                }

                return;
            }

            // ================= STEP 2 =================
            // Verify OTP
            if (otpSent && !showPasswordField) {

                const response = await fetch(
                    `${BASE_URL}/api/verify-admin-otp/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            phone,
                            otp,
                        }),
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setShowPasswordField(true);
                    setIsCreatePassword(true);
                    setError("");
                } else {
                    setError(data.error);
                }

                return;
            }

            // ================= STEP 3 =================
            // Login or Create Password
            if (showPasswordField) {

                const response = await fetch(
                    `${BASE_URL}/api/admin-password/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            phone,
                            password,
                            action: isCreatePassword
                                ? "create"
                                : "login",
                        }),
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem(
                        "adminToken",
                        data.token
                    );

                    onLogin();
                } else {
                    setError(data.error);
                }
            }

        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="login-header">
                    <img
                        src={logo}
                        alt="Admin Logo"
                        className="login-logo"
                    />

                    <p className="login-subtitle">
                        Admin Control Panel
                    </p>
                </div>

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                    {/* PHONE */}
                    <div className="form-group">
                        <label>Phone Number</label>

                        <input
                            type="tel"
                            placeholder="Enter admin phone number"
                            value={phone}
                            onChange={(e) =>
                                setPhone(e.target.value)
                            }
                            required
                            disabled={
                                otpSent || showPasswordField
                            }
                        />
                    </div>

                    {/* OTP */}
                    {otpSent && !showPasswordField && (
                        <div className="form-group">
                            <label>Enter OTP</label>

                            <input
                                type="text"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) =>
                                    setOtp(e.target.value)
                                }
                                required
                            />
                        </div>
                    )}

                    {/* PASSWORD */}
                    {showPasswordField && (
                        <div className="form-group">

                            <label>
                                {isCreatePassword
                                    ? "Create Password"
                                    : "Enter Password"}
                            </label>

                            <input
                                type="password"
                                placeholder={
                                    isCreatePassword
                                        ? "Create new password"
                                        : "Enter existing password"
                                }
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />
                        </div>
                    )}

                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                    >
                        {!otpSent && !showPasswordField
                            ? "Continue"
                            : otpSent && !showPasswordField
                            ? "Verify OTP"
                            : isCreatePassword
                            ? "Create Password & Login"
                            : "Login"}
                    </button>

                    <div className="login-footer">
                        <p>
                            Only authorized admin can
                            access this panel.
                        </p>
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