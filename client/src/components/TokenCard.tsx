import { FC } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistance } from "date-fns";
import CryptoIcon from "./CryptoIcon";

interface Trade {
  timestamp: number;
  price: number;
  priceUSD: number;
  signature: string;
}

interface TokenCardProps {
  token: {
    name: string;
    symbol: string;
    address: string;
    price: number;
    trades?: Trade[];
    imageUrl?: string;
    uri?: string;
  };
}

const TokenCard: FC<TokenCardProps> = ({ token }) => {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-black/60 via-purple-900/20 to-black/60 backdrop-blur-lg border-purple-500/30 shadow-lg shadow-purple-500/10 transition-all duration-300 hover:shadow-purple-500/20">
      <div className="p-4 border-b border-purple-500/30">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <CryptoIcon
              symbol={token.symbol}
              imageUrl={token.imageUrl}
              uri={token.uri}
              size="lg"
              showFallback={true}
            />
            <div>
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                {token.name}
              </h3>
              <span className="text-sm text-purple-400/80">{token.symbol}</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-purple-300/60 truncate">
          {token.address}
        </div>
        <div className="mt-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          {token.price.toFixed(8)} SOL
        </div>
      </div>

      {token.trades && token.trades.length > 0 && (
        <div className="p-4 bg-black/40">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">
            Recent Trades
          </h4>
          <div className="max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-purple-300/60">Time</TableHead>
                  <TableHead className="text-right text-purple-300/60">Price (SOL)</TableHead>
                  <TableHead className="text-right text-purple-300/60">Price (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {token.trades.map((trade, i) => (
                  <TableRow key={trade.signature}>
                    <TableCell className="text-purple-300/80">
                      {formatDistance(trade.timestamp, new Date(), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right text-purple-300/80">
                      {trade.price.toFixed(8)}
                    </TableCell>
                    <TableCell className="text-right text-purple-300/80">
                      ${trade.priceUSD.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TokenCard;