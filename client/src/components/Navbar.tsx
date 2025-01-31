import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { WalletButton } from "@/components/wallet/WalletButton";
import { LineChart, Wallet } from "lucide-react";

export default function Navbar() {
  return (
    <>
      <nav className="relative border-b border-purple-900/20 backdrop-blur-sm bg-black/40">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/10 via-indigo-950/5 to-purple-950/10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMjBMNDAgMjBNMjAgMjBMMjAgNDBNMjAgMjBMMCwyME0yMCAyMEwyMCAwIiBzdHJva2U9InJnYmEoMTQ3LCA1MSwgMjM0LCAwLjEpIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')] opacity-20" />
        </div>

        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="relative font-['Orbitron']">
                <h1 className="text-2xl font-bold tracking-[0.2em] uppercase px-4">
                  <span className="relative">
                    <span className="relative z-10 bg-gradient-to-r from-purple-300 via-indigo-400 to-purple-300 bg-clip-text text-transparent animate-pulse">
                      Kiara Vision AI
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-500/20 blur-lg opacity-50 animate-pulse" />
                  </span>
                </h1>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {[
                { href: "/home", label: "Home" },
                { href: "/crypto-news", label: "Crypto News" },
                { href: "/about", label: "About Us" },
                { href: "/project", label: "Project" },
                { href: "/kiara-stage-i", label: "Kiara Stage I", highlight: true },
                { href: "/pumpfun-vision", label: "PumpFun Vision", highlight: true },
                { href: "/subscriptions", label: "Subscriptions" }
              ].map(({ href, label, highlight }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" className="relative overflow-hidden group">
                    <span className={`relative z-10 ${highlight ? 'text-purple-400/90' : 'text-slate-300'} group-hover:text-cyan-300 transition-all duration-300`}>
                      {label}
                    </span>
                    <div className="absolute inset-0 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-purple-800/20 to-purple-600/20 animate-gradient-x" />
                    </div>
                  </Button>
                </Link>
              ))}

              <Link href="/predictions">
                <Button 
                  variant="outline" 
                  className="relative overflow-hidden group border-purple-900/30 bg-black/20 hover:border-purple-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2 text-purple-400/90 group-hover:text-cyan-300 transition-all duration-300">
                    <LineChart className="w-4 h-4" />
                    Price Predictions
                  </span>
                  <div className="absolute inset-0 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-purple-800/20 to-purple-600/20 animate-gradient-x" />
                  </div>
                </Button>
              </Link>

              <Link href="/wallet-tracking">
                <Button 
                  variant="outline" 
                  className="relative overflow-hidden group border-purple-900/30 bg-black/20 hover:border-purple-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2 text-purple-400/90 group-hover:text-cyan-300 transition-all duration-300">
                    <Wallet className="w-4 h-4" />
                    Wallet Tracking
                  </span>
                  <div className="absolute inset-0 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-purple-800/20 to-purple-600/20 animate-gradient-x" />
                  </div>
                </Button>
              </Link>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-700/30 via-indigo-700/30 to-purple-700/30 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}