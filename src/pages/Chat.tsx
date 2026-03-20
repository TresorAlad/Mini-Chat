import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Send, MoreVertical, Paperclip, Smile, LogOut,
  MessageSquarePlus, Settings, Users, Menu, X, UserPlus, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUsers, searchUsers, createOrGetConversation,
  getMessages, connectWebSocket
} from "@/services/api";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  conversation_id: string;
};

type User = {
  _id: string;
  username: string;
  email: string;
  status: "online" | "offline";
};

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) navigate("/");
  }, []);

  // Load users
  useEffect(() => {
    if (!currentUser) return;
    getUsers().then(setUsers).catch(console.error);
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser) return;
    const ws = connectWebSocket(currentUser._id);
    wsRef.current = ws;
    ws.onopen = () => console.log("Connecté au WebSocket ✅");
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.sender_id === currentUser._id) return;
        const newMsg: Message = {
          id: payload._id || Date.now().toString(),
          sender_id: payload.sender_id,
          content: payload.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          is_read: false,
          conversation_id: payload.conversation_id,
        };
        setMessages((prev) => [...prev, newMsg]);
      } catch (err) {
        console.error("Erreur WS:", err);
      }
    };
    ws.onclose = () => console.log("Déconnecté du WebSocket");
    return () => { ws.close(); };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Search
  useEffect(() => {
    if (!currentUser) return;
    if (searchQuery.length > 0) {
      searchUsers(searchQuery).then(setUsers).catch(console.error);
    } else {
      getUsers().then(setUsers).catch(console.error);
    }
  }, [searchQuery]);

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setShowUserSearch(false);
    setSidebarOpen(false);
    try {
      const convo = await createOrGetConversation(user._id);
      setCurrentConversationId(convo._id);
      const msgs = await getMessages(convo._id);
      setMessages(
        msgs.map((m: any) => ({
          id: m._id,
          sender_id: m.sender_id,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          is_read: m.is_read,
          conversation_id: m.conversation_id,
        }))
      );
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim() || !currentUser) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender_id: currentUser._id,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      is_read: false,
      conversation_id: currentConversationId,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ conversation_id: currentConversationId, content }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!currentUser) return null;

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const avatarColors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
    "bg-indigo-500", "bg-pink-500", "bg-teal-500",
  ];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="flex h-screen bg-background overflow-hidden p-0 md:p-4 gap-4">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className={cn(
        "flex flex-col w-[320px] bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all duration-300 shrink-0 z-50",
        "fixed md:relative inset-y-0 left-0 md:inset-auto",
        "md:m-0 m-0 md:rounded-3xl rounded-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-xl shadow-sm">
                <MessageSquarePlus className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold font-headline text-primary">AquaChat</h1>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => setShowUserSearch(!showUserSearch)}
                title="Nouvelle conversation"
              >
                <UserPlus className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 md:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 h-11 bg-muted/30 rounded-2xl border-none focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* ─── New Conversation Panel ─── */}
        {showUserSearch && (
          <div className="px-4 pb-3">
            <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setShowUserSearch(false)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <p className="text-xs font-semibold text-primary">Nouvelle conversation</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2 px-1">
                Sélectionnez un utilisateur pour démarrer une discussion
              </p>
            </div>
          </div>
        )}

        {/* ─── Users / Conversations List ─── */}
        <div className="flex-1 overflow-hidden">
          <div className="px-6 mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {showUserSearch ? "Tous les utilisateurs" : "Discussions"} ({users.length})
              </p>
            </div>
          </div>
          <ScrollArea className="h-full px-3">
            <div className="space-y-1 pb-2">
              {users.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Aucun utilisateur</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Invitez des amis à rejoindre AquaChat !
                  </p>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group",
                      "hover:bg-muted/50",
                      selectedUser?._id === user._id
                        ? "bg-secondary/40 border border-primary/20"
                        : ""
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                        <AvatarFallback className={cn(getAvatarColor(user.username), "text-white text-sm font-bold")}>
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                        user.status === "online" ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-sm truncate">{user.username}</span>
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                          user.status === "online"
                            ? "bg-green-50 text-green-600"
                            : "text-muted-foreground"
                        )}>
                          {user.status === "online" ? "en ligne" : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ─── User Profile Footer ─── */}
        <div className="p-4 border-t border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white transition-all cursor-pointer">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {getInitials(currentUser.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{currentUser.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CHAT AREA ─── */}
      <main className="flex-1 flex flex-col bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden relative min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <header className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 md:hidden shrink-0"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar className="w-12 h-12 shadow-md shrink-0">
                  <AvatarFallback className={cn(getAvatarColor(selectedUser.username), "text-white font-bold text-lg")}>
                    {getInitials(selectedUser.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-bold text-lg leading-none truncate">{selectedUser.username}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={cn("w-2 h-2 rounded-full", selectedUser.status === "online" ? "bg-green-500" : "bg-gray-400")} />
                    <span className="text-xs text-muted-foreground">
                      {selectedUser.status === "online" ? "En ligne" : "Hors ligne"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[#F8FAFC]/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                  <MessageSquarePlus className="w-14 h-14 text-primary/30 mb-4" />
                  <p className="text-sm text-muted-foreground">Démarrez la conversation !</p>
                  <p className="text-xs text-muted-foreground mt-1">Envoyez votre premier message ci-dessous</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser._id;
                return (
                  <div key={msg.id} className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn("flex flex-col max-w-[80%] md:max-w-[70%] space-y-1", isMe ? "items-end" : "items-start")}>
                      <div className={cn(
                        "px-5 py-3 shadow-sm transition-all duration-200",
                        isMe
                          ? "bg-primary text-white rounded-t-3xl rounded-bl-3xl"
                          : "bg-white text-foreground rounded-t-3xl rounded-br-3xl border border-border/50"
                      )}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-5 py-3 rounded-t-3xl rounded-br-3xl border border-border/50 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:75ms]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Input */}
            <footer className="p-4 md:p-6 bg-white border-t border-border/50 shrink-0">
              <div className="flex items-center gap-2 md:gap-4 bg-muted/30 p-2 rounded-2xl border border-border/20">
                <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex shrink-0">
                  <Smile className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex shrink-0">
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
                  placeholder="Écrivez votre message..."
                  className="bg-transparent border-none focus-visible:ring-0 text-sm h-10 px-0 flex-1 min-w-0"
                />
                <Button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  className="rounded-xl h-10 w-10 md:h-11 md:w-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all shrink-0 p-0"
                >
                  <Send className="w-5 h-5 text-white" />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#F8FAFC]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 rounded-full h-10 w-10 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquarePlus className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Vos conversations</h2>
            <p className="text-muted-foreground max-w-xs">
              Sélectionnez un utilisateur dans la barre latérale pour démarrer une discussion.
            </p>
            <Button
              className="mt-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Voir les utilisateurs
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}