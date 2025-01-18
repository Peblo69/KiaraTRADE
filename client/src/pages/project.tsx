import { FC } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

const ProjectPage: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            PumpPortal Token Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time token tracking and analysis platform
          </p>
        </header>

        <Tabs defaultValue="live" className="w-full">
          <TabsList>
            <TabsTrigger value="live">Live Feed</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground">
                <div>Token</div>
                <div>Symbol</div>
                <div>Price</div>
                <div>Market Cap</div>
                <div>Volume (24h)</div>
                <div>Holders</div>
                <div>Created</div>
              </div>
              {/* Token rows will be dynamically inserted here */}
              <div className="mt-2 space-y-2">
                <p className="text-center text-muted-foreground">
                  Connecting to PumpPortal...
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="watchlist">
            <Card className="p-4">
              <p className="text-center text-muted-foreground">
                Your watchlist will appear here
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="trending">
            <Card className="p-4">
              <p className="text-center text-muted-foreground">
                Trending tokens will appear here
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <DebugConsole />
      </div>
    </div>
  );
};

export default ProjectPage;