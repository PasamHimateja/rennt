import BASE_URL, { fetchWithAuth } from "@/src/config/Api";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import COLORS from "../../theme/colors";

const WHITE = COLORS.WHITE;
const NAVY = COLORS.PRIMARY;
const LIGHT_PURPLE = COLORS.PRIMARY_LIGHT;

const apiKey = process.env.EXPO_PUBLIC_OTP_API_KEY;

export default function OwnerLoginScreen({ navigation }) {

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpInputs = useRef([]);
  const [sessionId, setSessionId] = useState("");
  const [showOTPField, setShowOTPField] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const PRIMARY = LIGHT_PURPLE;

  // VALIDATE PHONE
  const validatePhone = (phone) => {
    return /^[6-9][0-9]{9}$/.test(phone);
  };

  // SEND OTP
  const handleSendOTP = async () => {

    if (!validatePhone(phone)) {
      setErrors({ phone: "Enter valid mobile number" });
      return;
    }

    try {

      setLoading(true);

      const response = await fetch(
        `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/AUTOGEN3/OTP1`
      );

      const data = await response.json();

      console.log("SEND OTP RESPONSE:", data);

      if (data.Status === "Success") {

        setSessionId(data.Details);
        setShowOTPField(true);
        setOtp(["", "", "", ""]);
        setErrors({});

        Alert.alert("Success", "OTP Sent Successfully");

      } else {

        Alert.alert("Error", "Failed To Send OTP. Please try again.");

      }

    } catch (error) {

      console.log("SEND OTP ERROR:", error);
      Alert.alert("Error", "Something went wrong. Check your internet.");

    } finally {

      setLoading(false);

    }

  };

  // VERIFY OTP
  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      setErrors({ otp: "Enter valid 4-digit OTP" });
      return;
    }

    try {

      setLoading(true);

      const verifyResponse = await fetch(
        `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otpString}`
      );

      const verifyData = await verifyResponse.json();

      console.log("VERIFY OTP RESPONSE:", verifyData);

      if (verifyData.Status === "Success") {

        try {

          // CHECK OWNER EXISTS
          const checkResponse = await fetchWithAuth(
            `${BASE_URL}/api/check-owner/${phone}/`
          );

          const userData = await checkResponse.json();

          console.log("CHECK USER:", userData);

          if (userData.exists) {

            if (userData.token) await AsyncStorage.setItem("userToken", userData.token);
            await AsyncStorage.setItem("ownerPhone", userData.user.id);

            const raw = await AsyncStorage.getItem("loggedInOwnerAccounts");
            let accounts = raw ? JSON.parse(raw) : [];
            if (!accounts.find(a => a.phone === userData.user.phone)) {
              accounts.push({ phone: userData.user.phone, name: userData.user.name });
              await AsyncStorage.setItem("loggedInOwnerAccounts", JSON.stringify(accounts));
            }

            if (userData.status === "pending" || userData.status === "suspend") {
              navigation.replace("WaitingScreen", {
                phone: userData.user.id,
              });
            } else {
              Alert.alert("Welcome", "Login Successful");
              navigation.reset({
                index: 0,
                routes: [{ name: "OwnerNavigation", params: { phone: userData.user.id } }],
              });
            }

          } else {

            // NEW OWNER
            navigation.navigate("OwnerRegistrationScreen", {
              phone: phone,
            });

          }

        } catch (error) {

          console.log("CHECK USER ERROR:", error);
          Alert.alert("Error", "User check failed. Try again.");

        }

      } else {

        // CLEAR OTP ON WRONG ENTRY
        setOtp(["", "", "", ""]);
        otpInputs.current[0]?.focus();
        setErrors({ otp: "Invalid OTP. Please try again." });

      }

    } catch (error) {

      console.log("VERIFY OTP ERROR:", error);
      Alert.alert("Error", "OTP Verification Failed. Check your internet.");

    } finally {

      setLoading(false);

    }

  };

  // RESEND OTP HANDLER
  const handleResendOTP = () => {
    setOtp(["", "", "", ""]);
    setErrors({});
    setShowOTPField(false);
    setSessionId("");
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} translucent={false} />

      <ImageBackground
        source={require("../../../assets/images/starting.png")}
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* Light lavender overlay */}
        <View style={styles.overlay} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.innerContainer}
        >
          {/* ── TOP HEADER ── */}
          <View style={styles.headerContainer}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="business" size={36} color={NAVY} />
            </View>
            <Text style={styles.headerTitle}>Welcome Owner</Text>
            <Text style={styles.headerSubtitle}>
              Let's get you started with your property management
            </Text>
          </View>

          {/* ── WHITE CARD ── */}
          <View style={styles.card}>

            {/* Shield-checkmark icon */}
            <View style={styles.cardIconContainer}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="shield-checkmark" size={32} color={NAVY} />
              </View>
            </View>

            {/* TITLE */}
            <Text style={styles.title}>Get Started</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

            {/* PHONE INPUT */}
            <View style={[
              styles.inputContainer,
              showOTPField && styles.inputDisabled,
            ]}>
              <Ionicons
                name="call-outline"
                size={20}
                color={showOTPField ? COLORS.TEXT_SECONDARY : PRIMARY}
              />
              <TextInput
                placeholder="Enter Mobile Number"
                placeholderTextColor="#8A8F98"
                style={styles.input}
                keyboardType="number-pad"
                maxLength={10}
                editable={!showOTPField}
                value={phone}
                onChangeText={(text) => {
                  const clean = text.replace(/[^0-9]/g, "");
                  setPhone(clean);
                  setErrors((prev) => ({ ...prev, phone: "" }));
                }}
              />
            </View>

            {errors.phone ? (
              <Text style={styles.error}>{errors.phone}</Text>
            ) : null}

            {/* OTP INPUT */}
            {showOTPField && (
              <View>
                <View style={styles.otpWrapper}>
                  {[0, 1, 2, 3].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputs.current[index] = ref)}
                      style={styles.otpBox}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? 4 : 1}
                      value={otp[index]}
                      autoFocus={index === 0}
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      onChangeText={(value) => {
                        console.log(`[OTP DEBUG] index: ${index}, value received: "${value}"`);
                        if (value.length > 1) {
                          const pasted = value.slice(0, 4).replace(/[^0-9]/g, "").split("");
                          while (pasted.length < 4) pasted.push("");
                          setOtp(pasted);
                          setErrors((prev) => ({ ...prev, otp: "" }));
                          if (pasted.join("").length === 4) {
                            otpInputs.current[3]?.focus();
                          }
                          return;
                        }
                        setOtp((prevOtp) => {
                          const newOtp = [...prevOtp];
                          newOtp[index] = value;
                          return newOtp;
                        });
                        setErrors((prev) => ({ ...prev, otp: "" }));
                        if (value && index < 3) {
                          otpInputs.current[index + 1]?.focus();
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
                          otpInputs.current[index - 1]?.focus();
                        }
                      }}
                    />
                  ))}
                </View>

                {errors.otp ? (
                  <Text style={styles.error}>{errors.otp}</Text>
                ) : null}

                {/* RESEND OTP BUTTON */}
                <TouchableOpacity
                  onPress={handleResendOTP}
                  style={styles.resendBtn}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>
                    Wrong number or didn't receive OTP?{" "}
                    <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MAIN BUTTON — deep purple gradient matching RoleSection */}
            <TouchableOpacity
              style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
              onPress={showOTPField ? handleVerifyOTP : handleSendOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#4A00E0", "#6A1FD8", "#8E2DE2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {showOTPField ? "Verify OTP" : "Get OTP"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* ── FOOTER ── */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />
            <Text style={styles.footerText}>  Secure • Fast • Trusted Platform</Text>
          </View>

        </KeyboardAvoidingView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({

  bgImage: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(237, 230, 255, 0.72)",
  },

  innerContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  // ── HEADER ──
  headerContainer: {
    alignItems: "center",
    marginBottom: 28,
  },

  headerIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    elevation: 4,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#3B0764",
    textAlign: "center",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 19,
  },

  // ── CARD ──
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 30,
    elevation: 12,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    width: "88%",
    alignSelf: "center",
  },

  // ── SHIELD ICON inside card ──
  cardIconContainer: {
    alignItems: "center",
    marginBottom: 14,
    position: "relative",
  },

  cardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },

  sparkle: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
    opacity: 0.6,
  },
  sparkleTopLeft: { top: 2, left: "28%" },
  sparkleTopRight: { top: 0, right: "28%" },
  sparkleBottomLeft: { bottom: 2, left: "22%" },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0B1F3A",
    marginBottom: 4,
  },

  subtitle: {
    textAlign: "center",
    marginBottom: 22,
    color: "#6B7280",
    fontSize: 13,
  },

  // ── INPUT ──
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },

  inputDisabled: {
    backgroundColor: "#F0F0F0",
    borderColor: "#DDDDDD",
    opacity: 0.7,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: "#1F2937",
  },

  // ── OTP ──
  otpWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 15,
    marginTop: 10,
  },

  otpBox: {
    width: 50,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D8D8E0",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "500",
    color: "#1F2937",
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // ── BUTTON ──
  buttonWrapper: {
    borderRadius: 14,
    marginTop: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#4A00E0",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  button: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  error: {
    color: "red",
    fontSize: 12,
    marginLeft: 5,
    marginBottom: 8,
  },

  resendBtn: {
    alignItems: "center",
    marginBottom: 5,
    marginTop: 2,
  },

  resendText: {
    color: "#6B7280",
    fontSize: 13,
  },

  resendLink: {
    color: LIGHT_PURPLE,
    fontWeight: "bold",
  },

  // ── FOOTER ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 16,
  },

  footerText: {
    color: "#6B7280",
    fontSize: 12,
  },

});
