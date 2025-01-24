import { FC } from "react";
import { Card } from "@/components/ui/card";

const PumpFunVision: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">PumpFun Vision</h1>
        <Card className="p-4">
          <p>Welcome to PumpFun Vision</p>
        </Card>
      </div>
    </div>
  );
};

export default PumpFunVision;