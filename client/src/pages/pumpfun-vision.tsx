import { FC } from "react";
import { Card } from "@/components/ui/card";

const PumpFunVision: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PumpFun Vision</h1>
            <p className="text-sm text-muted-foreground">
              Track newly created tokens and their performance
            </p>
          </div>
        </div>
        <Card className="p-4">
          <p className="text-muted-foreground">Initializing PumpFun Vision...</p>
        </Card>
      </div>
    </div>
  );
};

export default PumpFunVision;