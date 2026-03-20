// Configuration de l'API — Changer l'IP par celle de votre machine sur le réseau local
// Pour trouver votre IP : ifconfig / ip addr (Linux) ou ipconfig (Windows)
// Expo sur téléphone ne peut pas accéder à "localhost" du PC

const LOCAL_IP = "10.0.2.2"; // Android emulator → PC localhost
// const LOCAL_IP = "192.168.x.x"; // Remplacez par votre IP locale pour un vrai téléphone

export const API_URL = `http://${LOCAL_IP}:8080/api`;
export const WS_URL = `ws://${LOCAL_IP}:8080/ws`;

export async function registerUser(username: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
  return data;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion");
  return data;
}

export async function getUsers(token: string) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function searchUsers(query: string, token: string) {
  const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createOrGetConversation(participantId: string, token: string) {
  const res = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ participant_id: participantId }),
  });
  return res.json();
}

export async function getMessages(conversationId: string, token: string) {
  const res = await fetch(`${API_URL}/messages/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export function connectWebSocket(userId: string): WebSocket {
  return new WebSocket(`${WS_URL}/${userId}`);
}
