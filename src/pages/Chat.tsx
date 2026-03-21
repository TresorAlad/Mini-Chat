import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Send, MoreVertical, LogOut, Check, CheckCheck,
  MessageSquarePlus, Users, Menu, X, UserPlus, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUsers, searchUsers, createOrGetConversation,
  getMessages, connectWebSocket, getConversations, createGroup
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
  // Assure-toi qu'on compare toujours des chaînes de caractères (string) même si le stockage local est corrompu ou obsolète.
  const currentUserId = currentUser ? String(currentUser._id || currentUser.id) : "";

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentConversationIdRef = useRef("");

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) navigate("/");
  }, []);

  // Load users and conversations
  useEffect(() => {
    if (!currentUser) return;
    Promise.all([getUsers(), getConversations()])
      .then(([u, c]) => {
        setUsers(u);
        setConversations(c);
      })
      .catch(console.error);
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser) return;
    const ws = connectWebSocket(currentUserId);
    wsRef.current = ws;
    ws.onopen = () => console.log("Connecté au WebSocket ✅");
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Statut en ligne / hors ligne
        if (payload.type === "user_status") {
          setUsers(prev => prev.map(u => u._id === payload.user_id ? { ...u, status: payload.status } : u));
          setSelectedUser(prev => (prev && prev._id === payload.user_id) ? { ...prev, status: payload.status } : prev);
          return;
        }

        // Accusé de lecture
        if (payload.type === "read_receipt") {
          setMessages((prev) => prev.map(m => 
            m.conversation_id === payload.conversation_id && String(m.sender_id) === currentUserId 
              ? { ...m, is_read: true } 
              : m
          ));
          return;
        }

        // On compare toujours deux string
        if (String(payload.sender_id) === currentUserId) return;
        
        // PROTECTION: Si le vieux serveur renvoie un événement "read" comme un message vide, on l'ignore (bris de la boucle infinie)
        if (!payload.content) return;

        const newMsg: Message = {
          id: payload._id || Date.now().toString(),
          sender_id: payload.sender_id,
          content: payload.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          is_read: false,
          conversation_id: payload.conversation_id,
        };
        setMessages((prev) => [...prev, newMsg]);
        setConversations((prev) => prev.map(c => 
          c._id === payload.conversation_id ? { ...c, last_message: payload.content } : c
        ));

        // Si on est actuellement dans la conversation où le message arrive, on notifie immédiatement qu'on l'a lu!
        if (payload.conversation_id === currentConversationIdRef.current) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "read", conversation_id: payload.conversation_id }));
          }
        }
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

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    setShowUserSearch(false);
    setSidebarOpen(false);
    try {
      let convoId = user._id; // Si c'est un groupe, user._id est déjà l'ID de conversation
      if (!user.is_group) {
        const convo = await createOrGetConversation(user._id);
        convoId = convo._id;
      }
      setCurrentConversationId(convoId);
      currentConversationIdRef.current = convoId;
      
      const msgs = await getMessages(convoId);
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

      // Notifier le serveur qu'on a lu les messages de ce chat
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "read", conversation_id: convoId }));
      }
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      const g = await createGroup(groupName, selectedGroupUsers);
      setConversations(prev => [g, ...prev]);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedGroupUsers([]);
      handleSelectUser({ _id: g._id, username: g.name, email: `${g.participants.length} membres`, status: "online", is_group: true });
    } catch(err) {
      console.error(err);
    }
  };

  const handleSendMessage = (content: string) => {
    // Évite l'envoi de messages vides
    if (!content.trim() || !currentUser) return;
    
    const messageContent = content.trim();

    const newMessage: Message = {
      id: Date.now().toString(),
      sender_id: currentUserId,
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      is_read: false,
      conversation_id: currentConversationId,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setConversations((prev) => prev.map(c => 
      c._id === currentConversationId ? { ...c, last_message: messageContent } : c
    ));
    setInputValue("");
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ conversation_id: currentConversationId, content: messageContent }));
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

  const displayList = [
    ...conversations.filter(c => c.is_group).map(c => ({
      _id: c._id, username: c.name, email: `${c.participants.length} membres`, status: "online", is_group: true
    })),
    ...users
  ].filter(item => item.username.toLowerCase().includes(searchQuery.toLowerCase()));

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

        {/* ─── New Conversation / Group Panel ─── */}
        {showUserSearch && (
          <div className="px-4 pb-3">
            <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => { setShowUserSearch(false); setIsCreatingGroup(false); }}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <p className="text-xs font-semibold text-primary">Nouvelle conversation</p>
                </div>
                <Button size="sm" variant={isCreatingGroup ? "default" : "outline"} onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="h-7 text-[10px] rounded-full">
                  Groupe
                </Button>
              </div>
              
              {isCreatingGroup && (
                <div className="mb-2">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Nom du groupe..."
                    className="h-8 text-xs rounded-xl border-primary/20 bg-white"
                  />
                  {selectedGroupUsers.length > 0 && (
                    <Button onClick={handleCreateGroup} size="sm" className="w-full h-8 mt-2 rounded-xl text-xs">
                      Créer le groupe ({selectedGroupUsers.length})
                    </Button>
                  )}
                </div>
              )}
              
              <p className="text-[11px] text-muted-foreground px-1">
                {isCreatingGroup ? "Sélectionnez des membres" : "Sélectionnez un utilisateur"}
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
                {showUserSearch ? (isCreatingGroup ? "Amis" : "Tous") : "Discussions"} ({displayList.length})
              </p>
            </div>
          </div>
          <ScrollArea className="h-full px-3">
            <div className="space-y-1 pb-2">
              {displayList.length === 0 ? (
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
                displayList.map((user: any) => {
                  const isSelectedForGroup = selectedGroupUsers.includes(user._id);
                  return (
                  <div
                    key={user._id}
                    onClick={() => {
                      if (isCreatingGroup && !user.is_group) {
                        setSelectedGroupUsers(prev => isSelectedForGroup ? prev.filter(id => id !== user._id) : [...prev, user._id]);
                      } else {
                        handleSelectUser(user);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group relative",
                      "hover:bg-muted/50",
                      selectedUser?._id === user._id ? "bg-secondary/40 border border-primary/20" : "",
                      isSelectedForGroup ? "bg-primary/10 border border-primary/30" : ""
                    )}
                  >
                    {isSelectedForGroup && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
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
                    <div className="flex-1 min-w-0 pr-6">
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
                      <p className="text-xs text-muted-foreground truncate">
                        {user.is_group ? (conversations.find((c: any) => c._id === user._id)?.last_message || "Groupe créé") : (conversations.find((c: any) => !c.is_group && c.participants.includes(user._id))?.last_message || "Démarrer une discussion")}
                      </p>
                    </div>
                  </div>
                  );
                })
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
                const isMe = String(msg.sender_id) === currentUserId;
                return (
                  <div key={msg.id} className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn("flex flex-col max-w-[80%] md:max-w-[70%] space-y-1", isMe ? "items-end" : "items-start")}>
                      <div className={cn(
                        "px-5 py-3 shadow-sm transition-all duration-200",
                        isMe
                          ? "bg-primary text-white rounded-t-3xl rounded-bl-3xl"
                          : "bg-white text-foreground rounded-t-3xl rounded-br-3xl border border-border/50"
                      )}>
                        <div className="flex items-end gap-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          {isMe && (
                            <span className="shrink-0 mb-[1px]">
                              {msg.is_read ? (
                                <CheckCheck className="w-[14px] h-[14px] text-white/80" />
                              ) : (
                                <Check className="w-[14px] h-[14px] text-white/60" />
                              )}
                            </span>
                          )}
                        </div>
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
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault(); // Prevents the browser from misfiring duplicate events
                      handleSendMessage(inputValue);
                    }
                  }}
                  placeholder="Écrivez votre message..."
                  className="bg-transparent border-none focus-visible:ring-0 text-sm h-10 px-4 flex-1 min-w-0"
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