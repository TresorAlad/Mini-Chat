import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ShieldCheck, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "@/services/api";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const data = await loginUser(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/chat");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const email = (form.elements.namedItem("reg-email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("reg-password") as HTMLInputElement).value;

    try {
      const data = await registerUser(username, email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/chat");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-headline tracking-tight">AquaChat</h1>
        </div>
        <p className="text-muted-foreground text-lg">Clean. Modern. Real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
        <div className="hidden md:flex flex-col justify-center space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-sm border border-border/50 transition-all hover:shadow-md">
            <div className="p-3 rounded-full bg-secondary">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Instant Messaging</h3>
              <p className="text-muted-foreground">Lightning-fast delivery with WebSocket technology.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-sm border border-border/50 transition-all hover:shadow-md">
            <div className="p-3 rounded-full bg-accent/20">
              <ShieldCheck className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Secure & Private</h3>
              <p className="text-muted-foreground">End-to-end security with JWT authentication.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-sm border border-border/50 transition-all hover:shadow-md">
            <div className="p-3 rounded-full bg-primary/20">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Connect Anywhere</h3>
              <p className="text-muted-foreground">Access your conversations from any device seamlessly.</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Join the conversation today.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted rounded-xl">
                <TabsTrigger value="login" className="rounded-lg">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="alex@example.com" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all" disabled={isLoading}>
                    {isLoading ? "Authenticating..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" type="text" placeholder="alex_chat" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" placeholder="alex@example.com" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" required className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 transition-all" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col text-center border-t pt-4">
            <p className="text-xs text-muted-foreground px-4">
              By continuing, you agree to AquaChat's Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}