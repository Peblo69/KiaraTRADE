import { FC } from "react";
import { Card } from "@/components/ui/card";
import { useUnifiedTokenStore } from "@/lib/unified-token-store";

const PumpFunVision: FC = () => {
  const isConnected = useUnifiedTokenStore((state) => state.isConnected);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">PumpFun Vision</h1>
        <Card className="p-4">
          <p className="text-muted-foreground">
            {isConnected ? "Connected" : "Initializing..."}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PumpFunVision;