import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import BASE_URL, { fetchWithAuth } from "@/src/config/Api";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import COLORS from "../../theme/colors";

const WHITE = COLORS.WHITE;
const NAVY = COLORS.PRIMARY;
const LIGHT_PURPLE = COLORS.PRIMARY_LIGHT;

export default function ResetPasswordScreen({ navigation }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const PRIMARY = LIGHT_PURPLE;

  const resetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await fetchWithAuth(`${BASE_URL}/api/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: password,
        }),
      });

      const data = await response.json();
      Alert.alert("Message", data.message);

      navigation.navigate("OwnerLoginScreen");
    } catch (error) {
      Alert.alert("Error", "Server error");
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 100 }}
      >
        <Ionicons name="arrow-back" size={28} color={NAVY} />
      </TouchableOpacity>

      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.innerContainer}
        >
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={75} color={PRIMARY} />
            </View>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your new password</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={PRIMARY} />
              <TextInput
                placeholder="New Password"
                placeholderTextColor="#8A8F98"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={PRIMARY} />
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#8A8F98"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={resetPassword}>
              <Text style={styles.buttonText}>Reset Password</Text>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0B1F3A",
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 30,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
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
  button: {
    backgroundColor: NAVY,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});