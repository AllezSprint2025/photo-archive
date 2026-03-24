import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoculPoint Photography',
  description: 'Fine art photography prints — purchase and download high-resolution images.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[#2a2a2a] sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-3 group">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="13" stroke="#c9a96e" strokeWidth="1.5"/>
                <circle cx="14" cy="14" r="6" stroke="#c9a96e" strokeWidth="1.5"/>
                <circle cx="14" cy="14" r="2" fill="#c9a96e"/>
                <line x1="14" y1="1" x2="14" y2="5" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="23" x2="14" y2="27" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1" y1="14" x2="5" y2="14" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="23" y1="14" x2="27" y2="14" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-lg tracking-widest font-light text-[#f5f5f5] group-hover:text-[#c9a96e] transition-colors uppercase">
                FoculPoint
              </span>
            </a>
            <nav className="flex items-center gap-6 text-sm tracking-wider uppercase text-[#9ca3af]">
              <a href="/" className="hover:text-[#c9a96e] transition-colors hidden sm:block">Gallery</a>
              <a href="/admin" className="hover:text-[#c9a96e] transition-colors hidden sm:block">Admin</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[#2a2a2a] mt-24 py-10 text-center text-[#6b7280] text-sm tracking-wider">
          <p className="mb-1">&copy; {new Date().getFullYear()} <span className="text-[#c9a96e]">FoculPoint Photography</span></p>
          <p className="text-xs">All images are protected by copyright. Unauthorized use is prohibited.</p>
        </footer>
      </body>
    </html>
  );
}
