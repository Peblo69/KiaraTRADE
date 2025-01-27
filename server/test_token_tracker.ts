
import axios from 'axios';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

interface Trade {
  timestamp: number;
  price: number;
  amount: number;
  type: 'buy' | 'sell';
}

async function trackToken(mint: string) {
  try {
    // Get initial token info
    const [tokenInfo, transfersResponse] = await Promise.all([
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getAsset',
        params: [mint]
      }),
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'transfers',
        method: 'getSignaturesForAsset',
        params: {
          assetId: mint,
          limit: 100,
          sortBy: {
            value: 'blockTime',
            order: 'desc'
          }
        }
      })
    ]);

    // Process trades
    const trades: Trade[] = [];
    let volume24h = 0;
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    transfersResponse.data.result.forEach((transfer: any) => {
      if (transfer.type === 'TRANSFER' || transfer.type === 'BURN') {
        const price = transfer.nativeBalanceChange / transfer.tokenBalanceChange;
        const trade = {
          timestamp: transfer.blockTime * 1000,
          price: Math.abs(price),
          amount: Math.abs(transfer.tokenBalanceChange),
          type: transfer.type === 'BURN' ? 'sell' : 'buy'
        };
        trades.push(trade);

        if (trade.timestamp > oneDayAgo) {
          volume24h += trade.amount;
        }
      }
    });

    // Calculate current price from most recent trade
    const currentPrice = trades[0]?.price || 0;

    // Print output
    console.log('\n=== Token Update ===');
    console.log(`Time: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`Current Price: ${currentPrice.toFixed(9)} SOL`);
    console.log(`24h Volume: ${volume24h.toFixed(2)} tokens\n`);

    console.log('Recent Trades:');
    trades.slice(0, 10).forEach(trade => {
      const emoji = trade.type === 'buy' ? '🟢' : '🔴';
      console.log(`${emoji} ${format(trade.timestamp, 'HH:mm:ss')} - ${trade.price.toFixed(9)} SOL (${trade.amount.toFixed(2)} tokens)`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Example usage with a test token
trackToken('EVffkfnDVxKNhyNCqJ3LYbCdcwP7AkGN9jjffcw2pump');
