import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { WalletConnectButton } from "@/lib/wallet";
import { LineChart, Wallet } from "lucide-react";

export default function Navbar() {
  return (
    <>
      <nav className="border-b border-purple-800/20 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 flex items-center">
                <img 
                  src="https://files.catbox.moe/0b1u9r.png" 
                  alt="Kiara AI Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 
                className="text-3xl font-bold tracking-wider"
                style={{
                  background: 'linear-gradient(to right, #ff00ff, #00ffff, #ff00ff)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 0 10px rgba(255, 0, 255, 0.3)',
                  animation: 'shine 3s linear infinite, float 2s ease-in-out infinite'
                }}
              >
                KIARA_AI
              </h1>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/home"><Button variant="ghost">Home</Button></Link>
              <Link href="/crypto-news"><Button variant="ghost">Crypto News</Button></Link>
              <Link href="/about"><Button variant="ghost">About Us</Button></Link>
              <Link href="/project"><Button variant="ghost">Project</Button></Link>
              <Link href="/kiara-stage-i">
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                  Kiara Stage I
                </Button>
              </Link>
              <Link href="/pumpfun-vision">
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                  PumpFun Vision
                </Button>
              </Link>
              <Link href="/subscriptions"><Button variant="ghost">Subscriptions</Button></Link>

              <Link href="/predictions">
                <Button 
                  variant="outline" 
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
                >
                  <LineChart className="w-4 h-4" />
                  Price Predictions
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button 
                  variant="outline" 
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Wallet Tracking
                </Button>
              </Link>

              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}