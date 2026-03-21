import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";

import LoginScreen from "./screens/LoginScreen";
import UsersScreen from "./screens/UsersScreen";
import ChatScreen from "./screens/ChatScreen";
import ProfileScreen from "./screens/ProfileScreen";

import { Colors } from "./constants/Colors";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ token, currentUser, setToken }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Discussions"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="chat" size={24} color={color} />,
        }}
      >
        {(props) => <UsersScreen {...props} route={{ params: { token, currentUserId: currentUser._id } }} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profil"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      >
        {(props) => <ProfileScreen {...props} setToken={setToken} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
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

  const handleLogin = (user: any, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
  };

  // Écran de chargement personnalisé (évite l'écran blanc)
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" }}>
        <MaterialIcons name="chat" size={64} color="#ffffff" style={{ marginBottom: 20 }} />
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          // Flux non-authentifié -> LogIn
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          // Flux authentifié -> Tabs -> Chat
          <>
            <Stack.Screen name="MainTabs">
              {(props) => <MainTabs {...props} token={token} currentUser={currentUser} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Chat">
              {(props) => (
                <ChatScreen
                  {...props}
                  route={{
                    ...props.route,
                    params: { ...props.route.params, currentUser, token },
                  }}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
