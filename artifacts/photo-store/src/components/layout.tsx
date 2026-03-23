import React from "react";
import { Link, useLocation } from "wouter";
import { Camera } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
            <Camera className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            <span className="font-display font-bold text-xl tracking-widest uppercase">
              Lens & Light
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/" 
              className={`transition-colors hover:text-primary ${!isAdmin ? "text-foreground" : "text-muted-foreground"}`}
            >
              Galleries
            </Link>
            <Link 
              href="/admin" 
              className={`transition-colors hover:text-primary ${isAdmin ? "text-foreground" : "text-muted-foreground"}`}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 py-8 md:py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm font-light">
            &copy; {new Date().getFullYear()} Lens & Light Photography. All rights reserved.
          </p>
          <p className="text-muted-foreground/60 text-xs mt-2">
            Beautifully crafted for visual storytelling.
          </p>
        </div>
      </footer>
    </div>
  );
}
