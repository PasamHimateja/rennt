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

export default function ForgetPasswordScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const PRIMARY = LIGHT_PURPLE;

  const sendResetLink = async () => {
    if (!phone) {
      Alert.alert("Error", "Enter phone");
      return;
    }

    try {
      const response = await fetchWithAuth(`${BASE_URL}/api/forgot-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      Alert.alert("Message", data.message);
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
              <Ionicons name="mail-outline" size={75} color={PRIMARY} />
            </View>

            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your phone to receive reset link
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={PRIMARY} />
              <TextInput
                placeholder="phone Address"
                placeholderTextColor="#8A8F98"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={sendResetLink}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={() => navigation.navigate("OwnerLoginScreen")}
            >
              <Text style={[styles.forgotText, { color: NAVY }]}>
                Back to Login
              </Text>
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

  forgotContainer: {
    alignItems: "center",
    marginTop: 15,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

