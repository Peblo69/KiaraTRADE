import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from "@/hooks/use-toast";
import RegisterModal from "./auth/RegisterModal";
import LoginModal from "./auth/LoginModal";
import { Loader2 } from "lucide-react";

export default function Navbar() {
  const { publicKey, connect, disconnect, connected, connecting } = useWallet();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Listen for Phantom wallet state changes
    if (window.phantom?.solana) {
      window.phantom.solana.on('connect', () => {
        console.log('Phantom connected:', window.phantom?.solana?.publicKey?.toString());
      });

      window.phantom.solana.on('disconnect', () => {
        console.log('Phantom disconnected');
      });

      // Check if Phantom is actually available
      console.log('Phantom availability check:', {
        isPhantom: window.phantom?.solana?.isPhantom,
        publicKey: window.phantom?.solana?.publicKey?.toString()
      });
    }
  }, []);

  const handleWalletClick = async () => {
    if (connected) {
      try {
        await disconnect();
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected successfully",
        });
      } catch (error: any) {
        console.error('Disconnect error:', error);
        toast({
          title: "Disconnection Failed",
          description: error.message || "Failed to disconnect wallet",
          variant: "destructive",
        });
      }
      return;
    }

    // Check if Phantom is properly injected
    if (!window.phantom?.solana?.isPhantom) {
      console.log('Phantom not detected:', window.phantom);
      toast({
        title: "Wallet Not Found",
        description: "Please install Phantom Wallet extension",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      console.log('Attempting to connect to Phantom...');
      await connect();
      console.log('Connection successful:', publicKey?.toString());
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully",
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      let errorMessage = "Failed to connect wallet";

      // Specific error handling
      if (error.name === 'WalletConnectionError') {
        errorMessage = "Failed to connect to Phantom. Please try again.";
      } else if (error.name === 'WalletDisconnectedError') {
        errorMessage = "Wallet was disconnected. Please try reconnecting.";
      } else if (error.name === 'WalletTimeoutError') {
        errorMessage = "Connection attempt timed out. Please try again.";
      }

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });

      // Clear any session data
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('shouldPlayInteractive');
      window.location.href = '/';
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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
              <Link href="/about"><Button variant="ghost">About Us</Button></Link>
              <Link href="/project"><Button variant="ghost">Project</Button></Link>
              <Link href="/kiara-stage-i">
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                  Kiara Stage I
                </Button>
              </Link>
              <Link href="/subscriptions"><Button variant="ghost">Subscriptions</Button></Link>

              <Button 
                onClick={() => setIsRegisterOpen(true)}
                variant="outline" 
                className="text-purple-400 hover:text-purple-300"
              >
                Register
              </Button>
              <Button 
                onClick={() => setIsLoginOpen(true)}
                variant="outline" 
                className="text-purple-400 hover:text-purple-300"
              >
                Login
              </Button>

              <Button 
                onClick={handleWalletClick}
                disabled={connecting}
                className={`${
                  connected ? 'bg-green-500 hover:bg-green-600' : 
                  connecting ? 'bg-purple-400' : 'bg-purple-500 hover:bg-purple-600'
                } text-white min-w-[160px] relative`}
              >
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </span>
                ) : connected ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                    {shortenAddress(publicKey?.toBase58() || '')}
                  </span>
                ) : (
                  'Connect Wallet'
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-red-400 hover:text-red-300"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
      />
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
      />
    </>
  );
}