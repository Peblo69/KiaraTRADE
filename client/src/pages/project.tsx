import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useTokenStore } from "@/lib/websocket";
import { formatDistanceToNow } from "date-fns";

const ProjectPage: FC = () => {
  const { tokens, isConnected } = useTokenStore();
  const recentTokens = tokens.slice(0, 8); // Only show latest 8 tokens

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Sidebar - Token List */}
          <div className="lg:w-1/4">
            <Card className="p-4 h-[calc(100vh-12rem)] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Latest Tokens</h2>
              <div className="space-y-2">
                {recentTokens.map((token) => (
                  <Card key={token.address} className="p-3 hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      {token.imageUrl && (
                        <img
                          src={token.imageUrl}
                          alt={token.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{token.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {token.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${token.price.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(token.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                {recentTokens.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    {isConnected ? "No tokens yet" : "Connecting to PumpPortal..."}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <header className="space-y-2 mb-6">
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
                  <div className="mt-2 space-y-2">
                    {tokens.map((token) => (
                      <div
                        key={token.address}
                        className="grid grid-cols-7 gap-4 py-2 text-sm hover:bg-accent/50 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {token.imageUrl && (
                            <img
                              src={token.imageUrl}
                              alt={token.name}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span>{token.name}</span>
                        </div>
                        <div>{token.symbol}</div>
                        <div>${token.price.toFixed(4)}</div>
                        <div>${token.marketCap.toLocaleString()}</div>
                        <div>${token.volume24h.toLocaleString()}</div>
                        <div>{token.holders.toLocaleString()}</div>
                        <div>
                          {formatDistanceToNow(token.createdAt, { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                    {tokens.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        {isConnected ? "No tokens available" : "Connecting to PumpPortal..."}
                      </p>
                    )}
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
          </div>
        </div>

        <DebugConsole />
      </div>
    </div>
  );
};

export default ProjectPage;