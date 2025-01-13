import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Navbar() {
  const connectWallet = () => {
    // Wallet connection logic here
    console.log("Connecting wallet...");
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
            <Link href="/kiara"><Button variant="ghost">Kiara</Button></Link>
            <Link href="/subscriptions"><Button variant="ghost">Subscriptions</Button></Link>
            <Button 
              onClick={connectWallet}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
