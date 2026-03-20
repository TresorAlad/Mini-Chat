import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./screens/LoginScreen";
import UsersScreen from "./screens/UsersScreen";
import ChatScreen from "./screens/ChatScreen";

type User = {
  _id: string;
  username: string;
  email: string;
  status: "online" | "offline";
};

type CurrentUser = {
  _id: string;
  username: string;
  email: string;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("token");
      const savedUser = await AsyncStorage.getItem("user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("Auth check error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user: CurrentUser, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setCurrentUser(null);
    setToken("");
    setSelectedUser(null);
  };

  if (isLoading) return null;

  // Not logged in → Login Screen
  if (!currentUser || !token) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // Logged in + user selected → Chat Screen
  if (selectedUser) {
    return (
      <>
        <StatusBar style="dark" />
        <ChatScreen
          user={selectedUser}
          currentUser={currentUser}
          token={token}
          onBack={() => setSelectedUser(null)}
        />
      </>
    );
  }

  // Logged in, no user selected → Users List
  return (
    <>
      <StatusBar style="dark" />
      <UsersScreen
        token={token}
        currentUserId={currentUser._id}
        currentUsername={currentUser.username}
        onSelectUser={(user) => setSelectedUser(user)}
        onLogout={handleLogout}
      />
    </>
  );
}
