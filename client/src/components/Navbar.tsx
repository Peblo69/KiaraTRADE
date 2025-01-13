import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const { wallet, connect, disconnect, connected, publicKey } = useWallet();
  const { toast } = useToast();

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

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="border-b border-purple-800/20 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-vt323 font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 animate-glitch">
              KIARA_AI
            </h1>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded bg-purple-900/40 border border-purple-500/20">[AI]</span>
              <span className="text-xs px-2 py-1 rounded bg-purple-900/40 border border-purple-500/20">[ML]</span>
            </div>
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
          </div>
        </div>
      </div>
    </nav>
  );
}