import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import RegisterModal from "./auth/RegisterModal";
import LoginModal from "./auth/LoginModal";
import { Loader2 } from "lucide-react";

export default function Navbar() {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Check if Phantom is installed and connected
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) {
      console.log('Phantom detected:', {
        publicKey: provider.publicKey?.toString()
      });

      // Setup event listeners
      provider.on('connect', (publicKey: any) => {
        console.log('Phantom connected:', publicKey.toString());
        setIsConnected(true);
        setPublicKey(publicKey.toString());
      });

      provider.on('disconnect', () => {
        console.log('Phantom disconnected');
        setIsConnected(false);
        setPublicKey(null);
      });

      return () => {
        provider.on('disconnect', () => {});
        provider.on('connect', () => {});
      };
    } else {
      console.log('Phantom not available');
    }
  }, []);

  const handleWalletClick = async () => {
    if (isConnected) {
      try {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          await provider.disconnect();
          setIsConnected(false);
          setPublicKey(null);
          toast({
            title: "Wallet Disconnected",
            description: "Your wallet has been disconnected successfully",
          });
        }
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

    if (!window.phantom?.solana?.isPhantom) {
      console.log('Phantom not detected');
      toast({
        title: "Wallet Not Found",
        description: "Please install Phantom Wallet extension",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return;
    }

    setConnecting(true);
    try {
      const provider = window.phantom.solana;
      const response = await provider.connect();
      const walletPublicKey = response.publicKey.toString();

      console.log('Connection successful:', {
        publicKey: walletPublicKey
      });

      setIsConnected(true);
      setPublicKey(walletPublicKey);

      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully",
      });
    } catch (error: any) {
      console.error("Connection error:", {
        error,
        name: error.name,
        message: error.message
      });

      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
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
                  isConnected ? 'bg-green-500 hover:bg-green-600' : 
                  connecting ? 'bg-purple-400' : 'bg-purple-500 hover:bg-purple-600'
                } text-white min-w-[160px] relative`}
              >
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                    {shortenAddress(publicKey || '')}
                  </span>
                ) : (
                  'Connect Wallet'
                )}
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