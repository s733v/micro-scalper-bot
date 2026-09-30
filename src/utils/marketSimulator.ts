import { Candle, EAConfig, SimulationStats, TradePosition } from '../types/ea';

export class MarketSimulator {
  private config: EAConfig;
  private candles: Candle[] = [];
  private currentPrice: number;
  private currentSpreadPoints: number = 10;
  private currentTicket: number = 10001;
  private openPositions: TradePosition[] = [];
  private closedPositions: TradePosition[] = [];
  private balance: number;
  private equity: number;
  private peakEquity: number;
  private maxDrawdownUSD: number = 0;
  private simTime: number; // simulated epoch ms

  constructor(config: EAConfig) {
    this.config = config;
    this.balance = config.accountBalance;
    this.equity = config.accountBalance;
    this.peakEquity = config.accountBalance;
    this.currentPrice = 1.08500;
    this.simTime = Date.now() - 3600 * 1000;
    this.generateInitialCandles(50);
  }

  public updateConfig(newConfig: EAConfig) {
    this.config = newConfig;
  }

  public reset(startingBalance?: number) {
    const bal = startingBalance ?? this.config.accountBalance;
    this.balance = bal;
    this.equity = bal;
    this.peakEquity = bal;
    this.maxDrawdownUSD = 0;
    this.currentTicket = 10001;
    this.openPositions = [];
    this.closedPositions = [];
    this.currentPrice = 1.08500;
    this.simTime = Date.now() - 3600 * 1000;
    this.generateInitialCandles(50);
  }

  private generateInitialCandles(count: number) {
    this.candles = [];
    let price = this.currentPrice;
    const intervalSec = this.config.timeframe === 'M1' ? 60 : 300;

    for (let i = count; i >= 1; i--) {
      const time = this.simTime - i * intervalSec * 1000;
      const change = (Math.random() - 0.495) * 0.00035;
      const open = price;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 0.0002;
      const low = Math.min(open, close) - Math.random() * 0.0002;
      this.candles.push({
        time,
        open: Number(open.toFixed(5)),
        high: Number(high.toFixed(5)),
        low: Number(low.toFixed(5)),
        close: Number(close.toFixed(5)),
        volume: Math.floor(Math.random() * 80) + 20,
      });
      price = close;
    }
    this.currentPrice = price;
  }

  // Step simulation forward by 1 tick or micro-step
  public stepTick(): {
    newCandleCreated: boolean;
    executedTrade?: TradePosition;
    closedTrades: TradePosition[];
  } {
    const point = 0.00001;
    const intervalSec = this.config.timeframe === 'M1' ? 60 : 300;
    const tickIntervalMs = 2000; // 2 seconds per tick step
    this.simTime += tickIntervalMs;

    // Small price delta with micro-trend drift
    const drift = (Math.random() - 0.49) * 0.00008;
    const spike = Math.random() > 0.94 ? (Math.random() - 0.5) * 0.00025 : 0;
    const priceDelta = drift + spike;
    this.currentPrice = Number(Math.max(1.0500, this.currentPrice + priceDelta).toFixed(5));

    // Dynamic spread fluctuation (e.g. 7 - 14 points on micro accounts)
    this.currentSpreadPoints = Math.floor(7 + Math.random() * 6);

    // Update active candle or create new candle
    let newCandleCreated = false;
    let lastCandle = this.candles[this.candles.length - 1];
    if (!lastCandle || this.simTime - lastCandle.time >= intervalSec * 1000) {
      newCandleCreated = true;
      const newCandle: Candle = {
        time: this.simTime,
        open: this.currentPrice,
        high: this.currentPrice,
        low: this.currentPrice,
        close: this.currentPrice,
        volume: 1,
      };
      this.candles.push(newCandle);
      if (this.candles.length > 70) {
        this.candles.shift();
      }
      lastCandle = newCandle;
    } else {
      lastCandle.high = Math.max(lastCandle.high, this.currentPrice);
      lastCandle.low = Math.min(lastCandle.low, this.currentPrice);
      lastCandle.close = this.currentPrice;
      lastCandle.volume += 1;
    }

    // 1. Manage existing open positions (TP, SL, Breakeven, Trailing, Stale Exit)
    const closedTradesThisTick = this.managePositions(point);

    // 2. Check if we can open a new position
    let executedTrade: TradePosition | undefined;
    if (this.canOpenTrade()) {
      const signal = this.evaluateSignal();
      if (signal) {
        executedTrade = this.openTrade(signal, point);
      }
    }

    // Update balance & equity
    this.updateEquity();

    return {
      newCandleCreated,
      executedTrade,
      closedTrades: closedTradesThisTick,
    };
  }

  private canOpenTrade(): boolean {
    if (this.openPositions.length >= this.config.maxOpenTrades) {
      return false;
    }
    if (this.equity < this.config.minFreeEquityUSD) {
      return false;
    }
    if (this.currentSpreadPoints > this.config.maxSpreadPoints) {
      return false;
    }

    // Loss Cooldown check
    if (this.config.useLossCooldown && this.closedPositions.length >= this.config.maxConsecutiveLosses) {
      const recent = this.closedPositions.slice(0, this.config.maxConsecutiveLosses);
      const allLosses = recent.every(t => t.pnlUSD < 0);
      if (allLosses) {
        const lastLossTime = recent[0].closeTime || 0;
        const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
        if (this.simTime - lastLossTime < cooldownMs) {
          return false; // In cooldown
        }
      }
    }

    return true;
  }

  private evaluateSignal(): 'BUY' | 'SELL' | null {
    if (this.candles.length < 15) return null;
    const len = this.candles.length;
    const c1 = this.candles[len - 1];
    const c2 = this.candles[len - 2];
    const c3 = this.candles[len - 3];

    // Compute basic moving averages
    const closes = this.candles.map(c => c.close);
    const getSMA = (period: number) => {
      const slice = closes.slice(-period);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    switch (this.config.strategy) {
      case 'fast_ema': {
        const fast = getSMA(this.config.emaFastPeriod);
        const slow = getSMA(this.config.emaSlowPeriod);
        const trend = getSMA(this.config.emaTrendPeriod);

        // Bullish cross with micro-momentum
        if (fast > slow && c1.close > trend && c2.close <= slow + 0.00005) {
          return 'BUY';
        }
        if (fast < slow && c1.close < trend && c2.close >= slow - 0.00005) {
          return 'SELL';
        }
        break;
      }

      case 'rsi_burst': {
        // Fast RSI calculation
        const period = this.config.rsiPeriod;
        let gains = 0, losses = 0;
        for (let i = len - period; i < len; i++) {
          const diff = this.candles[i].close - this.candles[i - 1].close;
          if (diff >= 0) gains += diff;
          else losses += Math.abs(diff);
        }
        const rs = losses === 0 ? 100 : (gains / period) / (losses / period);
        const rsi = 100 - (100 / (1 + rs));

        if (rsi < this.config.rsiOversold + 4 && c1.close > c1.open) {
          return 'BUY';
        }
        if (rsi > this.config.rsiOverbought - 4 && c1.close < c1.open) {
          return 'SELL';
        }
        break;
      }

      case 'bollinger_bounce': {
        const mean = getSMA(this.config.bbPeriod);
        const variance = closes.slice(-this.config.bbPeriod).reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.config.bbPeriod;
        const stdDev = Math.sqrt(variance);
        const upper = mean + this.config.bbDeviation * stdDev;
        const lower = mean - this.config.bbDeviation * stdDev;

        if (c1.low <= lower && c1.close > lower) {
          return 'BUY';
        }
        if (c1.high >= upper && c1.close < upper) {
          return 'SELL';
        }
        break;
      }

      case 'pinbar_scalp': {
        const range = c2.high - c2.low;
        if (range > 0.00015) {
          const lowerWick = Math.min(c2.open, c2.close) - c2.low;
          const upperWick = c2.high - MathMax(c2.open, c2.close);
          if (lowerWick / range >= 0.55 && c1.close > c2.high - 0.00005) {
            return 'BUY';
          }
          if (upperWick / range >= 0.55 && c1.close < c2.low + 0.00005) {
            return 'SELL';
          }
        }
        break;
      }
    }

    // High frequency random impulse fallback for active testing if indicators are quiet
    if (Math.random() < 0.04) {
      return Math.random() > 0.5 ? 'BUY' : 'SELL';
    }

    return null;
  }

  private openTrade(type: 'BUY' | 'SELL', point: number): TradePosition {
    const ask = Number((this.currentPrice + (this.currentSpreadPoints * point)).toFixed(5));
    const bid = this.currentPrice;
    const openPrice = type === 'BUY' ? ask : bid;

    // 1. Dynamic Auto-Compounding Lot
    let lot = this.config.lotSize;
    if (this.config.useAutoCompounding && this.config.compoundBalanceStepUSD > 0) {
      const steps = Math.floor(this.balance / this.config.compoundBalanceStepUSD);
      lot = Number(Math.min(0.05, this.config.lotSize + steps * 0.01).toFixed(2));
    }

    // 2. Dynamic ATR Volatility Scaling
    let tpPoints = this.config.takeProfitPoints;
    let slPoints = this.config.stopLossPoints;
    if (this.config.useAtrDynamicScaling && this.candles.length >= 14) {
      const recentRanges = this.candles.slice(-14).map(c => c.high - c.low);
      const atrPrice = recentRanges.reduce((a, b) => a + b, 0) / 14;
      const dynamicTP = Math.round((atrPrice * this.config.atrMultiplierTP) / point);
      const dynamicSL = Math.round((atrPrice * this.config.atrMultiplierSL) / point);
      if (dynamicTP >= 15 && dynamicTP <= 55) tpPoints = dynamicTP;
      if (dynamicSL >= 20 && dynamicSL <= 60) slPoints = dynamicSL;
    }

    let stopLoss = 0;
    let takeProfit = 0;

    if (slPoints > 0) {
      stopLoss = type === 'BUY'
        ? Number((openPrice - (slPoints * point)).toFixed(5))
        : Number((openPrice + (slPoints * point)).toFixed(5));
    }

    if (tpPoints > 0) {
      takeProfit = type === 'BUY'
        ? Number((openPrice + (tpPoints * point)).toFixed(5))
        : Number((openPrice - (tpPoints * point)).toFixed(5));
    }

    const trade: TradePosition = {
      id: `trade_${this.currentTicket}`,
      ticket: this.currentTicket++,
      symbol: this.config.symbol,
      type,
      lot,
      openTime: this.simTime,
      openPrice,
      currentPrice: openPrice,
      stopLoss,
      takeProfit,
      breakEvenApplied: false,
      pnlUSD: 0,
      pnlPoints: 0,
      status: 'OPEN',
    };

    this.openPositions.push(trade);
    return trade;
  }

  private managePositions(point: number): TradePosition[] {
    const closed: TradePosition[] = [];
    const remaining: TradePosition[] = [];
    const contractMultiplier = this.config.accountType === 'cent' ? 1.0 : 10.0; // 0.01 lot EURUSD = $0.10 per pip (10 points)

    for (const trade of this.openPositions) {
      trade.currentPrice = this.currentPrice;
      const durationSeconds = Math.floor((this.simTime - trade.openTime) / 1000);
      trade.durationSeconds = durationSeconds;

      let pnlPoints = 0;
      if (trade.type === 'BUY') {
        pnlPoints = Math.round((this.currentPrice - trade.openPrice) / point);
      } else {
        pnlPoints = Math.round((trade.openPrice - this.currentPrice) / point);
      }
      trade.pnlPoints = pnlPoints;
      // 1 point = $0.01 for 0.01 micro lot
      trade.pnlUSD = Number((pnlPoints * 0.01 * (trade.lot / 0.01)).toFixed(2));

      let shouldClose = false;
      let closeReason: TradePosition['closeReason'] = undefined;

      // 1. Check Take Profit
      if (trade.takeProfit > 0) {
        if (trade.type === 'BUY' && this.currentPrice >= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TAKE_PROFIT';
        } else if (trade.type === 'SELL' && this.currentPrice <= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TAKE_PROFIT';
        }
      }

      // 2. Check Stop Loss
      if (!shouldClose && trade.stopLoss > 0) {
        if (trade.type === 'BUY' && this.currentPrice <= trade.stopLoss) {
          shouldClose = true;
          closeReason = trade.breakEvenApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
        } else if (trade.type === 'SELL' && this.currentPrice >= trade.stopLoss) {
          shouldClose = true;
          closeReason = trade.breakEvenApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
        }
      }

      // 3. Rapid Breakeven Trigger
      if (!shouldClose && this.config.useBreakEven && !trade.breakEvenApplied) {
        if (pnlPoints >= this.config.breakEvenTriggerPoints) {
          trade.breakEvenApplied = true;
          const lockedPrice = trade.type === 'BUY'
            ? Number((trade.openPrice + (this.config.breakEvenLockPoints * point)).toFixed(5))
            : Number((trade.openPrice - (this.config.breakEvenLockPoints * point)).toFixed(5));
          trade.stopLoss = lockedPrice;
        }
      }

      // 4. Stepped Trailing Stop
      if (!shouldClose && this.config.useTrailingStop && pnlPoints > this.config.trailingStopPoints) {
        if (trade.type === 'BUY') {
          const candidateSL = Number((this.currentPrice - (this.config.trailingStopPoints * point)).toFixed(5));
          if (candidateSL > trade.stopLoss + (this.config.trailingStepPoints * point)) {
            trade.stopLoss = candidateSL;
          }
        } else {
          const candidateSL = Number((this.currentPrice + (this.config.trailingStopPoints * point)).toFixed(5));
          if (trade.stopLoss === 0 || candidateSL < trade.stopLoss - (this.config.trailingStepPoints * point)) {
            trade.stopLoss = candidateSL;
          }
        }
      }

      // 5. Stale Trade Timeout (Rapid Scalping Killer)
      if (!shouldClose && this.config.maxHoldTimeSeconds > 0 && durationSeconds >= this.config.maxHoldTimeSeconds) {
        shouldClose = true;
        closeReason = 'TIME_EXIT';
      }

      if (shouldClose) {
        trade.status = 'CLOSED';
        trade.closeTime = this.simTime;
        trade.closePrice = this.currentPrice;
        trade.closeReason = closeReason;
        this.balance += trade.pnlUSD;
        this.closedPositions.unshift(trade);
        closed.push(trade);
      } else {
        remaining.push(trade);
      }
    }

    this.openPositions = remaining;
    return closed;
  }

  private updateEquity() {
    const floatingPnL = this.openPositions.reduce((acc, t) => acc + t.pnlUSD, 0);
    this.equity = Number((this.balance + floatingPnL).toFixed(2));
    this.peakEquity = Math.max(this.peakEquity, this.equity);
    const dd = this.peakEquity - this.equity;
    if (dd > this.maxDrawdownUSD) {
      this.maxDrawdownUSD = Number(dd.toFixed(2));
    }
  }

  public getStats(): SimulationStats {
    const totalTrades = this.closedPositions.length;
    const wins = this.closedPositions.filter(t => t.pnlUSD > 0);
    const losses = this.closedPositions.filter(t => t.pnlUSD < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    
    const grossProfit = wins.reduce((acc, t) => acc + t.pnlUSD, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnlUSD, 0));
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.0 : 1.0;

    const netProfit = Number((this.balance - this.config.accountBalance).toFixed(2));
    const profitPct = Number(((netProfit / this.config.accountBalance) * 100).toFixed(1));

    const totalDuration = this.closedPositions.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
    const avgDuration = totalTrades > 0 ? Math.round(totalDuration / totalTrades) : 0;

    // Margin calculation for 0.01 lot EURUSD at current leverage
    // Margin = (lot * 100,000 * price) / leverage
    const singleTradeMargin = (this.config.lotSize * 100000 * this.currentPrice) / this.config.leverage;
    const marginUsed = Number((singleTradeMargin * this.openPositions.length).toFixed(2));
    const freeMargin = Number(Math.max(0, this.equity - marginUsed).toFixed(2));
    const marginLevel = marginUsed > 0 ? Number(((this.equity / marginUsed) * 100).toFixed(0)) : 9999;

    return {
      startingBalance: this.config.accountBalance,
      currentBalance: Number(this.balance.toFixed(2)),
      equity: this.equity,
      netProfit,
      profitPercentage: profitPct,
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: Number(winRate.toFixed(1)),
      profitFactor,
      maxDrawdownUSD: this.maxDrawdownUSD,
      maxDrawdownPercent: Number(((this.maxDrawdownUSD / this.config.accountBalance) * 100).toFixed(1)),
      avgDurationSeconds: avgDuration,
      marginUsed,
      freeMargin,
      marginLevelPercent: marginLevel,
    };
  }

  public getCandles(): Candle[] {
    return this.candles;
  }

  public getOpenPositions(): TradePosition[] {
    return this.openPositions;
  }

  public getClosedPositions(): TradePosition[] {
    return this.closedPositions;
  }

  public getCurrentPrice(): number {
    return this.currentPrice;
  }

  public getCurrentSpread(): number {
    return this.currentSpreadPoints;
  }
}

function MathMax(a: number, b: number): number {
  return a > b ? a : b;
}
