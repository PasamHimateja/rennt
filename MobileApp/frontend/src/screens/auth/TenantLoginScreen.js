import Ionicons from "@expo/vector-icons/Ionicons";
// import { useRouter } from "expo-router";
import { useState, useContext } from "react";
import { BookingContext } from "@/src/context/BookingContext";
import { useLanguage } from "../../utils/LanguageContext";
 
import BASE_URL, { fetchWithAuth } from "@/src/config/Api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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
const GRAY = COLORS.TEXT_SECONDARY;
const LIGHT_GRAY = COLORS.CARD;
 
export default function TenantLoginScreen({ navigation }) {
  const { setuserPhone } = useContext(BookingContext);
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // const router = useRouter();
 
 
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
  const removeEmojis = (text) => {
    return text.replace(/[\u{1F600}-\u{1F6FF}|\u{2600}-\u{27BF}]/gu, "");
  };
 
  const validateForm = () => {
    let newErrors = {};
 
    if (!phone.trim()) {
      newErrors.phone = t("email_required");
    } else if (!emailRegex.test(phone.trim())) {
      newErrors.phone = t("invalid_email");
    }
 
    if (!password.trim()) {
      newErrors.password = t("password_required");
    } else if (password.trim().length < 8) {
      newErrors.password = t("min_8_chars");
    }
 
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 
  const isValid = emailRegex.test(phone.trim()) && password.trim().length >= 6;
 
  const navigateTo = (screen, params = {}) => {
    navigation.navigate(screen, params);
  };
 
  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
 
    try {
      const response = await fetchWithAuth(`${BASE_URL}/api/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
          password: password.trim(),
        }),
      });
 
      const text = await response.text();
      console.log("RAW RESPONSE:", text);
 
      const data = JSON.parse(text);
 
      if (response.ok) {
        // ⭐ SAVE phone & token
        await AsyncStorage.setItem("tenantPhone", data.phone);
        if (data.token) {
            await AsyncStorage.setItem("userToken", data.token);
            console.log("Saved userToken:", data.token);
        }
        setuserPhone(data.phone); // ✅ Update BookingContext
        console.log("Saved Tenant phone:", data.phone);
 
        // ⭐ CHECK REQUEST STATUS
        try {
          const res = await fetchWithAuth(
            `${BASE_URL}/api/tenant_notifications/${encodeURIComponent(data.phone)}/`
          );
 
          const requests = await res.json();
          const acceptedRequest = requests.find(
            (item) => item.status === "accepted"
          );
 
          if (acceptedRequest) {
            const welcomeKey = `welcomeSeen_${acceptedRequest.id}`;
            const welcomeSeen = await AsyncStorage.getItem(welcomeKey);
 
            if (welcomeSeen !== "true") {
              navigation.replace("WelcomeScreen", {
                propertyName: acceptedRequest.propertyName || acceptedRequest.property_name,
                requestId: acceptedRequest.id,
              });
            } else {
              navigation.replace("TenantNavigation");
            }
          } else {
            navigation.replace("TenantNavigation");
          }
        } catch (error) {
          console.log("Status check error:", error);
          navigation.replace("TenantNavigation");
        }
 
      } else {
        alert(data.error || t("login_failed"));
      }
 
    } catch (error) {
      console.log("FETCH ERROR:", error);
      alert(t("server_error"));
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 100 }}
      >
        <Ionicons name="arrow-back" size={28} color={NAVY} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.card}>
          {/* Top Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="person-circle-outline"
              size={70}
              color={LIGHT_PURPLE}
            />
          </View>
 
          <Text style={styles.title}>{t("tenant_login")}</Text>
          <Text style={styles.subtitle}>
            {t("tenant_subtitle")}
          </Text>
 
          {/* phone */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={NAVY} />
            <TextInput
              placeholder={t("email_placeholder")}
              placeholderTextColor="#999"
              style={styles.input}
              value={phone}
              onChangeText={(text) => setPhone(removeEmojis(text))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
 
          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={NAVY} />
 
            <TextInput
              placeholder={t("password_placeholder")}
              placeholderTextColor="#8A8F98"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={(t) => setPassword(removeEmojis(t))}
            />
 
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color={NAVY}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )}
 
          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, (!isValid || loading) && styles.buttonDisabled]}
            disabled={!isValid || loading}
            onPress={handleLogin}
          >
            <Text style={styles.loginText}>
              {loading ? t("loading") || "Loading..." : t("login_title")}
            </Text>
          </TouchableOpacity>
 
          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={() => navigateTo("ForgetPasswordScreen")}
          >
            <Text style={[styles.forgotText, { color: NAVY }]}>
              {t("forgot_password")}
            </Text>
          </TouchableOpacity>
 
          {/* Register */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{t("dont_have_account")}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TenantRegisterScreen")}
            >
              <Text style={styles.registerText}> {t("register_now")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
 
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
  },
 
  iconContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
 
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: NAVY,
  },
 
  subtitle: {
    textAlign: "center",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 25,
    marginTop: 6,
  },
 
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GRAY,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
 
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
 
  error: {
    color: COLORS.ERROR,
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 5,
  },
 
  loginButton: {
    backgroundColor: NAVY,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
 
  buttonDisabled: {
    opacity: 0.6,
  },
 
  loginText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "bold",
  },
 
  forgotContainer: {
    alignItems: "center",
    marginTop: 15,
  },
 
  forgotText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "500",
  },
 
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
 
  bottomText: {
    color: GRAY,
  },
 
  registerText: {
    color: NAVY,
    fontWeight: "bold",
  },
});
 


