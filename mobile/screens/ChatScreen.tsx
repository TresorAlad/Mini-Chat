import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { Colors } from "../constants/Colors";
import { createOrGetConversation, getMessages, connectWebSocket } from "../services/api";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  conversation_id: string;
};

type User = {
  _id: string;
  username: string;
  status: "online" | "offline";
};

type Props = {
  user: User;
  currentUser: { _id: string; username: string };
  token: string;
  onBack: () => void;
};

const avatarColors = [
  "#3B82F6", "#10B981", "#8B5CF6",
  "#F59E0B", "#F43F5E", "#06B6D4",
];

export default function ChatScreen({ user, currentUser, token, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  useEffect(() => {
    loadConversation();
    
    const ws = connectWebSocket(currentUser._id);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.sender_id === currentUser._id) return;
        const newMsg: Message = {
          id: payload._id || Date.now().toString(),
          sender_id: payload.sender_id,
          content: payload.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          conversation_id: payload.conversation_id,
        };
        setMessages((prev) => [...prev, newMsg]);
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
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: getColor(user.username) }]}>
          <Text style={styles.headerAvatarText}>{user.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user.username}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: user.status === "online" ? Colors.success : Colors.gray300 }]} />
            <Text style={styles.statusText}>{user.status === "online" ? "En ligne" : "Hors ligne"}</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>💬</Text>
            <Text style={styles.emptyChatText}>Démarrez la conversation !</Text>
          </View>
        }
      />

      {/* Input */}
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
          <Text style={styles.sendIcon}>➤</Text>
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
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: Colors.gray200, shadowOpacity: 0 },
  sendIcon: { fontSize: 18, color: "#fff" },
});
