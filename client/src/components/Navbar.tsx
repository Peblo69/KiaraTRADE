import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from "@/hooks/use-toast";
import RegisterModal from "./auth/RegisterModal";
import LoginModal from "./auth/LoginModal";

export default function Navbar() {
  const { wallet, connect, disconnect, connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [displayInfo, setDisplayInfo] = useState({ text: 'Connect Wallet', shortAddress: '' });

  // Update display info when wallet connection changes
  useEffect(() => {
    // Move state update logic to a callback to avoid render-time updates
    const updateDisplayInfo = () => {
      const newDisplayInfo = !connected || !publicKey 
        ? { text: 'Connect Wallet', shortAddress: '' }
        : { text: '', shortAddress: `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` };

      setDisplayInfo(newDisplayInfo);
    };

    // Execute the update asynchronously
    const timeoutId = setTimeout(updateDisplayInfo, 0);
    return () => clearTimeout(timeoutId);
  }, [connected, publicKey]);

  const handleWalletClick = useCallback(async () => {
    if (connected) {
      try {
        await disconnect();
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected successfully",
        });
      } catch (error: any) {
        toast({
          title: "Disconnection Failed",
          description: error.message || "Failed to disconnect wallet",
          variant: "destructive",
        });
      }
      return;
    }

    const phantom = window?.phantom?.solana;

    if (!phantom) {
      toast({
        title: "Wallet Not Found",
        description: "Please install Phantom Wallet extension",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      await connect();
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully",
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to wallet",
        variant: "destructive",
      });
    }
  }, [connected, connect, disconnect, toast]);

  const handleLogout = useCallback(async () => {
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

      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('shouldPlayInteractive');
      setLocation('/');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, setLocation]);

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
                  letterSpacing: '0.15em',
                  filter: 'drop-shadow(0 0 10px rgba(96, 239, 255, 0.2))'
                }}
              >
                KIARA_AI
              </h1>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/"><Button variant="ghost">Home</Button></Link>
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
                className={`${connected ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'} text-white`}
              >
                {displayInfo.shortAddress || displayInfo.text}
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