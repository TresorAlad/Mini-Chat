import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/Colors";

export default function ProfileScreen({ setToken }: { setToken: (t: string | null) => void }) {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    AsyncStorage.getItem("user").then((data) => {
      if (data) setUser(JSON.parse(data));
    });
  }, []);

  const handleLogout = async () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Oui", 
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          setToken(null);
        }
      }
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.username.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>En ligne</Text>
          </View>
        </View>

        <View style={styles.actionsBox}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={Colors.danger} style={{ marginRight: 12 }} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    backgroundColor: Colors.white, 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.primary },
  content: { padding: 24, alignItems: "center" },
  avatarContainer: { 
    alignItems: "center", 
    backgroundColor: Colors.white,
    padding: 32,
    borderRadius: 24,
    width: "100%",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 24
  },
  avatar: { 
    width: 80, height: 80, 
    borderRadius: 40, backgroundColor: Colors.primary, 
    alignItems: "center", justifyContent: "center",
    marginBottom: 16
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  username: { fontSize: 22, fontWeight: "bold", color: Colors.text },
  email: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  statusBadge: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: Colors.success + "20", 
    paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, marginTop: 12 
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 6 },
  statusText: { color: Colors.success, fontSize: 13, fontWeight: "600" },
  actionsBox: { 
    backgroundColor: Colors.white, 
    width: "100%", borderRadius: 20, padding: 8,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  logoutBtn: { 
    flexDirection: "row", alignItems: "center", padding: 16,
    borderRadius: 12, backgroundColor: Colors.danger + "10" 
  },
  logoutIcon: { fontSize: 20, marginRight: 12 },
  logoutText: { fontSize: 16, fontWeight: "600", color: Colors.danger },
});
