import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  tokenAddress: string;
}

const TradingForm: React.FC<Props> = ({ tokenAddress }) => {
  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <h2 className="text-lg font-semibold text-purple-100 mb-4">Trade</h2>
      <div className="space-y-4">
        <div>
          <Input 
            type="number" 
            placeholder="Amount" 
            className="bg-purple-900/20 border-purple-900/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" className="bg-green-500 hover:bg-green-600">
            Buy
          </Button>
          <Button variant="default" className="bg-red-500 hover:bg-red-600">
            Sell
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TradingForm;