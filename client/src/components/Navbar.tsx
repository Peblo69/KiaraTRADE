import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const { wallet, connect, disconnect, connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleWalletClick = async () => {
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

    // Check for Phantom wallet
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
      await connect().catch((err) => {
        throw err;
      });

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
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('shouldPlayInteractive');
    setLocation('/');
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="border-b border-purple-800/20 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <img 
              src="https://files.catbox.moe/0b1u9r.png" 
              alt="Kiara AI Logo"
              className="h-16 w-auto object-contain"
            />
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
              onClick={handleWalletClick}
              className={`${connected ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'} text-white`}
            >
              {connected ? (
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
  );
}