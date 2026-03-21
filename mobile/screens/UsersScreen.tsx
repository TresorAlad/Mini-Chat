import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { getUsers, searchUsers, getConversations, createGroup } from "../services/api";

type User = {
  _id: string;
  username: string;
  email: string;
  status: "online" | "offline";
};

export default function UsersScreen({ navigation, route }: any) {
  const { token, currentUserId } = route.params;
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);

  useEffect(() => {
    loadUsersAndConvos();
  }, []);

  useEffect(() => {
    if (search.length > 0) {
      searchUsers(search, token).then(setUsers).catch(console.error);
    } else {
      loadUsersAndConvos();
    }
  }, [search]);

  const loadUsersAndConvos = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([getUsers(token), getConversations(token)]);
      setUsers(uRes);
      setConversations(cRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (item: any) => {
    if (isCreatingGroup && !item.is_group) {
      if (selectedGroupUsers.includes(item._id)) {
        setSelectedGroupUsers(prev => prev.filter(id => id !== item._id));
      } else {
        setSelectedGroupUsers(prev => [...prev, item._id]);
      }
    } else {
      navigation.navigate("Chat", { user: item });
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      const g = await createGroup(groupName, selectedGroupUsers, token);
      setConversations(prev => [g, ...prev]);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedGroupUsers([]);
      navigation.navigate("Chat", { user: { _id: g._id, username: g.name, email: `${g.participants.length} membres`, status: "online", is_group: true } });
    } catch(err) {
      console.error(err);
    }
  };

  const getColor = (name: string) => {
    const avatarColors = [
      "#3B82F6", "#10B981", "#8B5CF6",
      "#F59E0B", "#F43F5E", "#06B6D4",
    ];
    return avatarColors[name.charCodeAt(0) % avatarColors.length];
  };

  const renderUser = ({ item }: { item: any }) => {
    const isSelected = selectedGroupUsers.includes(item._id);
    return (
    <TouchableOpacity
      style={[styles.userCard, isSelected && styles.userCardSelected]}
      onPress={() => handleSelectUser(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getColor(item.username) }]}>
        <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
        <View style={[styles.statusDot, { backgroundColor: item.status === "online" ? Colors.success : Colors.gray300 }]} />
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={[styles.statusText, item.status === "online" && styles.statusOnline]}>
            {item.status === "online" ? "en ligne" : ""}
          </Text>
        </View>
        <Text style={styles.userEmail} numberOfLines={1}>
          {item.is_group 
            ? (conversations.find((c: any) => c._id === item._id)?.last_message || "Groupe créé") 
            : (conversations.find((c: any) => !c.is_group && c.participants.includes(item._id))?.last_message || "Démarrer une discussion")}
        </Text>
      </View>
      {isCreatingGroup && !item.is_group && (
        <MaterialIcons name={isSelected ? "check-circle" : "radio-button-unchecked"} size={24} color={isSelected ? Colors.primary : Colors.gray400} />
      )}
    </TouchableOpacity>
    );
  };

  const displayList = [
    ...conversations.filter(c => c.is_group).map(c => ({
      _id: c._id, username: c.name, email: `${c.participants.length} membres`, status: "online", is_group: true
    })),
    ...users
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="whatshot" size={24} color="#ffffff" />
            </View>
            <Text style={styles.headerTitle}>AquaChat</Text>
          </View>
          <TouchableOpacity onPress={() => { setIsCreatingGroup(!isCreatingGroup); setSelectedGroupUsers([]); setGroupName(""); }}>
            <MaterialIcons name={isCreatingGroup ? "close" : "group-add"} size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {isCreatingGroup ? (
          <View style={styles.groupCreateContainer}>
            <TextInput
              style={styles.groupInput}
              placeholder="Nom du groupe..."
              value={groupName}
              onChangeText={setGroupName}
            />
            {selectedGroupUsers.length > 0 && (
              <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup}>
                <Text style={styles.createGroupText}>Créer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={Colors.gray400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={Colors.gray400}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{isCreatingGroup ? "SÉLECTIONNEZ LES MEMBRES" : "DISCUSSIONS"} ({displayList.length})</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group-off" size={48} color={Colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    backgroundColor: Colors.white, paddingTop: 60, paddingHorizontal: 20, 
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border 
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.primary },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.gray100, borderRadius: 16, paddingHorizontal: 14, height: 44 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  sectionHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, marginBottom: 8, backgroundColor: Colors.white, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  userCardSelected: { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30", borderWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  statusDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.white },
  userInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  userNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  statusText: { fontSize: 11, color: Colors.gray400, fontWeight: "500" },
  statusOnline: { color: Colors.success },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  groupCreateContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupInput: { flex: 1, backgroundColor: Colors.gray100, borderRadius: 16, paddingHorizontal: 14, height: 44, fontSize: 15 },
  createGroupBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, height: 44, borderRadius: 16, justifyContent: "center" },
  createGroupText: { color: "#fff", fontWeight: "700" },
});
