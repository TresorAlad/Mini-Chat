"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Send, MoreVertical, Paperclip, Smile, LogOut, MessageSquarePlus, Settings } from "lucide-react";
import { suggestQuickReplies } from "@/ai/flows/ai-quick-reply-suggestions-flow";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
};

type User = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline";
  lastMessage?: string;
  lastMessageTime?: string;
};

const MOCK_USERS: User[] = [
  { id: "1", name: "Sarah Miller", avatar: "https://picsum.photos/seed/sarah/100/100", status: "online", lastMessage: "Let's meet tomorrow!", lastMessageTime: "10:30 AM" },
  { id: "2", name: "David Chen", avatar: "https://picsum.photos/seed/david/100/100", status: "offline", lastMessage: "Sounds great, thanks.", lastMessageTime: "Yesterday" },
  { id: "3", name: "Jessica Smith", avatar: "https://picsum.photos/seed/jessica/100/100", status: "online", lastMessage: "I'll send the files soon.", lastMessageTime: "2:15 PM" },
  { id: "4", name: "Thomas Wilson", avatar: "https://picsum.photos/seed/thomas/100/100", status: "offline", lastMessage: "How are you doing?", lastMessageTime: "Mon" },
];

const INITIAL_MESSAGES: Message[] = [
  { id: "m1", senderId: "2", content: "Hey! How's the project going?", timestamp: "10:00 AM", isRead: true },
  { id: "m2", senderId: "me", content: "It's going well! I'm almost finished with the design.", timestamp: "10:05 AM", isRead: true },
  { id: "m3", senderId: "2", content: "That's awesome. Do you think we can review it today?", timestamp: "10:10 AM", isRead: true },
];

export default function ChatPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(MOCK_USERS[0]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  // Handle Quick Replies when a new message is received
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.senderId !== "me") {
      generateSuggestions(lastMessage.content);
    } else {
      setQuickReplies([]);
    }
  }, [messages]);

  async function generateSuggestions(content: string) {
    try {
      const result = await suggestQuickReplies({ incomingMessage: content });
      setQuickReplies(result.replies);
    } catch (error) {
      console.error("Failed to fetch suggestions", error);
    }
  }

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };
    
    setMessages([...messages, newMessage]);
    setInputValue("");
    setQuickReplies([]);

    // Simulate response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const response: Message = {
          id: (Date.now() + 1).toString(),
          senderId: selectedUser?.id || "2",
          content: "Thanks for the update! Let's talk more about it later.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden p-0 md:p-4 gap-4">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-80 bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold font-headline text-primary">AquaChat</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search messages or people" className="pl-10 h-11 bg-muted/30 rounded-2xl border-none focus-visible:ring-primary/30" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Active Chats</p>
            <ScrollArea className="h-[calc(100vh-280px)]">
              {MOCK_USERS.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-muted/50 group",
                    selectedUser?.id === user.id ? "bg-secondary/40 border border-primary/20" : ""
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    {user.status === "online" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-sm truncate">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{user.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.lastMessage}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
        
        <div className="mt-auto p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white transition-all cursor-pointer">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://picsum.photos/seed/me/100/100" />
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Alex Chat</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <header className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 shadow-md">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback>{selectedUser.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold text-lg leading-none">{selectedUser.name}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={cn("w-2 h-2 rounded-full", selectedUser.status === "online" ? "bg-green-500" : "bg-gray-400")}></span>
                    <span className="text-xs text-muted-foreground">{selectedUser.status === "online" ? "Active now" : "Offline"}</span>
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

            {/* Messages Scroll Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[#F8FAFC]/50"
            >
              {messages.map((msg, index) => {
                const isMe = msg.senderId === "me";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex group",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "flex flex-col max-w-[80%] md:max-w-[70%] space-y-1",
                      isMe ? "items-end" : "items-start"
                    )}>
                      <div
                        className={cn(
                          "px-5 py-3 shadow-sm transition-all duration-200",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-t-3xl rounded-bl-3xl" 
                            : "bg-white text-foreground rounded-t-3xl rounded-br-3xl border border-border/50"
                        )}
                      >
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
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Input & Suggestions */}
            <footer className="p-4 md:p-6 bg-white border-t border-border/50">
              {/* Quick Replies */}
              {quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2">
                  {quickReplies.map((reply, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(reply)}
                      className="rounded-full bg-secondary/20 hover:bg-secondary/40 border-primary/20 text-xs text-primary-foreground font-medium transition-all"
                    >
                      {reply}
                    </Button>
                  ))}
                </div>
              )}

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
                  placeholder="Type your message here..."
                  className="bg-transparent border-none focus-visible:ring-0 text-sm h-10 px-0"
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
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquarePlus className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your conversations</h2>
            <p className="text-muted-foreground max-w-xs">Select a user from the sidebar to start chatting or find new connections.</p>
          </div>
        )}
      </main>
    </div>
  );
}