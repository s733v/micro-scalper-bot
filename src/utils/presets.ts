import { EAConfig, StrategyPreset } from '../types/ea';

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'preset_5dollar_m1',
    name: '$5 Account Hyper-Sniper',
    accountDesc: 'Engineered for $5.00 balance',
    targetAccount: 5.0,
    timeframe: 'M1',
    strategy: 'fast_ema',
    tpPips: 2.5,
    slPips: 3.5,
    bePips: 1.4,
    maxHoldSeconds: 120,
    leverage: 500,
    description: 'Ultra-fast M1 momentum scalp with rapid 120s max hold, zero-delay breakeven lock at +1.4 pips, and strict 1-position cap.',
  },
  {
    id: 'preset_10dollar_rsi',
    name: '$10 Account Quick Scalper',
    accountDesc: 'Optimized for $10.00 balance',
    targetAccount: 10.0,
    timeframe: 'M1',
    strategy: 'rsi_burst',
    tpPips: 3.5,
    slPips: 4.5,
    bePips: 1.8,
    maxHoldSeconds: 180,
    leverage: 500,
    description: 'Catches rapid micro oversold/overbought impulses on M1. Secures +3.5 pip gains quickly without waiting for slow targets.',
  },
  {
    id: 'preset_5dollar_cent',
    name: '$5 Cent Account (500 USC)',
    accountDesc: 'Best safety for micro traders',
    targetAccount: 5.0,
    timeframe: 'M5',
    strategy: 'bollinger_bounce',
    tpPips: 4.5,
    slPips: 5.0,
    bePips: 2.0,
    maxHoldSeconds: 300,
    leverage: 200,
    description: 'Treats $5 as 500 USC on cent brokers (Exness/RoboForex). Provides massive margin cushion with 0.01 lot micro scalping.',
  },
  {
    id: 'preset_m1_pinbar',
    name: 'M1 Wick Rejection Scalper',
    accountDesc: 'Price action impulse entry',
    targetAccount: 8.0,
    timeframe: 'M1',
    strategy: 'pinbar_scalp',
    tpPips: 3.0,
    slPips: 3.5,
    bePips: 1.2,
    maxHoldSeconds: 90,
    leverage: 500,
    description: 'Enters instantly when candle wicks reject key micro-levels. 90-second aggressive sniper exit.',
  },
];

export const DEFAULT_EA_CONFIG: EAConfig = {
  eaName: 'MicroScalper_MT5_SmallAcc',
  magicNumber: 778901,
  tradeComment: 'MicroScalp_M1',
  accountBalance: 5.0,
  accountType: 'standard',
  currency: 'USD',
  leverage: 500,
  symbol: 'EURUSD',
  timeframe: 'M1',
  strategy: 'fast_ema',

  // Lot & Risk
  lotSize: 0.01,
  maxOpenTrades: 1,
  minFreeEquityUSD: 3.5,
  dailyProfitTargetUSD: 2.5,
  dailyLossLimitUSD: 1.5,

  // Execution & Rapid Scalping
  takeProfitPoints: 25, // 2.5 pips
  stopLossPoints: 35,   // 3.5 pips
  useBreakEven: true,
  breakEvenTriggerPoints: 14, // 1.4 pips
  breakEvenLockPoints: 2,     // 0.2 pips locked
  useTrailingStop: true,
  trailingStopPoints: 15,     // 1.5 pips
  trailingStepPoints: 5,      // 0.5 pips
  maxHoldTimeSeconds: 120,    // 2 minutes

  // Filters
  maxSpreadPoints: 12,        // 1.2 pips
  slippagePoints: 5,

  // Indicators
  emaFastPeriod: 5,
  emaSlowPeriod: 13,
  emaTrendPeriod: 34,
  rsiPeriod: 7,
  rsiOverbought: 75,
  rsiOversold: 25,
  bbPeriod: 20,
  bbDeviation: 2.0,

  // Advanced Modular Additions - ALL ENABLED BY DEFAULT
  useSessionFilter: true,
  startHour: 8,
  endHour: 20,
  useAutoCompounding: true,
  compoundBalanceStepUSD: 15.0,
  useLossCooldown: true,
  maxConsecutiveLosses: 2,
  cooldownMinutes: 30,
  useFridayClose: true,
  fridayCloseHour: 20,
  useMobileAlerts: true,
  useTickVelocityFilter: true,
  useAtrDynamicScaling: true,
  atrPeriod: 14,
  atrMultiplierTP: 1.2,
  atrMultiplierSL: 1.5,

  // Remote App Controller Defaults
  useCloudSync: true,
  cloudBridgeUrl: typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-isuwyocwptisbpji4w6xdf-881671125978.europe-west2.run.app',
  pairingKey: 'SCALP-778901',
  syncIntervalSeconds: 2,
};
