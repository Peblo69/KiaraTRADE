import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import axios from 'axios';

// Constants
const CACHE_DURATION = 30000; // 30 seconds cache

// Add request interceptor for rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20;

axios.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return config;
});

if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY must be set in environment variables");
}

// Update Helius RPC URL with API key
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

function logHeliusError(error: any, context: string) {
  console.error(`[Helius ${context} Error]`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url,
    method: error.config?.method,
    params: error.config?.data
  });
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);

  // Initialize WebSocket manager with single server instance
  wsManager.initialize(server);

  // Initialize PumpPortal WebSocket with same server instance
  initializePumpPortalWebSocket();

  // Add predictions endpoint for all tokens
  app.get('/api/predictions', async (req, res) => {
    try {
      // Default tokens if not specified
      const tokens = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      const predictions: Record<string, any> = {};

      // Generate predictions for all tokens in parallel
      await Promise.all(
        tokens.map(async (symbol) => {
          try {
            predictions[symbol] = await pricePredictionService.getPricePrediction(symbol);
          } catch (error) {
            console.error(`Failed to generate prediction for ${symbol}:`, error);
          }
        })
      );

      console.log('[Routes] Generated predictions for tokens:', Object.keys(predictions));
      res.json(predictions);
    } catch (error: any) {
      console.error('[Routes] Failed to generate predictions:', error);
      res.status(500).json({
        error: 'Failed to generate predictions',
        details: error.message
      });
    }
  });

  // Add price prediction endpoint
  app.get('/api/prediction/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      console.log(`[Routes] Generating prediction for ${symbol}`);

      const prediction = await pricePredictionService.getPricePrediction(symbol);
      res.json(prediction);
    } catch (error: any) {
      console.error('[Routes] Prediction error:', error);
      res.status(500).json({
        error: 'Failed to generate prediction',
        details: error.message
      });
    }
  });

  // Add crypto news endpoint
  app.get('/api/crypto-news', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.news.data && (now - cache.news.timestamp) < CACHE_DURATION) {
        console.log('[Routes] Returning cached news data');
        return res.json(cache.news.data);
      }

      console.log('[Routes] Fetching fresh news from NewsData.io');

      const response = await axios.get(`${NEWSDATA_API_BASE}/news`, {
        params: {
          apikey: process.env.NEWSDATA_API_KEY,
          q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain',
          language: 'en',
          category: 'business,technology',
        }
      });

      console.log('[Routes] NewsData.io response status:', response.status);

      if (!response.data.results || !Array.isArray(response.data.results)) {
        throw new Error('Invalid API response format');
      }

      // Process NewsData.io news
      const news = response.data.results.map((item: any) => ({
        title: item.title,
        text: item.description || item.title,
        news_url: item.link,
        source_name: item.source_id,
        date: item.pubDate,
        image_url: item.image_url
      }));

      const newsResponse = { articles: news };

      cache.news = {
        data: newsResponse,
        timestamp: now
      };

      console.log('[Routes] Sending news response with', news.length, 'articles');
      res.json(newsResponse);
    } catch (error: any) {
      console.error('[Routes] News fetch error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch crypto news',
        details: error.response?.data || error.message
      });
    }
  });

  // Token image endpoints
  app.get('/api/token-image/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      console.log(`[Routes] Fetching image for token: ${symbol}`);

      const imageUrl = await getTokenImage(symbol);
      console.log(`[Routes] Image URL for ${symbol}:`, imageUrl);

      res.json({ imageUrl });
    } catch (error: any) {
      console.error('[Routes] Token image error:', error);
      res.status(500).json({
        error: 'Failed to fetch token image',
        details: error.message
      });
    }
  });

  app.post('/api/token-images/bulk', async (req, res) => {
    try {
      const { symbols, priority = false } = req.body;
      console.log(`[Routes] Bulk image request for ${symbols.length} tokens`);

      if (!Array.isArray(symbols)) {
        return res.status(400).json({ error: 'symbols must be an array' });
      }

      const images: Record<string, string> = {};

      // Add to priority queue if specified
      if (priority) {
        symbols.forEach(symbol => {
          console.log(`[Routes] Adding ${symbol} to priority queue`);
          addPriorityToken(symbol);
        });
      }

      await Promise.all(
        symbols.map(async (symbol) => {
          images[symbol] = await getTokenImage(symbol);
        })
      );

      console.log(`[Routes] Returning ${Object.keys(images).length} images`);
      res.json({ images });
    } catch (error: any) {
      console.error('[Routes] Bulk token images error:', error);
      res.status(500).json({
        error: 'Failed to fetch bulk token images',
        details: error.message
      });
    }
  });

  // New endpoint to serve all stored images
  app.get('/api/token-images/stored', async (req, res) => {
    try {
      console.log('[Routes] Fetching all stored token images');

      // Get all mappings first
      const mappings = await db
        .select()
        .from(coinMappings);

      // Get all images
      const images = await db
        .select()
        .from(coinImages);

      // Create a map of symbol to image URL
      const imageMap: Record<string, string> = {};

      // Map CoinGecko IDs to KuCoin symbols
      const idToSymbol = mappings.reduce((acc: Record<string, string>, mapping) => {
        acc[mapping.coingecko_id] = mapping.kucoin_symbol;
        return acc;
      }, {});

      // Create final mapping of symbols to image URLs
      images.forEach(image => {
        const symbol = idToSymbol[image.coingecko_id];
        if (symbol) {
          imageMap[symbol] = image.image_url;
        }
      });

      console.log(`[Routes] Returning ${Object.keys(imageMap).length} stored images`);
      res.json({ images: imageMap });
    } catch (error: any) {
      console.error('[Routes] Error fetching stored images:', error);
      res.status(500).json({
        error: 'Failed to fetch stored images',
        details: error.message
      });
    }
  });


  // Market data endpoint
  app.get('/api/coins/markets', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.prices.data && (now - cache.prices.timestamp) < CACHE_DURATION) {
        return res.json(cache.prices.data);
      }

      // Fetch all USDT markets stats
      const response = await axios.get(`${KUCOIN_API_BASE}/market/allTickers`);

      cache.prices = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Markets error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch market data',
        details: error.response?.data?.msg || error.message
      });
    }
  });

  // Single coin details endpoint with price history
  app.get('/api/coins/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;

      const [marketStats, klines] = await Promise.all([
        axios.get(`${KUCOIN_API_BASE}/market/stats`, {
          params: { symbol }
        }),
        axios.get(`${KUCOIN_API_BASE}/market/candles`, {
          params: {
            symbol,
            type: '1day',
            startAt: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
            endAt: Math.floor(Date.now() / 1000)
          }
        })
      ]);

      // KuCoin returns klines in reverse order [timestamp, open, close, high, low, volume, turnover]
      const prices = klines.data.data
        .reverse()
        .map((kline: string[]) => [parseInt(kline[0]) * 1000, parseFloat(kline[2])]);

      const response = {
        stats: marketStats.data.data,
        chart: {
          prices
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('Coin details error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch coin details',
        details: error.response?.data?.msg || error.message
      });
    }
  });

  // Trending coins endpoint (using top volume from 24h stats)
  app.get('/api/trending', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.trending.data && (now - cache.trending.timestamp) < CACHE_DURATION) {
        return res.json(cache.trending.data);
      }

      const response = await axios.get(`${KUCOIN_API_BASE}/market/allTickers`);
      const markets = response.data.data.ticker.filter((t: any) => t.symbol.endsWith('-USDT'));

      // Sort by volume and take top 10
      const trending = markets
        .sort((a: any, b: any) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, 10)
        .map((market: any) => {
          const symbol = market.symbol.replace('-USDT', '');
          const metadata = getCoinMetadata(symbol);
          return {
            item: {
              id: symbol.toLowerCase(),
              coin_id: symbol.toLowerCase(),
              name: metadata.name,
              symbol: symbol.toLowerCase(),
              market_cap_rank: null,
              thumb: metadata.image,
              small: metadata.image,
              large: metadata.image,
              score: parseFloat(market.volValue)
            }
          };
        });

      const trendingResponse = { coins: trending };

      cache.trending = {
        data: trendingResponse,
        timestamp: now
      };

      res.json(trendingResponse);
    } catch (error: any) {
      console.error('Trending error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch trending coins',
        details: error.response?.data?.msg || error.message
      });
    }
  });

  // Add klines (candlestick) endpoint with configurable timeframe
  app.get('/api/klines', async (req, res) => {
    try {
      const timeframe = req.query.timeframe || '1h';
      const tokens = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      const chartData: Record<string, any> = {};

      // Map frontend timeframes to KuCoin timeframes
      const timeframeMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '4h': '4hour',
        '1d': '1day',
        '1w': '1week'
      };

      const kucoinTimeframe = timeframeMap[timeframe as string] || '1hour';

      await Promise.all(
        tokens.map(async (symbol) => {
          try {
            const response = await axios.get(`${KUCOIN_API_BASE}/market/candles`, {
              params: {
                symbol,
                type: kucoinTimeframe,
                startAt: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), // Last 7 days
                endAt: Math.floor(Date.now() / 1000)
              }
            });

            if (!response.data.data) {
              console.warn(`[Routes] No klines data received for ${symbol}`);
              return;
            }

            // KuCoin returns klines in reverse chronological order as arrays:
            // [timestamp, open, close, high, low, volume, turnover]
            const klines = response.data.data
              .reverse() // Reverse to get chronological order
              .map((k: string[]) => ({
                time: parseInt(k[0]), // Timestamp in seconds
                open: parseFloat(k[1]),
                close: parseFloat(k[2]),
                high: parseFloat(k[3]),
                low: parseFloat(k[4]),
                volume: parseFloat(k[5])
              }));

            chartData[symbol] = { klines };
          } catch (error) {
            console.error(`[Routes] Failed to fetch klines for ${symbol}:`, error);
          }
        })
      );

      res.json(chartData);
    } catch (error: any) {
      console.error('[Routes] Failed to fetch klines:', error);
      res.status(500).json({
        error: 'Failed to fetch klines data',
        details: error.message
      });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get or initialize chat history for this session
      if (!chatHistory[sessionId]) {
        chatHistory[sessionId] = [];
      }

      // Generate response using our AI service
      const response = await generateAIResponse(message, chatHistory[sessionId]);

      // Update chat history
      chatHistory[sessionId].push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      // Keep only last 10 messages to prevent context from growing too large
      if (chatHistory[sessionId].length > 20) {
        chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to process chat request' });
    }
  });

  // Add market context endpoint
  app.get('/api/market-context/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      console.log(`[Routes] Getting market context for ${symbol}`);

      const context = await cryptoService.getMarketContext(symbol);
      res.json(context);
    } catch (error: any) {
      console.error('[Routes] Market context error:', error);
      res.status(500).json({
        error: 'Failed to get market context',
        details: error.message
      });
    }
  });

  // Wallet data endpoint 
  app.get('/api/wallet/:address', async (req, res) => {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: 'Wallet address is required'
        });
      }

      console.log(`[DEBUG] Starting wallet data fetch for address: ${address}`);
      console.log(`[DEBUG] Using Helius API with key: ${process.env.HELIUS_API_KEY?.substring(0, 5)}...`);

      // Portfolio request
      try {
        const portfolioResponse = await axios.post(HELIUS_RPC_URL, {
          jsonrpc: '2.0',
          id: 'portfolio-request',
          method: 'getPortfolio',
          params: {
            ownerAddress: address,
            options: {
              tokens: true,
              nfts: false,
              portionSize: 20
            }
          }
        });

        console.log('[DEBUG] Portfolio Response:', {
          status: portfolioResponse.status,
          hasResult: !!portfolioResponse.data?.result
        });
        if (!portfolioResponse.data?.result) {
          throw new Error('Invalid portfolio response from Helius API');
        }
        const portfolio = portfolioResponse.data.result;

        // Transaction request
        try {
          const txResponse = await axios.post(HELIUS_RPC_URL, {
            jsonrpc: '2.0',
            id: 'tx-request',
            method: 'getParsedTransactions',
            params: {
              address,
              numResults: 20
            }
          });

          console.log('[DEBUG] Transaction Response:', {
            status: txResponse.status,
            hasResult: !!txResponse.data?.result
          });
          if (!txResponse.data?.result) {
            throw new Error('Invalid transaction response from Helius API');
          }
          const transactions = txResponse.data.result.map((tx: any) => {
            const transfer = tx.tokenTransfers?.[0];
            let type: 'buy' | 'sell' | 'transfer' = 'transfer';

            if (transfer) {
              type = transfer.fromUserAccount === address ? 'sell' : 'buy';
            }

            return {
              signature: tx.signature,
              type,
              tokenSymbol: transfer?.symbol || 'SOL',
              amount: transfer?.tokenAmount || 0,
              price: transfer?.price || 0,
              timestamp: tx.timestamp * 1000,
              value: (transfer?.tokenAmount || 0) * (transfer?.price || 0)
            };
          });

          // Map tokens to our format
          const tokens = (portfolio.tokens || []).map((token: any) => ({
            mint: token.tokenAddress,
            amount: token.amount,
            symbol: token.symbol || 'Unknown',
            price: token.price || 0,
            value: token.value || 0,
            pnl24h: token.priceChange24h || 0
          }));

          const balance = portfolio.value || 0;

          // Calculate PNL
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

          const dailyTxs = transactions.filter(tx => tx.timestamp > oneDayAgo);
          const weeklyTxs = transactions.filter(tx => tx.timestamp > oneWeekAgo);

          const calculatePNL = (txs: any[]) => {
            const buys = txs.filter(tx => tx.type === 'buy')
              .reduce((sum, tx) => sum + tx.value, 0);
            const sells = txs.filter(tx => tx.type === 'sell')
              .reduce((sum, tx) => sum + tx.value, 0);

            if (buys === 0) return 0;
            return ((sells - buys) / buys * 100);
          };

          const pnl = {
            daily: calculatePNL(dailyTxs),
            weekly: calculatePNL(weeklyTxs),
            monthly: 0
          };

          res.json({
            address,
            balance,
            tokens,
            transactions,
            pnl
          });
        } catch (error: any) {
          logHeliusError(error, 'Transactions');
          throw error;
        }
      } catch (error: any) {
        logHeliusError(error, 'Portfolio');
        throw error;
      }

    } catch (error: any) {
      console.error('[DEBUG] Wallet data error:', {
        message: error.message,
        stack: error.stack,
        response: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        }
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch wallet data',
        details: error.response?.data || error.message
      });
    }
  });

  // Add token analytics endpoint
  app.get('/api/token-analytics/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting analytics for token ${mint}`);

      // 1. Validate mint address format
      if (!mint || mint.length < 32) {
        throw new Error('Invalid token mint address');
      }

      // 2. Get Basic Token Info and Transfers with detailed logging
      console.log(`[Routes] Fetching token info from Helius for ${mint}`);
      const [tokenResponse, transfersResponse] = await Promise.all([
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

      console.log('[Routes] Token API Response:', {
        hasTokenInfo: !!tokenResponse.data?.result,
        transfersCount: transfersResponse.data?.result?.length || 0
      });

      const tokenInfo = tokenResponse.data?.result;
      if (!tokenInfo) {
        throw new Error('Failed to fetch token information');
      }

      const transfers = transfersResponse.data?.result || [];
      console.log(`[Routes] Processing ${transfers.length} transfers`);

      // 3. Process transfers to identify holders and snipers
      const holders = new Map<string, number>();
      const snipers = new Set<any>();
      const trades: any[] = [];
      const creationTime = transfers[transfers.length - 1]?.blockTime || Date.now();
      const sniperWindow = 30000; // 30 seconds

      // Process transfers
      transfers.forEach((transfer: any, index: number) => {
        if (!transfer) {
          console.warn(`[Routes] Skipping invalid transfer at index ${index}`);
          return;
        }

        const { fromUserAccount, toUserAccount, amount, blockTime } = transfer;

        if (fromUserAccount) {
          const currentFromBalance = holders.get(fromUserAccount) || 0;
          holders.set(fromUserAccount, currentFromBalance - (amount || 0));
        }

        if (toUserAccount) {
          const currentToBalance = holders.get(toUserAccount) || 0;
          holders.set(toUserAccount, currentToBalance + (amount || 0));

          // Check for snipers (early buyers)
          if (blockTime && blockTime - creationTime <= sniperWindow) {
            snipers.add({
              address: toUserAccount,
              amount: amount || 0,
              timestamp: blockTime
            });
          }
        }

        trades.push({
          type: fromUserAccount ? 'sell' : 'buy',
          amount: amount || 0,
          timestamp: blockTime,
          address: fromUserAccount || toUserAccount
        });
      });

      // 4. Calculate metrics
      const holderMetrics = calculateHolderMetrics(holders);
      const snipersArray = Array.from(snipers);
      const topHolders = getTopHolders(holders, 10);

      const holderConcentration = {
        top10Percentage: topHolders.reduce((sum, h) => sum + (h.percentage || 0), 0),
        riskLevel: 'low' as 'low' | 'medium' | 'high'
      };

      // Determine risk level based on concentration
      if (holderConcentration.top10Percentage > 80) {
        holderConcentration.riskLevel = 'high';
      } else if (holderConcentration.top10Percentage > 50) {
        holderConcentration.riskLevel = 'medium';
      }

      // 5. Prepare response
      const analytics = {
        token: {
          address: mint,
          name: tokenInfo.name || 'Unknown',
          symbol: tokenInfo.symbol || 'Unknown',
          decimals: tokenInfo.decimals || 0,
          totalSupply: tokenInfo.supply || 0,
          mintAuthority: tokenInfo.authorities?.find((a: any) => a.type === 'mint')?.address || null,
          freezeAuthority: tokenInfo.authorities?.find((a: any) => a.type === 'freeze')?.address || null,
          mutable: true,
          created: tokenInfo.createdAt || Date.now(),
          supply: tokenInfo.supply || 0
        },
        holders: {
          total: holderMetrics.totalHolders,
          unique: holderMetrics.uniqueHolders,
          top10: topHolders,
          concentration: holderConcentration,
          distribution: holderMetrics.distribution
        },
        snipers: {
          total: snipersArray.length,
          details: snipersArray.map(s => ({
            address: s.address,
            amount: s.amount,
            timestamp: s.timestamp
          })),
          volume: calculateSniperVolume(snipersArray),
          averageAmount: calculateAverageAmount(snipersArray)
        },
        trading: {
          volume24h: calculateVolume24h(trades),
          transactions24h: calculateTransactions24h(trades),
          averageTradeSize: calculateAverageTradeSize(trades),
          priceImpact: calculatePriceImpact(trades)
        },
        risks: [
          {
            name: 'Holder Concentration',
            score: holderConcentration.top10Percentage > 80 ? 100 : holderConcentration.top10Percentage > 50 ? 50 : 0
          },
          {
            name: 'Mint Authority',
            score: tokenInfo.authorities?.find((a: any) => a.type === 'mint') ? 100 : 0
          },
          {
            name: 'Freeze Authority',
            score: tokenInfo.authorities?.find((a: any) => a.type === 'freeze') ? 100 : 0
          },
          {
            name: 'Sniper Activity',
            score: snipersArray.length > 20 ? 100 : snipersArray.length > 10 ? 50 : 0
          }
        ],
        rugScore: calculateRiskScore(tokenInfo, holderConcentration, snipersArray)
      };

      console.log('[Routes] Analytics prepared:', {
        holdersCount: analytics.holders.total,
        snipersCount: analytics.snipers.total,
        risks: analytics.risks
      });

      res.json(analytics);
    } catch (error: any) {
      console.error('[Routes] Token analytics error:', error);
      if (error.response) {
        console.error('[Routes] Response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message
      });
    }
  });

  return server;
}

// Helper functions
function calculateRiskScore(tokenInfo: any, holderConcentration: any, snipers: any[]): number {
  let score = 0;

  // Mint authority risk (30 points)
  if (tokenInfo.authorities?.find((a: any) => a.type === 'mint')) {
    score += 30;
  }

  // Holder concentration risk (40 points)
  if (holderConcentration.top10Percentage > 80) {
    score += 40;
  } else if (holderConcentration.top10Percentage > 50) {
    score += 20;
  }

  // Sniper activity risk (30 points)
  if (snipers.length > 20) {
    score += 30;
  } else if (snipers.length > 10) {
    score += 15;
  }

  return score;
}

function calculateHolderMetrics(holders: Map<string, number>) {
  const validHolders = Array.from(holders.entries())
    .filter(([_, balance]) => balance > 0);

  const totalHolders = validHolders.length;

  return {
    totalHolders,
    uniqueHolders: new Set(validHolders.map(([address]) => address)).size,
    distribution: [
      { name: 'Active Wallets', holders: totalHolders }
    ]
  };
}

function getTopHolders(holders: Map<string, number>, limit: number) {
  const totalSupply = Array.from(holders.values()).reduce((a, b) => a + b, 0);

  return Array.from(holders.entries())
    .filter(([_, balance]) => balance > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([address, balance]) => ({
      address,
      balance,
      percentage: (balance / totalSupply) * 100
    }));
}

function calculateSniperVolume(snipers: Array<{ amount: number }>) {
  return snipers.reduce((sum, sniper) => sum + (sniper.amount || 0), 0);
}

function calculateAverageAmount(snipers: Array<{ amount: number }>) {
  if (!snipers.length) return 0;
  return calculateSniperVolume(snipers) / snipers.length;
}

function calculateTransactions24h(trades: Array<{ timestamp: number }>) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return trades.filter(trade => trade.timestamp >= oneDayAgo).length;
}

function calculateVolume24h(trades: Array<{ timestamp: number; amount: number }>) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return trades
    .filter(trade => trade.timestamp >= oneDayAgo)
    .reduce((sum, trade) => sum + (trade.amount || 0), 0);
}

function calculateAverageTradeSize(trades: Array<{ amount: number }>) {
  if (!trades.length) return 0;
  return trades.reduce((sum, trade) => sum + (trade.amount || 0), 0) / trades.length;
}

function calculatePriceImpact(trades: Array<{ amount: number }>) {
  if (trades.length < 2) return 0;

  const sortedTrades = [...trades].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const largestTrade = sortedTrades[0];
  const averageAmount = calculateAverageTradeSize(trades);

  return averageAmount ? (largestTrade.amount / averageAmount) - 1 : 0;
}

// Rest of the file
const chatHistory: Record<string, any[]> = {};

// Basic coin metadata mapping
const COIN_METADATA: Record<string, { name: string, image: string }> = {
  'BTC': {
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
  },
  'ETH': {
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
  },
  'SOL': {
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
  },
  'USDT': {
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
  },
  'XRP': {
    name: 'XRP',
    image: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/xrp.png'
  }
};

// Helper function to get coin metadata
const getCoinMetadata = (symbol: string) => {
  const cleanSymbol = symbol.replace('-USDT', '');
  return COIN_METADATA[cleanSymbol] || {
    name: cleanSymbol,
    image: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanSymbol.toLowerCase()}.png`
  };
};

// Helper function to format KuCoin data to match our frontend expectations
const formatKuCoinData = (markets: any[]) => {
  return markets.map(market => {
    if (!market.symbol.endsWith('-USDT')) return null;

    const symbol = market.symbol.replace('-USDT', '');
    const metadata = getCoinMetadata(symbol);
    return {
      id: symbol.toLowerCase(),
      symbol: symbol,
      name: metadata.name,
      image: metadata.image,
      current_price: parseFloat(market.last),
      market_cap: parseFloat(market.volValue),
      market_cap_rank: null,
      total_volume: parseFloat(market.vol),
      high_24h: parseFloat(market.high),
      low_24h: parseFloat(market.low),
      price_change_percentage_24h: parseFloat(market.changeRate) * 100,
      price_change_percentage_1h_in_currency: null,
      price_change_percentage_7d_in_currency: null,
      last_updated: new Date(market.time).toISOString(),
      sparkline_in_7d: { price: [] }
    };
  }).filter(Boolean);
};

// Placeholder for priority queue functionality
const priorityQueue: string[] = [];
const addPriorityToken = (symbol: string) => {
  priorityQueue.push(symbol);
  console.log(`Added ${symbol} to priority queue.`);
};
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1';
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};

import { generateAIResponse } from './services/ai';
import { getTokenImage } from './image-worker';
import { pricePredictionService } from './services/price-prediction';
import { cryptoService } from './services/crypto'; // Import the crypto service

interface TokenAnalytics {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    mutable: boolean;
    created: number;
    supply: number;
  };
  holders: {
    total: number;
    unique: number;
    top10: Array<{
      address: string;
      balance: number;
      percentage: number;
    }>;
    concentration: {
      top10Percentage: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    distribution: Array<{
      name: string;
      holders: number;
    }>;
  };
  snipers: {
    total: number;
    details: Array<{
      address: string;
      amount: number;
      timestamp: number;
    }>;
    volume: number;
    averageAmount: number;
  };
  trading: {
    volume24h: number;
    transactions24h: number;
    averageTradeSize: number;
    priceImpact: number;
  };
  risks: Array<{
    name: string;
    score: number;
  }>;
  rugScore: number;
}