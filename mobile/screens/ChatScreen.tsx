import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { createOrGetConversation, getMessages, connectWebSocket } from "../services/api";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  conversation_id: string;
  is_read?: boolean;
};

export default function ChatScreen({ route, navigation }: any) {
  const { user, currentUser, token } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [userStatus, setUserStatus] = useState(user.status);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState("");
  const currentConversationIdRef = useRef("");
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const getColor = (name: string) => {
    const avatarColors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#F43F5E", "#06B6D4"];
    return avatarColors[name.charCodeAt(0) % avatarColors.length];
  };

  useEffect(() => {
    loadConversation();
    
    const ws = connectWebSocket(currentUser._id);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Statut en ligne
        if (payload.type === "user_status") {
          if (payload.user_id === user._id) {
            setUserStatus(payload.status);
          }
          return;
        }

        // Accusé de lecture
        if (payload.type === "read_receipt") {
          setMessages((prev) => prev.map(m => 
            m.conversation_id === payload.conversation_id && m.sender_id === currentUser._id 
              ? { ...m, is_read: true } 
              : m
          ));
          return;
        }

        if (payload.sender_id === currentUser._id) return;
        
        // PROTECTION: Si le vieux serveur renvoie un événement "read" comme un message vide, on l'ignore
        if (!payload.content) return;

        const newMsg: Message = {
          id: payload._id || Date.now().toString(),
          sender_id: payload.sender_id,
          content: payload.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          conversation_id: payload.conversation_id,
        };
        setMessages((prev) => [...prev, newMsg]);

        // Si la discussion est ouverte devant moi, on marque lu
        if (payload.conversation_id === currentConversationIdRef.current) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "read", conversation_id: payload.conversation_id }));
          }
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };

    return () => { ws.close(); };
  }, []);

  const loadConversation = async () => {
    try {
      const convo = await createOrGetConversation(user._id, token);
      setConversationId(convo._id);
      currentConversationIdRef.current = convo._id;

      const msgs = await getMessages(convo._id, token);
      setMessages(
        msgs.map((m: any) => ({
          id: m._id,
          sender_id: m.sender_id,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          conversation_id: m.conversation_id,
        }))
      );

      // Notifier le serveur qu'on a lu les messages existants de l'autre personne
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "read", conversation_id: convo._id }));
      }
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender_id: currentUser._id,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      conversation_id: conversationId,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        conversation_id: conversationId,
        content: inputValue,
      }));
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === currentUser._id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <View style={styles.msgContentRow}>
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
            {isMe && (
              <MaterialIcons
                name={item.is_read ? "done-all" : "check"}
                size={14}
                color={item.is_read ? "#fff" : "rgba(255,255,255,0.6)"}
                style={{ marginLeft: 6, marginBottom: -2, alignSelf: "flex-end" }}
              />
            )}
          </View>
        </View>
        <Text style={styles.msgTime}>{item.timestamp}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: getColor(user.username) }]}>
          <Text style={styles.headerAvatarText}>{user.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user.username}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: userStatus === "online" ? Colors.success : Colors.gray300 }]} />
            <Text style={styles.statusText}>{userStatus === "online" ? "En ligne" : "Hors ligne"}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <MaterialIcons name="forum" size={48} color={Colors.primary + "60"} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyChatText}>Démarrez la conversation !</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Écrivez votre message..."
          placeholderTextColor={Colors.gray400}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputValue.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputValue.trim()}
        >
          <MaterialIcons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 16, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center", marginRight: 12 },
  backText: { fontSize: 22, color: Colors.text },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  headerInfo: { marginLeft: 12, flex: 1 },
  headerName: { fontSize: 17, fontWeight: "700", color: Colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, color: Colors.textMuted },
  messagesList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginBottom: 12 },
  msgRowRight: { alignItems: "flex-end" },
  msgRowLeft: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: Colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Colors.border },
  msgContentRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  msgText: { fontSize: 14, lineHeight: 20, color: Colors.text },
  msgTextMe: { color: "#fff" },
  msgTime: { fontSize: 10, color: Colors.gray400, marginTop: 4, paddingHorizontal: 4 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { fontSize: 15, color: Colors.textMuted },
  inputBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
    paddingVertical: 10, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, height: 44, backgroundColor: Colors.gray100, borderRadius: 22,
    paddingHorizontal: 18, fontSize: 15, color: Colors.text, marginRight: 8,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.gray200 },
  sendIcon: { fontSize: 18, color: "#fff" },
});
