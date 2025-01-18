import { FC } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

const ProjectPage: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <header className="space-y-4">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
              Stage II
            </h1>
            <p className="text-2xl text-muted-foreground">
              Advanced Token Analytics Coming Soon...
            </p>
          </header>

          <Card className="p-8 bg-black/40 backdrop-blur-sm border-purple-500/20">
            <div className="space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-400 via-cyan-400 to-purple-400 flex items-center justify-center">
                <span className="text-4xl">II</span>
              </div>

              <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Enhanced Features Coming Soon
              </h2>

              <ul className="space-y-4 text-left max-w-lg mx-auto text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  Advanced Token Analytics Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  Real-time Market Insights
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  AI-Powered Trading Signals
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  Custom Alert System
                </li>
              </ul>

              <p className="text-muted-foreground italic mt-8">
                We're working hard to bring you the next evolution of crypto intelligence.
                Stay tuned for updates!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;