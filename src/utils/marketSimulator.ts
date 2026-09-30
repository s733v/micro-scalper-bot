import { Candle, EAConfig, SimulationStats, TradePosition } from '../types/ea';

/** Contract size of one standard lot (units of base currency). */
const CONTRACT_SIZE = 100_000;
/** EURUSD reference price used by the synthetic feed. */
const BASE_PRICE = 1.085;
/** Value in USD of a 0.00001 (1 point) move for 0.01 lot — $0.01 per point. */
const POINT_VALUE_PER_MICRO_LOT_USD = 0.01;
/** Assumed round-turn commission per 0.01 lot, in USD (typical ECN micro account). */
const COMMISSION_PER_MICRO_LOT_ROUND_TURN_USD = 0.02;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const roundPrice = (p: number) => Number(p.toFixed(5));

/** Deterministic PRNG (mulberry32) so backtests are reproducible run-to-run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------
// Indicator library (industry-standard formulas, Wilder's RSI & ATR)
// ------------------------------------------------------------------

export function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;

  let sma = 0;
  for (let i = 0; i < period; i++) sma += values[i];
  sma /= period;
  out[period - 1] = sma;
  for (let i = period; i < values.length; i++) {
    sma = values[i] * k + sma * (1 - k);
    out[i] = sma;
  }
  return out;
}

export function rsiWilderSeries(closes: number[], period: number): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function atrWilderSeries(candles: Candle[], period: number): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length <= period) return out;

  const trs: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }

  let atr = 0;
  for (let i = 1; i <= period; i++) atr += trs[i];
  atr /= period;
  out[period] = atr;
  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out[i] = atr;
  }
  return out;
}

export function bollingerSeries(closes: number[], period: number, deviation: number) {
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  const mid: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period) return { upper, mid, lower };

  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  for (let i = period - 1; i < closes.length; i++) {
    if (i >= period) sum += closes[i] - closes[i - period];
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    mid[i] = mean;
    upper[i] = mean + deviation * sd;
    lower[i] = mean - deviation * sd;
  }
  return { upper, mid, lower };
}

// ------------------------------------------------------------------
// Market Simulator
// ------------------------------------------------------------------

interface TickResult {
  newCandleCreated: boolean;
  executedTrade?: TradePosition;
  closedTrades: TradePosition[];
}

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
  private rng: () => number;
  private ticksPerBar: number;
  private tickInBar: number = 0;

  constructor(config: EAConfig, seed?: number) {
    this.config = config;
    this.rng = mulberry32(seed ?? config.magicNumber);
    this.balance = config.accountBalance;
    this.equity = config.accountBalance;
    this.peakEquity = config.accountBalance;
    this.currentPrice = BASE_PRICE;
    this.ticksPerBar = config.timeframe === 'M1' ? 12 : 60;
    this.simTime = Date.now() - 3600 * 1000;
    this.generateInitialCandles(60);
  }

  public updateConfig(newConfig: EAConfig) {
    this.config = newConfig;
    this.ticksPerBar = newConfig.timeframe === 'M1' ? 12 : 60;
  }

  public reset(startingBalance?: number, seed?: number) {
    const bal = startingBalance ?? this.config.accountBalance;
    this.balance = bal;
    this.equity = bal;
    this.peakEquity = bal;
    this.maxDrawdownUSD = 0;
    this.currentTicket = 10001;
    this.openPositions = [];
    this.closedPositions = [];
    this.currentPrice = BASE_PRICE;
    this.tickInBar = 0;
    this.rng = mulberry32(seed ?? this.config.magicNumber);
    this.simTime = Date.now() - 3600 * 1000;
    this.generateInitialCandles(60);
  }

  private generateInitialCandles(count: number) {
    this.candles = [];
    let price = this.currentPrice;
    const intervalSec = this.config.timeframe === 'M1' ? 60 : 300;

    for (let i = count; i >= 1; i--) {
      const time = this.simTime - i * intervalSec * 1000;
      const change = (this.rng() - 0.5) * 0.00035;
      const open = price;
      const close = open + change;
      const high = Math.max(open, close) + this.rng() * 0.0002;
      const low = Math.min(open, close) - this.rng() * 0.0002;
      this.candles.push({
        time,
        open: roundPrice(open),
        high: roundPrice(high),
        low: roundPrice(low),
        close: roundPrice(close),
        volume: Math.floor(this.rng() * 80) + 20,
      });
      price = close;
    }
    this.currentPrice = price;
  }

  /** Advance the simulation by one tick (~tickIntervalMs of simulated time). */
  public stepTick(): TickResult {
    const point = 0.00001;
    const intervalSec = this.config.timeframe === 'M1' ? 60 : 300;
    const tickIntervalMs = (intervalSec * 1000) / this.ticksPerBar;
    this.simTime += tickIntervalMs;

    // Random-walk price delta with mild mean reversion around the anchor.
    const drift = (this.rng() - 0.5) * 0.00008;
    const reversion = (BASE_PRICE - this.currentPrice) * 0.002;
    const spike = this.rng() > 0.94 ? (this.rng() - 0.5) * 0.00025 : 0;
    this.currentPrice = roundPrice(clamp(this.currentPrice + drift + reversion + spike, 1.05, 1.12));

    // Dynamic spread fluctuation (7-14 points typical on micro accounts)
    this.currentSpreadPoints = Math.floor(7 + this.rng() * 6);

    // Update active candle or roll a new one
    let newCandleCreated = false;
    let lastCandle = this.candles[this.candles.length - 1];
    this.tickInBar++;

    if (!lastCandle || this.tickInBar > this.ticksPerBar) {
      newCandleCreated = true;
      this.tickInBar = 1;
      const newCandle: Candle = {
        time: this.simTime,
        open: this.currentPrice,
        high: this.currentPrice,
        low: this.currentPrice,
        close: this.currentPrice,
        volume: 1,
      };
      this.candles.push(newCandle);
      if (this.candles.length > 240) this.candles.shift();
      lastCandle = newCandle;
    } else {
      lastCandle.high = Math.max(lastCandle.high, this.currentPrice);
      lastCandle.low = Math.min(lastCandle.low, this.currentPrice);
      lastCandle.close = this.currentPrice;
      lastCandle.volume += 1;
    }

    // 1. Manage existing open positions against the intra-bar extreme path
    const closedTradesThisTick = this.managePositions(point);

    // 2. Evaluate entry signal once per completed bar (no repaint entries)
    let executedTrade: TradePosition | undefined;
    if (newCandleCreated && this.canOpenTrade()) {
      const signal = this.evaluateSignal();
      if (signal) {
        executedTrade = this.openTrade(signal, point);
      }
    }

    this.updateEquity();

    return { newCandleCreated, executedTrade, closedTrades: closedTradesThisTick };
  }

  private canOpenTrade(): boolean {
    const c = this.config;

    if (this.openPositions.length >= c.maxOpenTrades) return false;
    if (this.equity < c.minFreeEquityUSD) return false;
    if (this.currentSpreadPoints > c.maxSpreadPoints) return false;

    // Session hours filter (uses simulated clock hour)
    if (c.useSessionFilter) {
      const hour = new Date(this.simTime).getHours();
      if (c.startHour !== c.endHour) {
        const inside =
          c.startHour < c.endHour
            ? hour >= c.startHour && hour < c.endHour
            : hour >= c.startHour || hour < c.endHour;
        if (!inside) return false;
      }
    }

    // Friday close filter
    if (c.useFridayClose) {
      const d = new Date(this.simTime);
      if (d.getDay() === 5 && d.getHours() >= c.fridayCloseHour) return false;
    }

    // Daily profit target / loss limit guards
    const dayPnl = this.realizedPnlSinceStartOfDay();
    if (c.dailyProfitTargetUSD > 0 && dayPnl >= c.dailyProfitTargetUSD) return false;
    if (c.dailyLossLimitUSD > 0 && dayPnl <= -c.dailyLossLimitUSD) return false;

    // Loss cooldown: N consecutive losing trades at the tail of history
    if (c.useLossCooldown && this.closedPositions.length >= c.maxConsecutiveLosses) {
      const tail = this.closedPositions.slice(-c.maxConsecutiveLosses);
      const allLosses = tail.every((t) => t.pnlUSD < 0);
      if (allLosses) {
        const lastLossTime = tail[tail.length - 1].closeTime ?? 0;
        const cooldownMs = c.cooldownMinutes * 60 * 1000;
        if (this.simTime - lastLossTime < cooldownMs) return false;
      }
    }

    return true;
  }

  private realizedPnlSinceStartOfDay(): number {
    const startOfDay = new Date(this.simTime);
    startOfDay.setHours(0, 0, 0, 0);
    return this.closedPositions
      .filter((t) => (t.closeTime ?? 0) >= startOfDay.getTime())
      .reduce((acc, t) => acc + t.pnlUSD, 0);
  }

  /** Signal evaluation on CLOSED bars only (index len-2 is the last completed bar). */
  private evaluateSignal(): 'BUY' | 'SELL' | null {
    const c = this.config;
    if (this.candles.length < Math.max(35, c.bbPeriod + 2, c.emaTrendPeriod + 2)) return null;

    const closes = this.candles.map((k) => k.close);
    const len = closes.length;
    // Completed bar (skip the still-forming bar at the tail)
    const i = len - 2;
    const cur = this.candles[i];
    const prev = this.candles[i - 1];

    switch (c.strategy) {
      case 'fast_ema': {
        const fast = emaSeries(closes, c.emaFastPeriod);
        const slow = emaSeries(closes, c.emaSlowPeriod);
        const trend = emaSeries(closes, c.emaTrendPeriod);
        if (isNaN(fast[i]) || isNaN(slow[i]) || isNaN(trend[i])) return null;

        // Fresh bullish crossover above trend filter
        if (fast[i] > slow[i] && fast[i - 1] <= slow[i - 1] && fast[i] > trend[i]) return 'BUY';
        // Fresh bearish crossover below trend filter
        if (fast[i] < slow[i] && fast[i - 1] >= slow[i - 1] && fast[i] < trend[i]) return 'SELL';
        return null;
      }

      case 'rsi_burst': {
        const rsi = rsiWilderSeries(closes, c.rsiPeriod);
        if (isNaN(rsi[i])) return null;
        // RSI crosses back up out of oversold
        if (rsi[i] > c.rsiOversold && rsi[i - 1] <= c.rsiOversold) return 'BUY';
        // RSI crosses back down out of overbought
        if (rsi[i] < c.rsiOverbought && rsi[i - 1] >= c.rsiOverbought) return 'SELL';
        return null;
      }

      case 'bollinger_bounce': {
        const { upper, lower } = bollingerSeries(closes, c.bbPeriod, c.bbDeviation);
        if (isNaN(lower[i]) || isNaN(upper[i])) return null;
        if (cur.low <= lower[i] && cur.close > lower[i]) return 'BUY';
        if (cur.high >= upper[i] && cur.close < upper[i]) return 'SELL';
        return null;
      }

      case 'pinbar_scalp': {
        const range = cur.high - cur.low;
        if (range <= 0) return null;
        const lowerWick = Math.min(cur.open, cur.close) - cur.low;
        const upperWick = cur.high - Math.max(cur.open, cur.close);
        // Bullish pinbar rejecting lows, confirmed by next bar closing above its high
        if (lowerWick / range >= 0.55 && cur.close >= cur.open && this.candles[len - 1].close > cur.high) return 'BUY';
        if (upperWick / range >= 0.55 && cur.close <= cur.open && this.candles[len - 1].close < prev.low) return 'SELL';
        return null;
      }
    }
  }

  private openTrade(type: 'BUY' | 'SELL', point: number): TradePosition {
    const ask = roundPrice(this.currentPrice + this.currentSpreadPoints * point);
    const bid = this.currentPrice;
    const openPrice = type === 'BUY' ? ask : bid;

    // 1. Dynamic auto-compounding lot sizing
    let lot = this.config.lotSize;
    if (this.config.useAutoCompounding && this.config.compoundBalanceStepUSD > 0) {
      const steps = Math.floor(this.balance / this.config.compoundBalanceStepUSD);
      lot = Number(Math.min(0.05, this.config.lotSize + steps * 0.01).toFixed(2));
    }

    // 2. ATR volatility-scaled TP/SL (Wilder ATR on closed bars)
    let tpPoints = this.config.takeProfitPoints;
    let slPoints = this.config.stopLossPoints;
    if (this.config.useAtrDynamicScaling && this.candles.length >= this.config.atrPeriod + 1) {
      const atr = atrWilderSeries(this.candles, this.config.atrPeriod);
      const atrVal = atr[atr.length - 2]; // last completed bar
      if (!isNaN(atrVal) && atrVal > 0) {
        const dynamicTP = Math.round((atrVal * this.config.atrMultiplierTP) / point);
        const dynamicSL = Math.round((atrVal * this.config.atrMultiplierSL) / point);
        if (dynamicTP >= 15 && dynamicTP <= 55) tpPoints = dynamicTP;
        if (dynamicSL >= 20 && dynamicSL <= 60) slPoints = dynamicSL;
      }
    }

    let stopLoss = 0;
    let takeProfit = 0;
    if (slPoints > 0) {
      stopLoss = type === 'BUY'
        ? roundPrice(openPrice - slPoints * point)
        : roundPrice(openPrice + slPoints * point);
    }
    if (tpPoints > 0) {
      takeProfit = type === 'BUY'
        ? roundPrice(openPrice + tpPoints * point)
        : roundPrice(openPrice - tpPoints * point);
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
      pnlUSD: -(this.currentSpreadPoints * POINT_VALUE_PER_MICRO_LOT_USD * (lot / 0.01)) -
        COMMISSION_PER_MICRO_LOT_ROUND_TURN_USD * (lot / 0.01), // spread + commission at entry
      pnlPoints: 0,
      status: 'OPEN',
    };

    this.openPositions.push(trade);
    return trade;
  }

  /**
   * P&L in USD from a bid-referenced point move.
   * Buys open at ask and close at bid; sells open at bid and close at ask,
   * so both directions pay the spread once per round turn.
   */
  private positionPnlUSD(trade: TradePosition, rawPoints: number): number {
    const netPoints = rawPoints - this.currentSpreadPoints;
    const commission = COMMISSION_PER_MICRO_LOT_ROUND_TURN_USD * (trade.lot / 0.01);
    return Number((netPoints * POINT_VALUE_PER_MICRO_LOT_USD * (trade.lot / 0.01) - commission).toFixed(2));
  }

  private managePositions(point: number): TradePosition[] {
    const closed: TradePosition[] = [];
    const remaining: TradePosition[] = [];

    for (const trade of this.openPositions) {
      trade.currentPrice = this.currentPrice;
      const durationSeconds = Math.floor((this.simTime - trade.openTime) / 1000);
      trade.durationSeconds = durationSeconds;

      // Bid/ask-aware floating P&L: buys exit at bid, sells exit at ask (bid + spread)
      const bid = this.currentPrice;
      const ask = roundPrice(this.currentPrice + this.currentSpreadPoints * point);
      const rawPoints =
        trade.type === 'BUY'
          ? (bid - trade.openPrice) / point
          : (trade.openPrice - ask) / point;
      trade.pnlPoints = Math.round(rawPoints);
      trade.pnlUSD = this.positionPnlUSD(trade, rawPoints);

      let shouldClose = false;
      let closeReason: TradePosition['closeReason'] = undefined;
      let realizedRawPoints: number | undefined; // points at the exact trigger price

      // --- Stop-loss check first (conservative ambiguity rule when both hit in one bar)
      if (trade.stopLoss > 0) {
        if (trade.type === 'BUY' && this.currentPrice <= trade.stopLoss) {
          shouldClose = true;
          realizedRawPoints = (trade.stopLoss - trade.openPrice) / point;
          closeReason = trade.breakEvenApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
        } else if (trade.type === 'SELL' && ask >= trade.stopLoss) {
          shouldClose = true;
          realizedRawPoints = (trade.openPrice - trade.stopLoss) / point;
          closeReason = trade.breakEvenApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
        }
      }

      // --- Take-profit check
      if (!shouldClose && trade.takeProfit > 0) {
        if (trade.type === 'BUY' && this.currentPrice >= trade.takeProfit) {
          shouldClose = true;
          realizedRawPoints = (trade.takeProfit - trade.openPrice) / point;
          closeReason = 'TAKE_PROFIT';
        } else if (trade.type === 'SELL' && bid <= trade.takeProfit) {
          shouldClose = true;
          realizedRawPoints = (trade.openPrice - trade.takeProfit) / point;
          closeReason = 'TAKE_PROFIT';
        }
      }

      // --- Stale trade timeout
      if (!shouldClose && this.config.maxHoldTimeSeconds > 0 && durationSeconds >= this.config.maxHoldTimeSeconds) {
        shouldClose = true;
        closeReason = 'TIME_EXIT';
        realizedRawPoints = rawPoints;
      }

      if (shouldClose) {
        trade.status = 'CLOSED';
        trade.closeTime = this.simTime;
        trade.closeReason = closeReason;
        trade.closePrice =
          trade.type === 'BUY'
            ? roundPrice(trade.openPrice + (realizedRawPoints ?? rawPoints) * point)
            : roundPrice(trade.openPrice - (realizedRawPoints ?? rawPoints) * point);
        trade.pnlUSD = this.positionPnlUSD(trade, realizedRawPoints ?? rawPoints);
        this.balance = Number((this.balance + trade.pnlUSD).toFixed(2));
        this.closedPositions.push(trade);
        closed.push(trade);
      } else {
        // Rapid breakeven lock (only on live positions)
        if (this.config.useBreakEven && !trade.breakEvenApplied) {
          if (trade.pnlPoints >= this.config.breakEvenTriggerPoints) {
            trade.breakEvenApplied = true;
            trade.stopLoss =
              trade.type === 'BUY'
                ? roundPrice(trade.openPrice + this.config.breakEvenLockPoints * point)
                : roundPrice(trade.openPrice - this.config.breakEvenLockPoints * point);
          }
        }

        // Stepped trailing stop
        if (this.config.useTrailingStop && trade.pnlPoints > this.config.trailingStopPoints) {
          if (trade.type === 'BUY') {
            const candidateSL = roundPrice(bid - this.config.trailingStopPoints * point);
            if (candidateSL > trade.stopLoss + this.config.trailingStepPoints * point) {
              trade.stopLoss = candidateSL;
            }
          } else {
            const candidateSL = roundPrice(ask + this.config.trailingStopPoints * point);
            if (trade.stopLoss === 0 || candidateSL < trade.stopLoss - this.config.trailingStepPoints * point) {
              trade.stopLoss = candidateSL;
            }
          }
        }

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
    if (dd > this.maxDrawdownUSD) this.maxDrawdownUSD = Number(dd.toFixed(2));
  }

  public getStats(): SimulationStats {
    const totalTrades = this.closedPositions.length;
    const wins = this.closedPositions.filter((t) => t.pnlUSD > 0);
    const losses = this.closedPositions.filter((t) => t.pnlUSD < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const grossProfit = wins.reduce((acc, t) => acc + t.pnlUSD, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnlUSD, 0));
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.0 : 1.0;

    const netProfit = Number((this.balance - this.config.accountBalance).toFixed(2));
    const profitPct = this.config.accountBalance > 0
      ? Number(((netProfit / this.config.accountBalance) * 100).toFixed(1))
      : 0;

    const totalDuration = this.closedPositions.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
    const avgDuration = totalTrades > 0 ? Math.round(totalDuration / totalTrades) : 0;

    // Margin = (lot * contract size * price) / leverage
    const singleTradeMargin = (this.config.lotSize * CONTRACT_SIZE * this.currentPrice) / this.config.leverage;
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
      maxDrawdownPercent: this.config.accountBalance > 0
        ? Number(((this.maxDrawdownUSD / this.config.accountBalance) * 100).toFixed(1))
        : 0,
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
