import React from 'react';
import { EAConfig, StrategyType, Timeframe } from '../types/ea';
import { STRATEGY_PRESETS } from '../utils/presets';
import { Sliders, ShieldCheck, Zap, Gauge, DollarSign } from 'lucide-react';

interface ConfigPanelProps {
  config: EAConfig;
  onChange: (updated: Partial<EAConfig>) => void;
  onApplyPreset: (presetId: string) => void;
  selectedPresetId?: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChange,
  onApplyPreset,
  selectedPresetId,
}) => {
  return (
    <div className="space-y-6">
      {/* Presets Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Scalping Strategy Presets
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tuned for micro account risk ratios ($5 to $10) and rapid M1/M5 momentum exits
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 tabular-nums">
            Capital: ${config.accountBalance.toFixed(2)} USD
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STRATEGY_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                className={`text-left p-3.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 shadow-sm shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">
                    {preset.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {preset.timeframe} · 1:{preset.leverage}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {preset.description}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400/90 pt-1.5 border-t border-slate-800/80">
                  <span>TP: {preset.tpPips} pips</span>
                  <span className="text-slate-600">·</span>
                  <span>Exit: {preset.maxHoldSeconds}s</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Account Capital & Margin Security */}
        <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Micro Account & Leverage
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Min Margin Guard Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Starting Balance
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-500">$</span>
                <input
                  type="number"
                  step="1"
                  min="3"
                  max="100"
                  value={config.accountBalance}
                  onChange={(e) => onChange({ accountBalance: Math.max(1, parseFloat(e.target.value) || 5) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 pl-6 pr-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Recommended: $5.00 or $10.00</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Type
              </label>
              <select
                value={config.accountType}
                onChange={(e) => onChange({ accountType: e.target.value as 'standard' | 'cent' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="standard">Standard USD ($5.00)</option>
                <option value="cent">Cent Account USC ($5 = 500¢)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Cent gives 100x margin buffer</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Broker Leverage
              </label>
              <select
                value={config.leverage}
                onChange={(e) => onChange({ leverage: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                <option value={100}>1:100 (Margin req ~$1.10)</option>
                <option value={200}>1:200 (Margin req ~$0.55)</option>
                <option value={500}>1:500 (Margin req ~$0.22 - Ideal)</option>
                <option value={1000}>1:1000 (Margin req ~$0.11)</option>
                <option value={2000}>1:2000 (Margin req ~$0.05)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">High leverage protects small balances</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Trading Lot Size
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.05"
                value={config.lotSize}
                onChange={(e) => onChange({ lotSize: parseFloat(e.target.value) || 0.01 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Strict 0.01 micro-lot for $5-$10</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Concurrent Trades
              </label>
              <input
                type="number"
                min="1"
                max="3"
                value={config.maxOpenTrades}
                onChange={(e) => onChange({ maxOpenTrades: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Keep 1 trade max on $5 account</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min Balance Floor ($USD)
              </label>
              <input
                type="number"
                step="0.5"
                value={config.minFreeEquityUSD}
                onChange={(e) => onChange({ minFreeEquityUSD: parseFloat(e.target.value) || 3.5 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Stops EA if balance drops below this</p>
            </div>
          </div>
        </div>

        {/* Panel 2: Rapid Execution & Fast Scalp Targets */}
        <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Rapid Scalp & Fast Exit Logic
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400">
              Zero-Delay Lock
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Take Profit (Points)
                </label>
                <span className="text-[11px] font-mono text-cyan-400">
                  {(config.takeProfitPoints / 10).toFixed(1)} pips
                </span>
              </div>
              <input
                type="number"
                step="5"
                min="15"
                max="100"
                value={config.takeProfitPoints}
                onChange={(e) => onChange({ takeProfitPoints: parseInt(e.target.value, 10) || 25 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Fast 2.0 to 4.0 pips micro-gain</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Stop Loss (Points)
                </label>
                <span className="text-[11px] font-mono text-rose-400">
                  {(config.stopLossPoints / 10).toFixed(1)} pips
                </span>
              </div>
              <input
                type="number"
                step="5"
                min="20"
                max="150"
                value={config.stopLossPoints}
                onChange={(e) => onChange({ stopLossPoints: parseInt(e.target.value, 10) || 35 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Tight protection against slippage</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Breakeven Trigger
                </label>
                <span className="text-[11px] font-mono text-emerald-400">
                  +{(config.breakEvenTriggerPoints / 10).toFixed(1)} pips
                </span>
              </div>
              <input
                type="number"
                step="2"
                min="10"
                max="50"
                value={config.breakEvenTriggerPoints}
                onChange={(e) => onChange({ breakEvenTriggerPoints: parseInt(e.target.value, 10) || 14 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Locks SL to entry + 0.2 pips</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Stale Trade Timeout
                </label>
                <span className="text-[11px] font-mono text-amber-400">
                  {config.maxHoldTimeSeconds}s
                </span>
              </div>
              <input
                type="number"
                step="30"
                min="30"
                max="600"
                value={config.maxHoldTimeSeconds}
                onChange={(e) => onChange({ maxHoldTimeSeconds: parseInt(e.target.value, 10) || 120 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Exits stagnant trades automatically</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Max Spread Filter
                </label>
                <span className="text-[11px] font-mono text-slate-300">
                  {(config.maxSpreadPoints / 10).toFixed(1)} pips
                </span>
              </div>
              <input
                type="number"
                step="1"
                min="5"
                max="30"
                value={config.maxSpreadPoints}
                onChange={(e) => onChange({ maxSpreadPoints: parseInt(e.target.value, 10) || 12 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Rejects entries during high spreads</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Daily Profit Target ($)
                </label>
                <span className="text-[11px] font-mono text-emerald-400">
                  +${config.dailyProfitTargetUSD.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={config.dailyProfitTargetUSD}
                onChange={(e) => onChange({ dailyProfitTargetUSD: parseFloat(e.target.value) || 2.5 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Locks in daily gains, prevents overtrading</p>
            </div>
          </div>
        </div>

        {/* Panel 3: Timeframe & Scalping Strategy Signal */}
        <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Signal Engine & Timeframe
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              M1 & M5 Ready
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chart Timeframe
                </label>
                <div className="flex items-center gap-2">
                  {(['M1', 'M5'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => onChange({ timeframe: tf })}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold rounded-md border transition-all ${
                        config.timeframe === tf
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf} {tf === 'M1' ? '(1-Minute)' : '(5-Minute)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Symbol
                </label>
                <select
                  value={config.symbol}
                  onChange={(e) => onChange({ symbol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="EURUSD">EURUSD (Lowest Spread: 0.6 - 1.0 pips)</option>
                  <option value="GBPUSD">GBPUSD (High Scalp Volatility)</option>
                  <option value="USDJPY">USDJPY (Low Spread / Smooth Micro)</option>
                  <option value="XAUUSD">XAUUSD Gold (Cent Account Only)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Scalp Entry Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'fast_ema',
                    name: 'Fast EMA Micro-Trend (5/13 EMA)',
                    desc: 'Crossover momentum with 34 EMA filter',
                  },
                  {
                    id: 'rsi_burst',
                    name: 'RSI Hyper-Burst (Period 7)',
                    desc: 'Fast 25/75 oversold/overbought scalp impulses',
                  },
                  {
                    id: 'bollinger_bounce',
                    name: 'Bollinger Band Squeeze Reversal',
                    desc: 'Band rejection and mean-reversion spikes',
                  },
                  {
                    id: 'pinbar_scalp',
                    name: 'Candle Wick Rejection Sniper',
                    desc: '55% tail rejection instant market entries',
                  },
                ].map((strat) => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => onChange({ strategy: strat.id as StrategyType })}
                    className={`text-left p-2.5 rounded-md border text-xs transition-all ${
                      config.strategy === strat.id
                        ? 'bg-slate-950 border-cyan-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-slate-200 mb-0.5">{strat.name}</div>
                    <div className="text-[10px] text-slate-500">{strat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 4: Indicator Parameter Fine-Tuning */}
        <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Indicator Fine-Tuning
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Live MQL5 Sync
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fast EMA Period
              </label>
              <input
                type="number"
                min="3"
                max="20"
                value={config.emaFastPeriod}
                onChange={(e) => onChange({ emaFastPeriod: parseInt(e.target.value, 10) || 5 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Slow EMA Period
              </label>
              <input
                type="number"
                min="8"
                max="50"
                value={config.emaSlowPeriod}
                onChange={(e) => onChange({ emaSlowPeriod: parseInt(e.target.value, 10) || 13 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Trend Filter EMA
              </label>
              <input
                type="number"
                min="20"
                max="100"
                value={config.emaTrendPeriod}
                onChange={(e) => onChange({ emaTrendPeriod: parseInt(e.target.value, 10) || 34 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RSI Period
              </label>
              <input
                type="number"
                min="3"
                max="14"
                value={config.rsiPeriod}
                onChange={(e) => onChange({ rsiPeriod: parseInt(e.target.value, 10) || 7 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RSI Overbought
              </label>
              <input
                type="number"
                min="65"
                max="85"
                value={config.rsiOverbought}
                onChange={(e) => onChange({ rsiOverbought: parseInt(e.target.value, 10) || 75 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RSI Oversold
              </label>
              <input
                type="number"
                min="15"
                max="35"
                value={config.rsiOversold}
                onChange={(e) => onChange({ rsiOversold: parseInt(e.target.value, 10) || 25 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Bollinger Bands: Period {config.bbPeriod} · Dev {config.bbDeviation}</span>
            <span className="text-cyan-400 font-mono">Magic #: {config.magicNumber}</span>
          </div>
        </div>
      </div>

      {/* 3-Hour Position Velocity & Frequency Analyzer */}
      <div className="p-4 bg-slate-900/80 border border-cyan-800/60 rounded-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              3-Hour Position Velocity & Frequency Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-300">
            Window: 180 Minutes (10,800 Seconds)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Because the EA targets rapid micro-gains ({ (config.takeProfitPoints / 10).toFixed(1) } pips) and enforces a {config.maxHoldTimeSeconds}s maximum hold timeout, trades close in <strong className="text-white">45 to 120 seconds</strong>. With a 1-position limit for $5 accounts, here is how many positions it opens in 3 hours:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
            <div className="text-[11px] text-slate-400">London / New York Peak</div>
            <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums mt-0.5">
              {config.timeframe === 'M1' ? '25 – 55 Trades' : '14 – 26 Trades'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 leading-snug">
              Fastest signal frequency (~1 trade every 3–7 mins). Spread is lowest (0.6–1.0 pip).
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
            <div className="text-[11px] text-slate-400">Normal Active Market</div>
            <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
              {config.timeframe === 'M1' ? '18 – 35 Trades' : '8 – 16 Trades'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 leading-snug">
              Steady momentum pulses. Average trade lifespan: ~65 seconds.
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
            <div className="text-[11px] text-slate-400">Asian / Quiet Session</div>
            <div className="text-lg font-bold font-mono text-amber-400 tabular-nums mt-0.5">
              {config.timeframe === 'M1' ? '8 – 18 Trades' : '4 – 8 Trades'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 leading-snug">
              Spread filter ({config.maxSpreadPoints} pts) automatically pauses during low liquidity.
            </div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            💡 <strong>Daily Profit Target Cap:</strong> If the EA achieves <span className="text-emerald-400 font-mono">+${config.dailyProfitTargetUSD.toFixed(2)}</span> ({((config.dailyProfitTargetUSD / config.accountBalance) * 100).toFixed(0)}% gain) before 3 hours finish, it automatically stops to preserve capital!
          </span>
          <span className="text-cyan-400 font-mono shrink-0">1 Trade Max Capping</span>
        </div>
      </div>
    </div>
  );
};
