import { FC, PropsWithChildren, useState } from 'react';
import { Link, useLocation } from "wouter";
import { SiSolana } from "react-icons/si";
import { 
  LineChart, 
  Wallet, 
  BarChart3, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const menuItems = [
    { href: "/home", icon: <BarChart3 size={20} />, label: "Home" },
    { href: "/project", icon: <LineChart size={20} />, label: "Token Tracker" },
    { href: "/kiara-stage-i", icon: <Wallet size={20} />, label: "Kiara Stage I" },
    { href: "/about", icon: <Settings size={20} />, label: "About Us" },
  ];

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer",
      location === href && "bg-gray-800 text-white"
    )}>
      <Link href={href}>
        <div className="flex items-center gap-3 w-full">
          {icon}
          <span>{label}</span>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile menu button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-gray-800 rounded-lg"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 p-4 fixed h-full transition-transform duration-300 ease-in-out z-40",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center gap-2 mb-8">
          <SiSolana className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl font-bold text-white">Kiara AI</h1>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Page Content */}
        <main className="pt-4 px-4 lg:px-6">
          {children}
        </main>
      </div>

      {/* Mobile menu backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};