export type StrategyType = 
  | 'fast_ema' 
  | 'rsi_burst' 
  | 'bollinger_bounce' 
  | 'pinbar_scalp';

export type Timeframe = 'M1' | 'M5';

export type AccountType = 'standard' | 'cent';

export interface EAConfig {
  eaName: string;
  magicNumber: number;
  tradeComment: string;
  accountBalance: number;
  accountType: AccountType;
  currency: string;
  leverage: number;
  symbol: string;
  timeframe: Timeframe;
  strategy: StrategyType;
  
  // Lot & Risk
  lotSize: number;
  maxOpenTrades: number;
  minFreeEquityUSD: number;
  dailyProfitTargetUSD: number;
  dailyLossLimitUSD: number;
  
  // Execution & Rapid Scalping
  takeProfitPoints: number;    // e.g. 35 pts = 3.5 pips
  stopLossPoints: number;      // e.g. 45 pts = 4.5 pips
  useBreakEven: boolean;
  breakEvenTriggerPoints: number; // e.g. 15 pts = 1.5 pips
  breakEvenLockPoints: number;    // e.g. 3 pts = 0.3 pips locked in
  useTrailingStop: boolean;
  trailingStopPoints: number;     // e.g. 20 pts
  trailingStepPoints: number;     // e.g. 5 pts
  maxHoldTimeSeconds: number;     // e.g. 180s (exit if stagnant)
  
  // Filters
  maxSpreadPoints: number;        // e.g. 12 pts (1.2 pips)
  slippagePoints: number;         // e.g. 5 pts
  
  // Indicator Parameters
  emaFastPeriod: number;          // e.g. 5
  emaSlowPeriod: number;          // e.g. 13
  emaTrendPeriod: number;         // e.g. 34
  rsiPeriod: number;              // e.g. 7
  rsiOverbought: number;          // e.g. 75
  rsiOversold: number;            // e.g. 25
  bbPeriod: number;               // e.g. 20
  bbDeviation: number;            // e.g. 2.0

  // Advanced Modular Additions
  useSessionFilter: boolean;      // Trading Hours Filter (avoids rollover spread spikes)
  startHour: number;              // e.g. 8 (08:00 Server Time)
  endHour: number;                // e.g. 20 (20:00 Server Time)
  useAutoCompounding: boolean;    // Auto-increase lots as account grows from $5 to $20+
  compoundBalanceStepUSD: number; // e.g. $15 per 0.01 lot
  useLossCooldown: boolean;       // Anti-revenge pause after consecutive losses
  maxConsecutiveLosses: number;   // e.g. 2 losses
  cooldownMinutes: number;        // e.g. 30 min cooldown
  useFridayClose: boolean;        // Close trades on Friday to avoid weekend gap blowout
  fridayCloseHour: number;        // e.g. 20 (20:00 GMT/Server)
  useMobileAlerts: boolean;       // MT5 Push Notifications to iOS/Android phone
  useTickVelocityFilter: boolean; // Fast tick impulse filter for institutional momentum
  useAtrDynamicScaling: boolean;  // ATR volatility adaptive TP/SL scaler
  atrPeriod: number;              // ATR indicator period (e.g. 14)
  atrMultiplierTP: number;        // Multiplier for Take Profit (e.g. 1.2)
  atrMultiplierSL: number;        // Multiplier for Stop Loss (e.g. 1.5)

  // Remote App Controller & Cloud Sync
  useCloudSync: boolean;          // Connect to Remote App Controller
  cloudBridgeUrl: string;         // Remote Web/Mobile App URL
  pairingKey: string;             // Secret Pairing Token (e.g. SCALP-778901)
  syncIntervalSeconds: number;    // Heartbeat rate in seconds (e.g. 2s)
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradePosition {
  id: string;
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  openTime: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  breakEvenApplied: boolean;
  pnlUSD: number;
  pnlPoints: number;
  status: 'OPEN' | 'CLOSED';
  closeTime?: number;
  closePrice?: number;
  closeReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'BREAK_EVEN' | 'TRAILING_STOP' | 'TIME_EXIT' | 'MANUAL';
  durationSeconds?: number;
}

export interface SimulationStats {
  startingBalance: number;
  currentBalance: number;
  equity: number;
  netProfit: number;
  profitPercentage: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownUSD: number;
  maxDrawdownPercent: number;
  avgDurationSeconds: number;
  marginUsed: number;
  freeMargin: number;
  marginLevelPercent: number;
}

export interface StrategyPreset {
  id: string;
  name: string;
  accountDesc: string;
  targetAccount: number;
  timeframe: Timeframe;
  strategy: StrategyType;
  tpPips: number;
  slPips: number;
  bePips: number;
  maxHoldSeconds: number;
  leverage: number;
  description: string;
}
