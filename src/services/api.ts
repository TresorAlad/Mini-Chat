const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

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

export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function searchUsers(query: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getConversations() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createOrGetConversation(participantId: string) {
  const token = localStorage.getItem("token");
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

export async function getMessages(conversationId: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/messages/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export function connectWebSocket(userId: string): WebSocket {
  return new WebSocket(`${WS_URL}/${userId}`);
}
