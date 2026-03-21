import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { loginUser, registerUser } from "../services/api";

type Props = {
  onLogin: (user: any, token: string) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await loginUser(email, password);
      } else {
        if (password !== confirmPassword) {
          Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
          setLoading(false);
          return;
        }
        data = await registerUser(username, email, password);
      }
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <MaterialIcons name="whatshot" size={32} color="#ffffff" />
          </View>
          <Text style={styles.logoText}>AquaChat</Text>
          <Text style={styles.subtitle}>Clean. Modern. Real-time.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.tabActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Connexion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.tabActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Inscription</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.input}
                placeholder="alex_chat"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor={Colors.gray400}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="alex@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={Colors.gray400}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={22} color={Colors.gray400} />
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={Colors.gray400}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={22} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLogin ? styles.buttonPrimary : styles.buttonAccent]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Se connecter" : "Créer un compte"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  logoEmoji: { fontSize: 28 },
  logoText: { fontSize: 32, fontWeight: "800", color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: Colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  tabs: {
    flexDirection: "row", backgroundColor: Colors.gray100, borderRadius: 12,
    padding: 4, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: Colors.white, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.text },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  input: {
    height: 48, borderRadius: 14, backgroundColor: Colors.gray100, paddingHorizontal: 16,
    fontSize: 15, color: Colors.text,
  },
  passwordContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.gray100, borderRadius: 14, height: 48,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 16, fontSize: 15, color: Colors.text, height: "100%",
  },
  eyeIcon: { padding: 12 },
  button: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonPrimary: { backgroundColor: Colors.primary },
  buttonAccent: { backgroundColor: Colors.accent },
  buttonText: { fontSize: 15, fontWeight: "700", color: Colors.white },
});
