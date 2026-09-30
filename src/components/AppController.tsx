import React, { useState, useEffect } from 'react';
import { EAConfig } from '../types/ea';
import { 
  Wifi, 
  WifiOff, 
  Radio, 
  Send, 
  ShieldAlert, 
  Pause, 
  Play, 
  Copy, 
  Check, 
  RefreshCw, 
  Smartphone, 
  Sliders, 
  Clock, 
  DollarSign, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  Apple
} from 'lucide-react';

interface AppControllerProps {
  config: EAConfig;
  onChange: (updated: Partial<EAConfig>) => void;
  onOpenIosModal?: () => void;
}

interface BridgeState {
  pairingKey: string;
  isPaused: boolean;
  emergencyCommand: string;
  lastPingTime: number;
  mt5Online: boolean;
  mt5Data: {
    accountNumber: string;
    balance: number;
    equity: number;
    freeMargin: number;
    spread: number;
    openTrades: number;
    symbol: string;
    terminalVersion: string;
  };
  config: any;
  configVersion: number;
  recentActivity: Array<{
    time: string;
    type: string;
    message: string;
  }>;
}

export const AppController: React.FC<AppControllerProps> = ({ config, onChange, onOpenIosModal }) => {
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState<boolean>(false);
  const [isCopiedKey, setIsCopiedKey] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Local draft of settings before pushing to MT5
  const [draftConfig, setDraftConfig] = useState<EAConfig>(config);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : config.cloudBridgeUrl;

  // Poll bridge status from server every 2 seconds
  const fetchBridgeState = async () => {
    try {
      const res = await fetch('/api/app/bridge-state');
      if (res.ok) {
        const data = await res.json();
        setBridgeState(data);
      }
    } catch (err) {
      console.error('Failed to fetch bridge state:', err);
    }
  };

  useEffect(() => {
    fetchBridgeState();
    const interval = setInterval(fetchBridgeState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update draft when external config changes
  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  // Push modified settings to MT5 Cloud Bridge
  const handlePushSettings = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/app/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: draftConfig }),
      });

      if (res.ok) {
        const data = await res.json();
        onChange(draftConfig);
        setSyncFeedback(`Settings successfully pushed to MT5 (v${data.version}). MT5 updates within 2 seconds.`);
        setTimeout(() => setSyncFeedback(null), 4000);
        fetchBridgeState();
      }
    } catch (err) {
      console.error('Failed to push settings:', err);
      setSyncFeedback('Error connecting to cloud bridge.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Send Emergency Commands (Close All or Pause/Resume)
  const handleSendCommand = async (command: 'CLOSE_ALL' | 'PAUSE_TRADING' | 'RESUME_TRADING') => {
    try {
      const res = await fetch('/api/app/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      if (res.ok) {
        fetchBridgeState();
      }
    } catch (err) {
      console.error('Failed to send command:', err);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'key') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setIsCopiedUrl(true);
        setTimeout(() => setIsCopiedUrl(false), 2000);
      } else {
        setIsCopiedKey(true);
        setTimeout(() => setIsCopiedKey(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const isOnline = bridgeState?.mt5Online || false;
  const mt5 = bridgeState?.mt5Data || {
    accountNumber: 'MT5-DEMO',
    balance: config.accountBalance,
    equity: config.accountBalance,
    freeMargin: config.accountBalance * 0.95,
    spread: 9,
    openTrades: 0,
    symbol: config.symbol,
    terminalVersion: 'Build 4150',
  };

  return (
    <div className="space-y-6">
      {/* Real-time Connection Status Header */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
              isOnline 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                : 'bg-amber-500/20 border-amber-500 text-amber-400'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4 animate-pulse" /> : <Radio className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {isOnline ? 'MT5 Terminal Connected' : 'Waiting for MT5 PC Connection...'}
                </h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isOnline ? 'LIVE 2S SYNC' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isOnline 
                  ? `Active on ${mt5.symbol} · Account #${mt5.accountNumber} · ${mt5.terminalVersion}` 
                  : 'Add URL to MT5 WebRequest options to link your mobile/web app.'}
              </p>
            </div>
          </div>

          {/* Emergency Kill & Pause Buttons */}
          <div className="flex items-center gap-2">
            {bridgeState?.isPaused ? (
              <button
                onClick={() => handleSendCommand('RESUME_TRADING')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Trading</span>
              </button>
            ) : (
              <button
                onClick={() => handleSendCommand('PAUSE_TRADING')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-800 rounded-md hover:bg-amber-900 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Trading</span>
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm('EMERGENCY: Close all open scalping positions on MT5 PC now?')) {
                  handleSendCommand('CLOSE_ALL');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-md hover:bg-rose-500 transition-colors shadow-sm shadow-rose-950"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Close All Positions</span>
            </button>
          </div>
        </div>

        {/* Live MT5 Telemetry Counters (Refreshes automatically from MT5) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80">
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">MT5 Balance</span>
            <span className="text-sm font-bold font-mono text-white tabular-nums">${mt5.balance.toFixed(2)}</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">MT5 Equity</span>
            <span className="text-sm font-bold font-mono text-cyan-400 tabular-nums">${mt5.equity.toFixed(2)}</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Free Margin</span>
            <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">${mt5.freeMargin.toFixed(2)}</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Live Spread</span>
            <span className="text-sm font-bold font-mono text-slate-200 tabular-nums">{(mt5.spread / 10).toFixed(1)} pips ({mt5.spread} pts)</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Open Trades</span>
            <span className="text-sm font-bold font-mono text-amber-400 tabular-nums">{mt5.openTrades} active</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">App Status</span>
            <span className={`text-xs font-bold font-mono ${bridgeState?.isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
              {bridgeState?.isPaused ? 'PAUSED' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* iOS App Installation Banner */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-800/60 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
            <Apple className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Install on iPhone & Apple Devices</span>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-700">.IPA Available</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Download the <strong>.IPA package</strong> for Sideloadly / AltStore, or install in 1-tap via Safari Home Screen.
            </p>
          </div>
        </div>

        {onOpenIosModal && (
          <button
            onClick={onOpenIosModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-md transition-colors shadow-sm"
          >
            <Apple className="w-3.5 h-3.5 fill-current" />
            <span>Open iPhone / .IPA Hub</span>
          </button>
        )}
      </div>

      {/* Pairing & Setup Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Pairing Credentials for MT5 PC
            </h3>
          </div>
          <span className="text-slate-400 text-[11px]">
            In MT5: Tools &rarr; Options &rarr; Expert Advisors &rarr; "Allow WebRequest"
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">1. MT5 Whitelist URL (Copy into MT5 Options)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={appOrigin}
                className="flex-1 bg-slate-950 border border-slate-700 rounded py-1 px-2.5 text-xs font-mono text-cyan-300 select-all"
              />
              <button
                onClick={() => copyToClipboard(appOrigin, 'url')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
              >
                {isCopiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedUrl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">2. Secret Pairing Token (Set in EA inputs)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={config.pairingKey}
                className="flex-1 bg-slate-950 border border-slate-700 rounded py-1 px-2.5 text-xs font-mono text-amber-300 font-bold select-all"
              />
              <button
                onClick={() => copyToClipboard(config.pairingKey, 'key')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
              >
                {isCopiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Remote Settings Tuner */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Modify EA Settings Remotely
              </h3>
              <p className="text-[11px] text-slate-400">
                Adjust parameters below and tap "Push Changes to MT5" to update the running EA instantly.
              </p>
            </div>
          </div>

          <button
            onClick={handlePushSettings}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-md transition-all shadow-md shadow-cyan-950"
          >
            {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isSyncing ? 'Syncing...' : 'Push Changes to MT5'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Remote Settings Sliders & Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Target Take Profit */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Take Profit (Points)</span>
              <span className="text-cyan-400 font-mono font-bold">{(draftConfig.takeProfitPoints / 10).toFixed(1)} pips ({draftConfig.takeProfitPoints} pts)</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              value={draftConfig.takeProfitPoints}
              onChange={(e) => setDraftConfig({ ...draftConfig, takeProfitPoints: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Stop Loss */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Stop Loss (Points)</span>
              <span className="text-rose-400 font-mono font-bold">{(draftConfig.stopLossPoints / 10).toFixed(1)} pips ({draftConfig.stopLossPoints} pts)</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              step="1"
              value={draftConfig.stopLossPoints}
              onChange={(e) => setDraftConfig({ ...draftConfig, stopLossPoints: parseInt(e.target.value, 10) })}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Breakeven Trigger */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Breakeven Trigger</span>
              <span className="text-emerald-400 font-mono font-bold">+{(draftConfig.breakEvenTriggerPoints / 10).toFixed(1)} pips</span>
            </div>
            <input
              type="range"
              min="10"
              max="30"
              step="1"
              value={draftConfig.breakEvenTriggerPoints}
              onChange={(e) => setDraftConfig({ ...draftConfig, breakEvenTriggerPoints: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-400"
            />
          </div>

          {/* Stale Timeout */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Stale Trade Timeout</span>
              <span className="text-amber-400 font-mono font-bold">{draftConfig.maxHoldTimeSeconds}s</span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="10"
              value={draftConfig.maxHoldTimeSeconds}
              onChange={(e) => setDraftConfig({ ...draftConfig, maxHoldTimeSeconds: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Max Spread Filter */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Max Allowed Spread</span>
              <span className="text-slate-200 font-mono font-bold">{(draftConfig.maxSpreadPoints / 10).toFixed(1)} pips ({draftConfig.maxSpreadPoints} pts)</span>
            </div>
            <input
              type="range"
              min="8"
              max="25"
              step="1"
              value={draftConfig.maxSpreadPoints}
              onChange={(e) => setDraftConfig({ ...draftConfig, maxSpreadPoints: parseInt(e.target.value, 10) })}
              className="w-full accent-slate-300"
            />
          </div>

          {/* Base Lot Size */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Base Lot Size</span>
              <span className="text-cyan-400 font-mono font-bold">{draftConfig.lotSize.toFixed(2)} Lot</span>
            </div>
            <select
              value={draftConfig.lotSize}
              onChange={(e) => setDraftConfig({ ...draftConfig, lotSize: parseFloat(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-white"
            >
              <option value={0.01}>0.01 (Strict $5-$10 Safety)</option>
              <option value={0.02}>0.02 ($20+ Capital)</option>
              <option value={0.03}>0.03 ($35+ Capital)</option>
            </select>
          </div>

          {/* Strategy Selector */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5 md:col-span-2 lg:col-span-3">
            <span className="font-medium text-slate-300 block">Switch Scalping Signal Engine</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'fast_ema', label: 'Fast EMA (5/13)' },
                { id: 'rsi_burst', label: 'RSI Hyper-Burst (7)' },
                { id: 'bollinger_bounce', label: 'Bollinger Bounce (20)' },
                { id: 'pinbar_scalp', label: 'Wick Rejection Sniper' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDraftConfig({ ...draftConfig, strategy: s.id as any })}
                  className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors ${
                    draftConfig.strategy === s.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modules Remote Toggles */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Remote Module Overrides
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDraftConfig({ ...draftConfig, useSessionFilter: !draftConfig.useSessionFilter })}
              className={`p-2 rounded border text-left transition-colors ${
                draftConfig.useSessionFilter ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Session (08-20h): {draftConfig.useSessionFilter ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setDraftConfig({ ...draftConfig, useLossCooldown: !draftConfig.useLossCooldown })}
              className={`p-2 rounded border text-left transition-colors ${
                draftConfig.useLossCooldown ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Loss Cooldown: {draftConfig.useLossCooldown ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setDraftConfig({ ...draftConfig, useAutoCompounding: !draftConfig.useAutoCompounding })}
              className={`p-2 rounded border text-left transition-colors ${
                draftConfig.useAutoCompounding ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Auto-Compound: {draftConfig.useAutoCompounding ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setDraftConfig({ ...draftConfig, useAtrDynamicScaling: !draftConfig.useAtrDynamicScaling })}
              className={`p-2 rounded border text-left transition-colors ${
                draftConfig.useAtrDynamicScaling ? 'bg-blue-950/40 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              ATR Adaptive: {draftConfig.useAtrDynamicScaling ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Bridge Activity Logs */}
      {bridgeState && bridgeState.recentActivity.length > 0 && (
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Cloud Bridge Event Ledger
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Real-time sync stream</span>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[11px] pr-1">
            {bridgeState.recentActivity.map((act, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800/80">
                <span className="text-slate-300">{act.message}</span>
                <span className="text-slate-500 text-[10px] shrink-0 ml-2">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
