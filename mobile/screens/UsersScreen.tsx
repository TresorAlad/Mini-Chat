import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/Colors";
import { getUsers, searchUsers } from "../services/api";

type User = {
  _id: string;
  username: string;
  email: string;
  status: "online" | "offline";
};

type Props = {
  token: string;
  currentUserId: string;
  onSelectUser: (user: User) => void;
  onLogout: () => void;
  currentUsername: string;
};

const avatarColors = [
  "#3B82F6", "#10B981", "#8B5CF6",
  "#F59E0B", "#F43F5E", "#06B6D4",
  "#6366F1", "#EC4899", "#14B8A6",
];

export default function UsersScreen({ token, currentUserId, onSelectUser, onLogout, currentUsername }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (search.length > 0) {
      searchUsers(search, token).then(setUsers).catch(console.error);
    } else {
      loadUsers();
    }
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers(token);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => onSelectUser(item)} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: getColor(item.username) }]}>
        <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
        <View style={[styles.statusDot, { backgroundColor: item.status === "online" ? Colors.success : Colors.gray300 }]} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <Text style={[styles.statusText, item.status === "online" && styles.statusOnline]}>
        {item.status === "online" ? "en ligne" : "hors ligne"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={{ fontSize: 18 }}>💬</Text>
            </View>
            <Text style={styles.headerTitle}>AquaChat</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>⟳</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un utilisateur..."
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>UTILISATEURS ({users.length})</Text>
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
              <Text style={styles.emptySubtext}>Invitez des amis à rejoindre AquaChat !</Text>
            </View>
          }
        />
      )}

      {/* Bottom profile */}
      <View style={styles.bottomProfile}>
        <View style={[styles.avatarSmall, { backgroundColor: Colors.primary }]}>
          <Text style={styles.avatarSmallText}>{currentUsername.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName} numberOfLines={1}>{currentUsername}</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutSmallBtn}>
          <Text style={styles.logoutSmallText}>🚪</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.primary },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center" },
  logoutText: { fontSize: 18 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.gray100, borderRadius: 16, paddingHorizontal: 14, height: 44 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  sectionHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, marginBottom: 4, backgroundColor: Colors.white },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  statusDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.white },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  userEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusText: { fontSize: 10, color: Colors.gray400, fontWeight: "500" },
  statusOnline: { color: Colors.success },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  emptySubtext: { fontSize: 13, color: Colors.gray400, marginTop: 4 },
  bottomProfile: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarSmallText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  profileName: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: "600", color: Colors.text },
  logoutSmallBtn: { padding: 8 },
  logoutSmallText: { fontSize: 18 },
});
