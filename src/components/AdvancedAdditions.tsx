import React from 'react';
import { EAConfig } from '../types/ea';
import { 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  Bell, 
  CalendarOff, 
  Zap, 
  AlertOctagon,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface AdvancedAdditionsProps {
  config: EAConfig;
  onChange: (updated: Partial<EAConfig>) => void;
}

export const AdvancedAdditions: React.FC<AdvancedAdditionsProps> = ({ config, onChange }) => {
  const allEnabled = 
    config.useSessionFilter &&
    config.useLossCooldown &&
    config.useAutoCompounding &&
    config.useFridayClose &&
    config.useTickVelocityFilter &&
    config.useMobileAlerts &&
    config.useAtrDynamicScaling;

  const handleEnableAll = () => {
    onChange({
      useSessionFilter: true,
      useLossCooldown: true,
      useAutoCompounding: true,
      useFridayClose: true,
      useTickVelocityFilter: true,
      useMobileAlerts: true,
      useAtrDynamicScaling: true,
      startHour: 8,
      endHour: 20,
      compoundBalanceStepUSD: 15.0,
      maxConsecutiveLosses: 2,
      cooldownMinutes: 30,
      fridayCloseHour: 20,
      atrPeriod: 14,
      atrMultiplierTP: 1.2,
      atrMultiplierSL: 1.5,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-tight text-white">
              7 Advanced Institutional Scalping Modules
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All 7 modules are compiled into your MQL5 source code. You can toggle each one individually or run all together.
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnableAll}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all shadow-sm ${
            allEnabled
              ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
              : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-950'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{allEnabled ? 'ALL 7 MODULES ACTIVE' : 'ENABLE ALL 7 MODULES NOW'}</span>
        </button>
      </div>

      {/* Grid of 7 Advanced Feature Cards with Direct Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feature 1: Session & Night Rollover Filter */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useSessionFilter 
            ? 'bg-slate-900/90 border-cyan-500/80 shadow-sm shadow-cyan-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                1. Trading Session & Rollover Filter
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useSessionFilter: !config.useSessionFilter })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useSessionFilter
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useSessionFilter ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-200">Why it saves $5 accounts:</strong> Between 21:00 and 23:00 GMT (NY close/rollover), broker spreads surge from 0.8 pips to 5–8 pips. This filter blocks trades during rollover hours.
          </p>

          {config.useSessionFilter && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start Hour (Server Time)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.startHour}
                  onChange={(e) => onChange({ startHour: parseInt(e.target.value, 10) || 8 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500">e.g. 08:00 (London open)</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End Hour (Server Time)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.endHour}
                  onChange={(e) => onChange({ endHour: parseInt(e.target.value, 10) || 20 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500">e.g. 20:00 (Pre-rollover)</span>
              </div>
            </div>
          )}
        </div>

        {/* Feature 2: Consecutive Loss Cooldown Guard */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useLossCooldown 
            ? 'bg-slate-900/90 border-amber-500/80 shadow-sm shadow-amber-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                2. Anti-Revenge Loss Cooldown Guard
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useLossCooldown: !config.useLossCooldown })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useLossCooldown
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useLossCooldown ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-200">Why it saves $5 accounts:</strong> When unexpected high-impact news causes whipsaw chop, 2 consecutive losses can wipe $0.70. This automatically pauses trading for 30 minutes to let the market calm down.
          </p>

          {config.useLossCooldown && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Max Consecutive Losses</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={config.maxConsecutiveLosses}
                  onChange={(e) => onChange({ maxConsecutiveLosses: parseInt(e.target.value, 10) || 2 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500">Triggers pause after 2 losses</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cooldown Duration</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  step="5"
                  value={config.cooldownMinutes}
                  onChange={(e) => onChange({ cooldownMinutes: parseInt(e.target.value, 10) || 30 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500">Minutes before re-arming</span>
              </div>
            </div>
          )}
        </div>

        {/* Feature 3: Dynamic Balance Auto-Compounding */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useAutoCompounding 
            ? 'bg-slate-900/90 border-emerald-500/80 shadow-sm shadow-emerald-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                3. Capital Growth Auto-Compounding
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useAutoCompounding: !config.useAutoCompounding })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useAutoCompounding
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useAutoCompounding ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-200">How it works:</strong> Starts at 0.01 lot on $5.00. As account equity grows past $15.00, it automatically scales to 0.02 lot, and at $30.00 to 0.03 lot (capped at 0.05 lot max).
          </p>

          {config.useAutoCompounding && (
            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <label className="block text-[11px] text-slate-400 mb-1">Balance Increment per 0.01 Lot ($USD)</label>
              <input
                type="number"
                min="10"
                max="50"
                step="5"
                value={config.compoundBalanceStepUSD}
                onChange={(e) => onChange({ compoundBalanceStepUSD: parseFloat(e.target.value) || 15.0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                At $5: 0.01 lot · At $20: 0.02 lot · At $35: 0.03 lot
              </span>
            </div>
          )}
        </div>

        {/* Feature 4: Friday Close Weekend Protection */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useFridayClose 
            ? 'bg-slate-900/90 border-blue-500/80 shadow-sm shadow-blue-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                4. Friday Close & Weekend Protection
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useFridayClose: !config.useFridayClose })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useFridayClose
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useFridayClose ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-200">Zero Weekend Risk:</strong> Over weekends, international news can trigger 30–100 pip price gaps on Monday open. This closes any open scalp on Friday at 20:00 and goes flat.
          </p>

          {config.useFridayClose && (
            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <label className="block text-[11px] text-slate-400 mb-1">Friday Liquidation Hour (Server Time)</label>
              <input
                type="number"
                min="16"
                max="23"
                value={config.fridayCloseHour}
                onChange={(e) => onChange({ fridayCloseHour: parseInt(e.target.value, 10) || 20 })}
                className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Closes all open trades & pauses until Monday 08:00</span>
            </div>
          )}
        </div>

        {/* Feature 5: Tick Velocity Impulse Filter */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useTickVelocityFilter 
            ? 'bg-slate-900/90 border-cyan-500/80 shadow-sm shadow-cyan-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                5. Tick Velocity Momentum Filter
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useTickVelocityFilter: !config.useTickVelocityFilter })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useTickVelocityFilter
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useTickVelocityFilter ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Institutional Speed Check:</strong> Analyzes the incoming tick frequency. It only triggers entry if at least 5 ticks occurred within the last 4 seconds, ensuring active market liquidity.
          </p>
        </div>

        {/* Feature 6: Push Notifications to Phone App */}
        <div className={`p-4 rounded-lg border transition-all ${
          config.useMobileAlerts 
            ? 'bg-slate-900/90 border-purple-500/80 shadow-sm shadow-purple-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                6. MT5 Phone Push Notifications
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useMobileAlerts: !config.useMobileAlerts })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useMobileAlerts
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useMobileAlerts ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Real-Time Phone Alerts:</strong> Calls native <code>SendNotification()</code> to alert your MT5 iOS/Android app when a trade opens, when Breakeven is locked, or when the Daily Profit Goal is achieved.
          </p>
        </div>

        {/* Feature 7: ATR Dynamic Volatility Scaler */}
        <div className={`p-4 rounded-lg border md:col-span-2 transition-all ${
          config.useAtrDynamicScaling 
            ? 'bg-slate-900/90 border-cyan-500/80 shadow-sm shadow-cyan-950/40' 
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                7. ATR Dynamic Volatility TP/SL Scaler
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onChange({ useAtrDynamicScaling: !config.useAtrDynamicScaling })}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                config.useAtrDynamicScaling
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {config.useAtrDynamicScaling ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-200">Market-Adaptive Pip Targets:</strong> Replaces fixed targets with dynamic volatility math. When ATR expands during explosive market breakouts, Take Profit automatically stretches to capture up to 4.5–5.5 pips. During quiet micro-ranging, it tightens to 2.0 pips for fast, reliable exits.
          </p>

          {config.useAtrDynamicScaling && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ATR Period</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={config.atrPeriod}
                  onChange={(e) => onChange({ atrPeriod: parseInt(e.target.value, 10) || 14 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500">Standard 14-period ATR</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">TP Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max="3.0"
                  value={config.atrMultiplierTP}
                  onChange={(e) => onChange({ atrMultiplierTP: parseFloat(e.target.value) || 1.2 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500">1.2x ATR for fast micro-takes</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SL Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="3.0"
                  value={config.atrMultiplierSL}
                  onChange={(e) => onChange({ atrMultiplierSL: parseFloat(e.target.value) || 1.5 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500">1.5x ATR protection buffer</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Ideas & Strategies Checklist */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
          More Pro Scalping Features You Can Layer In
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>ATR Dynamic Pip Scaler</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Automatically stretches TP from 2.5 to 4.5 pips when ATR expands during high market volatility.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Currency Micro Basket</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Running the EA on both EURUSD and USDJPY with shared global risk limits so it trades whichever pair is cleaner.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Ultra-Low Latency VPS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Running MT5 on a London/New York VPS with 1ms broker ping for zero-delay order execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
