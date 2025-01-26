import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import { generateAIResponse } from './services/ai';
import axios from 'axios';
import { getTokenImage } from './image-worker';
import { pricePredictionService } from './services/price-prediction';
import { cryptoService } from './services/crypto'; // Import the crypto service

// Constants
const CACHE_DURATION = 30000; // 30 seconds cache
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1';

// Configure axios with timeout and headers
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

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

// Cache structure for API data
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};

if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY must be set in environment variables");
}

// Update Helius RPC URL with the working API key
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';

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
  const httpServer = createServer(app);

  // Initialize WebSocket manager - this will handle all WebSocket connections
  wsManager.initialize(httpServer);

  // Initialize PumpPortal WebSocket
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

  // Add token analytics endpoint
  app.get('/api/token-analytics/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting analytics for token ${mint}`);

      // 1. Get Basic Token Info using getAsset
      const tokenInfoResponse = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getAsset',
        params: [mint]
      });

      // 2. Get balance and holder information 
      const balanceResponse = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'balance-info',
        method: 'searchAssets',
        params: {
          ownerAddress: mint,
          page: 1, 
          limit: 1000
        }
      });

      // 3. Get recent transactions
      const txResponse = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'tx-history',
        method: 'getSignaturesForAsset',
        params: {
          assetId: mint,
          limit: 100,
          sortBy: {
            value: "blockTime",
            order: "desc"
          }
        }
      });

      // Process token information
      const supply = tokenInfoResponse.data.result.supply || 0;
      const decimals = tokenInfoResponse.data.result.decimals || 0;
      const mintAuthority = tokenInfoResponse.data.result.mintAuthority;
      const freezeAuthority = tokenInfoResponse.data.result.freezeAuthority;

      // Calculate creation time from transaction history or use current time
      const creationTime = Date.now(); // Default to current time
      let holders = new Map();
      let snipers = new Set();
      let trades = [];

      // Process transactions if available
      if (txResponse.data?.result) {
        const transactions = txResponse.data.result;
        const sniperWindow = 30000; // 30 seconds after creation

        // Get parsed transaction details
        const parsedTxResponse = await axios.post(HELIUS_RPC_URL, {
          jsonrpc: '2.0',
          id: 'parsed-tx',
          method: 'getParsedTransactions',
          params: {
            signatures: transactions.map(tx => tx.signature)
          }
        });

        const parsedTxs = parsedTxResponse.data.result || [];
        parsedTxs.forEach(tx => {
          const tokenTransfer = tx.tokenTransfers?.[0];
          if (!tokenTransfer) return;

          if (tx.timestamp && tx.timestamp < creationTime) {
            creationTime = tx.timestamp;
          }

          // Track trades
          trades.push({
            type: tokenTransfer.fromUserAccount ? 'sell' : 'buy',
            amount: tokenTransfer.tokenAmount,
            timestamp: tx.timestamp,
            address: tokenTransfer.fromUserAccount || tokenTransfer.toUserAccount
          });

          // Track holders
          if (tokenTransfer.toUserAccount) {
            const currentBalance = holders.get(tokenTransfer.toUserAccount) || 0;
            holders.set(tokenTransfer.toUserAccount, currentBalance + tokenTransfer.tokenAmount);
          }

          // Track potential snipers with enhanced detection
          if (tx.timestamp - creationTime <= sniperWindow) {
            const isLargeAmount = tokenTransfer.tokenAmount > (supply * 0.01); // Over 1% of supply
            const isVeryEarly = tx.timestamp - creationTime <= 5000; // Within first 5 seconds
            
            if (tokenTransfer.tokenAmount > 0 && (isLargeAmount || isVeryEarly)) {
              snipers.add({
                address: tokenTransfer.toUserAccount,
                amount: tokenTransfer.tokenAmount,
                timestamp: tx.timestamp,
                isWhale: isLargeAmount,
                isInstant: isVeryEarly
              });
            }
          }
        });
      }

      // Process holder information if available
      if (balanceResponse.data?.result?.items) {
        balanceResponse.data.result.items.forEach(item => {
          if (item.ownership?.owner && item.ownership?.amount) {
            holders.set(item.ownership.owner, item.ownership.amount);
          }
        });
      }

      // Calculate metrics
      const topHolders = Array.from(holders.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([address, amount]) => ({
          address,
          amount,
          pct: (amount / supply) * 100
        }));

      const holderConcentration = calculateHolderConcentration(topHolders);
      const snipersArray = Array.from(snipers).slice(0, 10);

      // Prepare analytics response
      const analytics = {
        token: {
          address: mint,
          name: tokenInfoResponse.data.result.name || 'Unknown',
          symbol: tokenInfoResponse.data.result.symbol || 'Unknown',
          decimals,
          totalSupply: supply,
          mintAuthority,
          freezeAuthority,
          createdAt: creationTime
        },
        holders: {
          total: holders.size,
          top10: topHolders,
          concentration: holderConcentration
        },
        snipers: {
          total: snipers.size,
          details: snipersArray,
          volume: Array.from(snipers).reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
        },
        trading: {
          volume24h: calculateVolume24h(trades),
          transactions24h: trades.filter(t => t.timestamp > Date.now() - 86400000).length,
          averageAmount: trades.length ? trades.reduce((sum, t) => sum + (t.amount || 0), 0) / trades.length : 0
        },
        risk: calculateRiskMetrics({
          tokenInfoResponse: tokenInfoResponse.data.result,
          topHolders,
          snipers: snipersArray,
          trades
        })
      };

// Helper functions for analytics
function calculateHolderConcentration(topHolders: any[]) {
  const top10Percentage = topHolders.reduce((sum, h) => sum + (h.pct || 0), 0);
  return {
    top10Percentage,
    riskLevel: top10Percentage > 80 ? 'high' : top10Percentage > 50 ? 'medium' : 'low'
  };
}

function calculateVolume24h(trades: any[]) {
  return trades
    .filter(t => t.timestamp > Date.now() - 86400000)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}

function calculateRiskMetrics(data: any) {
  let riskScore = 0;
  const risks = [];

  // Mint authority risk
  if (data.tokenInfoResponse.authorities?.length > 0) {
    riskScore += 30;
    risks.push({
      type: 'mint_authority',
      level: 'high',
      description: 'Token has active mint authority'
    });
  }

  // Holder concentration risk
  const topHolderPct = data.topHolders[0]?.pct || 0;
  if (topHolderPct > 50) {
    riskScore += 30;
    risks.push({
      type: 'holder_concentration',
      level: 'high',
      description: 'Single wallet holds >50% of supply'
    });
  }

  // Sniper activity risk
  if (data.snipers.length > 10) {
    riskScore += 20;
    risks.push({
      type: 'sniper_activity',
      level: 'medium',
      description: 'High sniper activity detected'
    });
  }

  // Trading volume risk
  const recentTrades = data.trades.filter(t => t.timestamp > Date.now() - 3600000);
  if (recentTrades.length < 5) {
    riskScore += 10;
    risks.push({
      type: 'low_activity',
      level: 'medium',
      description: 'Low trading activity in last hour'
    });
  }

  return {
    score: Math.min(100, riskScore),
    level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
    risks
  };
}


      console.log('[Routes] Analytics prepared:', {
        holdersCount: analytics.holders.total,
        snipersCount: analytics.snipers.total,
        riskLevel: analytics.risk.level
      });

      res.json(analytics);

    } catch (error: any) {
      console.error('[Routes] Token analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message,
        tokenAddress: req.params.mint
      });
    }
  });


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

      // 1. Get Basic Token Info and Transfers
      const [assetResponse, transfersResponse] = await Promise.all([
        axios.post(HELIUS_RPC_URL, {
          jsonrpc: '2.0',
          id: 'asset-info',
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

      const tokenInfo = assetResponse.data.result;
      const transfers = transfersResponse.data.result || [];

      // 2. Get Jupiter DEX Data
      let jupiterData = null;
      try {
        const jupResponse = await axios.get(`https://price.jup.ag/v4/price?ids=${mint}`);
        jupiterData = jupResponse.data?.data?.[mint];
      } catch (error) {
        console.log(`No Jupiter liquidity found for ${mint}`);
      }

      // 3. Process transfers to identify holders and snipers
      const holders = new Map();
      const snipers = new Set();
      const trades = [];
      const creationTime = transfers[transfers.length - 1]?.blockTime || Date.now();
      const sniperWindow = 30000; // 30 seconds

      transfers.forEach(transfer => {
        // Track holders
        const { fromAddress, toAddress, amount, blockTime } = transfer;

        if (fromAddress) {
          const currentFromBalance = holders.get(fromAddress) || 0;
          holders.set(fromAddress, currentFromBalance - amount);
        }

        if (toAddress) {
          const currentToBalance = holders.get(toAddress) || 0;
          holders.set(toAddress, currentToBalance + amount);

          // Check for snipers (early buyers)
          if (blockTime - creationTime <= sniperWindow) {
            snipers.add({
              address: toAddress,
              amount,
              timestamp: blockTime
            });
          }
        }

        // Track trades
        trades.push({
          type: fromAddress ? 'sell' : 'buy',
          address: fromAddress || toAddress,
          amount,
          timestamp: blockTime,
          price: jupiterData?.price || 0
        });
      });

      // 4. Calculate holder metrics
      const holderMetrics = calculateHolderMetrics(holders);
      const snipersArray = Array.from(snipers);
      const topHolders = getTopHolders(holders, 10);

      const holderConcentration = {
        top10Percentage: topHolders.reduce((sum, h) => sum + h.percentage, 0),
        riskLevel: 'low'
      };

      if (holderConcentration.top10Percentage > 80) {
        holderConcentration.riskLevel = 'high';
      } else if (holderConcentration.top10Percentage > 50) {
        holderConcentration.riskLevel = 'medium';
      }

      // 5. Prepare response
      const analytics = {
        holders: {
          total: holderMetrics.totalHolders,
          unique: holderMetrics.uniqueHolders,
          top10: topHolders,
          concentration: holderConcentration,
          distribution: holderMetrics.distribution
        },
        snipers: {
          total: snipersArray.length,
          details: snipersArray,
          volume: calculateSniperVolume(snipersArray),
          averageAmount: calculateAverageAmount(snipersArray)
        },
        trading: {
          volume24h: calculateVolume24h(trades),
          transactions24h: calculateTransactions24h(trades),
          averageTradeSize: calculateAverageTradeSize(trades),
          priceImpact: calculatePriceImpact(trades)
        },
        risk: {
          holderConcentration: holderConcentration.riskLevel,
          sniperActivity: snipersArray.length > 20 ? 'high' : snipersArray.length > 10 ? 'medium' : 'low',
          mintRisk: tokenInfo.authorities?.length > 0 ? 'high' : 'low',
          overallRisk: calculateOverallRisk({
            holderConcentration,
            snipers: snipersArray,
            authorities: tokenInfo.authorities
          })
        }
      };

      console.log('[Routes] Analytics prepared:', {
        holdersCount: analytics.holders.total,
        snipersCount: analytics.snipers.total,
        risk: analytics.risk.overallRisk
      });

      res.json(analytics);

    } catch (error: any) {
      console.error('[Routes] Token analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message
      });
    }
  });

  // Helper functions for analytics calculations
  function calculateHolderMetrics(holders: Map<string, number>) {
    const validHolders = Array.from(holders.entries())
      .filter(([_, balance]) => balance > 0);

    const totalHolders = validHolders.length;
    const totalSupply = validHolders.reduce((sum, [_, balance]) => sum + balance, 0);

    return {
      totalHolders,
      uniqueHolders: new Set(validHolders.map(([address]) => address)).size,
      distribution: calculateDistribution(validHolders, totalSupply)
    };
  }

  function calculateDistribution(holders: [string, number][], totalSupply: number) {
    const ranges = [
      { name: 'Whales (>1%)', min: 0.01 },
      { name: 'Large (0.1-1%)', min: 0.001, max: 0.01 },
      { name: 'Medium (0.01-0.1%)', min: 0.0001, max: 0.001 },
      { name: 'Small (<0.01%)', max: 0.0001 }
    ];

    return ranges.map(range => ({
      name: range.name,
      holders: holders.filter(([_, balance]) => {
        const percentage = balance / totalSupply;
        return (!range.min || percentage >= range.min) && 
               (!range.max || percentage < range.max);
      }).length
    }));
  }

  function getTopHolders(holders: Map<string, number>, limit: number) {
    return Array.from(holders.entries())
      .filter(([_, balance]) => balance > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([address, balance]) => ({
        address,
        balance,
        percentage: balance / Array.from(holders.values()).reduce((a, b) => a + b, 0) * 100
      }));
  }

  function calculateSniperVolume(snipers: any[]) {
    return snipers.reduce((sum: number, sniper: any) => sum + sniper.amount, 0);
  }

  function calculateAverageAmount(snipers: any[]) {
    return snipers.length ? calculateSniperVolume(snipers) / snipers.length : 0;
  }

  function calculateVolume24h(trades: any[]) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return trades
      .filter(trade => trade.timestamp >= oneDayAgo)
      .reduce((sum, trade) => sum + (trade.amount * trade.price), 0);
  }

  function calculateTransactions24h(trades: any[]) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return trades.filter(trade => trade.timestamp >= oneDayAgo).length;
  }

  function calculateAverageTradeSize(trades: any[]) {
    return trades.length ? trades.reduce((sum, trade) => sum + trade.amount, 0) / trades.length : 0;
  }

  function calculatePriceImpact(trades: any[]) {
    if (trades.length < 2) return 0;
    const sortedTrades = [...trades].sort((a, b) => b.amount - a.amount);
    const largestTrade = sortedTrades[0];
    const averageAmount = calculateAverageTradeSize(trades);
    return (largestTrade.amount / averageAmount) - 1;
  }

  function calculateOverallRisk(data: any) {
    let riskScore = 0;

    // Holder concentration risk
    if (data.holderConcentration.top10Percentage > 80) riskScore += 40;
    else if (data.holderConcentration.top10Percentage > 50) riskScore += 20;

    // Sniper activity risk
    if (data.snipers.length > 20) riskScore += 30;
    else if (data.snipers.length > 10) riskScore += 15;

    // Authority risk
    if (data.authorities?.length > 0) riskScore += 30;

    return {
      score: riskScore,
      level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'
    };
  }

  return httpServer;
}

// In-memory data structure for chat history
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