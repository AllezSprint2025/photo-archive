import React, { useState, useEffect } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AdminAuthContext } from "@/hooks/use-admin-auth";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("adminSecret");
    if (stored) {
      setIsAdmin(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret.trim().length > 0) {
      localStorage.setItem("adminSecret", secret);
      setIsAdmin(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminSecret");
    setIsAdmin(false);
    setSecret("");
  };

  if (isChecking) return null;

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          
          <h1 className="text-2xl font-display font-semibold text-center mb-2">Admin Access</h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Please enter your photographer secret key to access the management dashboard.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter secret key..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-background"
                autoFocus
              />
              {error && <p className="text-destructive text-xs mt-2">Secret key cannot be empty.</p>}
            </div>
            <Button type="submit" className="w-full" variant="premium">
              Unlock Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login: () => {}, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
