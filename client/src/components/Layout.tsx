import { FC, PropsWithChildren } from 'react';
import { Link } from "wouter";
import { SiSolana } from "react-icons/si";
import { 
  LineChart, 
  Wallet, 
  BarChart3, 
  Settings,
  Menu
} from 'lucide-react';

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <SiSolana className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl font-bold text-white">Kiara AI</h1>
        </div>

        <nav className="space-y-2">
          <Link href="/">
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <BarChart3 size={20} />
              <span>Market Overview</span>
            </a>
          </Link>
          <Link href="/tokens">
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <LineChart size={20} />
              <span>Token Tracker</span>
            </a>
          </Link>
          <Link href="/portfolio">
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Wallet size={20} />
              <span>Portfolio</span>
            </a>
          </Link>
          <Link href="/settings">
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Settings size={20} />
              <span>Settings</span>
            </a>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 h-16 fixed w-full z-10 flex items-center px-6">
          <button className="lg:hidden">
            <Menu size={24} />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page Content */}
        <main className="pt-20 px-6">
          {children}
        </main>
      </div>
    </div>
  );
};
