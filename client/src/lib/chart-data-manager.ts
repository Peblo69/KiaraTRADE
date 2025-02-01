import { Time } from 'lightweight-charts';
import { debounce } from 'lodash';

export interface ChartCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class ChartDataManager {
  private candles: Map<number, ChartCandle> = new Map();
  private interval: number;
  private onUpdate: (candles: ChartCandle[]) => void;
  
  constructor(interval: number, onUpdate: (candles: ChartCandle[]) => void) {
    this.interval = interval;
    this.onUpdate = debounce(onUpdate, 100); // Prevent too many updates
  }

  addTrade(trade: {
    timestamp: number;
    priceInUsd: number;
    tokenAmount: number;
  }) {
    const candleTime = Math.floor(trade.timestamp / (this.interval * 1000)) * (this.interval * 1000);
    
    let candle = this.candles.get(candleTime);
    if (!candle) {
      candle = {
        time: candleTime / 1000 as Time,
        open: trade.priceInUsd,
        high: trade.priceInUsd,
        low: trade.priceInUsd,
        close: trade.priceInUsd,
        volume: trade.tokenAmount
      };
    } else {
      candle.high = Math.max(candle.high, trade.priceInUsd);
      candle.low = Math.min(candle.low, trade.priceInUsd);
      candle.close = trade.priceInUsd;
      candle.volume! += trade.tokenAmount;
    }
    
    this.candles.set(candleTime, candle);
    this.onUpdate(Array.from(this.candles.values())
      .sort((a, b) => Number(a.time) - Number(b.time)));
  }

  setInitialCandles(candles: ChartCandle[]) {
    this.candles.clear();
    candles.forEach(candle => {
      this.candles.set(Number(candle.time) * 1000, candle);
    });
    this.onUpdate(Array.from(this.candles.values())
      .sort((a, b) => Number(a.time) - Number(b.time)));
  }

  changeInterval(newInterval: number) {
    this.interval = newInterval;
    // Reaggregate existing trades with new interval
    const trades = Array.from(this.candles.values())
      .sort((a, b) => Number(a.time) - Number(b.time));
    this.candles.clear();
    trades.forEach(trade => {
      this.addTrade({
        timestamp: Number(trade.time) * 1000,
        priceInUsd: trade.close,
        tokenAmount: trade.volume || 0
      });
    });
  }
}

// Helper to convert trades to candles
export function convertTradesToCandles(
  trades: Array<{
    timestamp: number;
    priceInUsd: number;
    tokenAmount: number;
  }>,
  interval: number
): ChartCandle[] {
  const manager = new ChartDataManager(interval, () => {});
  trades.forEach(trade => manager.addTrade(trade));
  return Array.from(manager.getCandles().values())
    .sort((a, b) => Number(a.time) - Number(b.time));
}
