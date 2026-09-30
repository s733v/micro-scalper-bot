import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Info, ExternalLink } from 'lucide-react';

export const RiskCalculator: React.FC = () => {
  const [balance, setBalance] = useState<number>(5.0);
  const [leverage, setLeverage] = useState<number>(500);
  const [lotSize, setLotSize] = useState<number>(0.01);
  const [pairPrice, setPairPrice] = useState<number>(1.0850);
  const [stopLossPips, setStopLossPips] = useState<number>(3.5);
  const [accountMode, setAccountMode] = useState<'standard' | 'cent'>('standard');

  // Math Calculations
  // 1 standard lot = 100,000 units. 0.01 lot = 1,000 units.
  const contractUnits = 100000 * lotSize;
  const notionalUSD = contractUnits * pairPrice;
  const marginRequired = notionalUSD / leverage;
  const freeMargin = Math.max(0, balance - marginRequired);
  const marginLevelPercent = marginRequired > 0 ? (balance / marginRequired) * 100 : 0;
  
  // Pip Value: For EURUSD 0.01 lot, 1 pip = $0.10
  const pipValueUSD = 0.10 * (lotSize / 0.01);
  const lossAtSL = stopLossPips * pipValueUSD;
  const riskOfAccountPercent = (lossAtSL / balance) * 100;

  // Pips to 50% Margin Stop-Out
  const stopOutEquity = marginRequired * 0.5;
  const maxLossBeforeStopOut = Math.max(0, balance - stopOutEquity);
  const pipsToStopOut = pipValueUSD > 0 ? maxLossBeforeStopOut / pipValueUSD : 0;

  const canOpenTrade = balance > marginRequired;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
        <h2 className="text-sm font-semibold tracking-tight text-white mb-1">
          $5.00 to $10.00 Micro Account Mathematics & Margin Engine
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Why 95% of retail traders blow $5 accounts in 10 minutes, and how the MicroScalper EA algorithm protects tiny capital using ultra-high leverage, 1-trade capping, and immediate breakeven locks.
        </p>
      </div>

      {/* Interactive Margin Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Controls */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
            Simulate Your Parameters
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Account Capital
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5.0, 10.0, 25.0].map((b) => (
                <button
                  key={b}
                  onClick={() => setBalance(b)}
                  className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                    balance === b
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ${b.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Broker Leverage
            </label>
            <select
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            >
              <option value={100}>1:100 (Low - Needs $10.85 margin)</option>
              <option value={200}>1:200 (Medium - Needs $5.43 margin)</option>
              <option value={500}>1:500 (Ideal for $5 - Needs $2.17 margin)</option>
              <option value={1000}>1:1000 (Very High - Needs $1.08 margin)</option>
              <option value={2000}>1:2000 (Ultra High - Needs $0.54 margin)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Stop Loss (Pips)
            </label>
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="15.0"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 3.5)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">Recommended: 3.0 to 4.5 pips</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Account Currency Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAccountMode('standard')}
                className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                  accountMode === 'standard'
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Standard USD
              </button>
              <button
                onClick={() => setAccountMode('cent')}
                className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                  accountMode === 'cent'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Cent USC (500¢)
              </button>
            </div>
          </div>
        </div>

        {/* Live Calculation Outcomes */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-4 lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
            Safety & Margin Verification Output
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[11px] text-slate-400">Margin Required</div>
              <div className="text-sm font-semibold font-mono text-white tabular-nums mt-0.5">
                ${marginRequired.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">for 0.01 lot EURUSD</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[11px] text-slate-400">Free Margin Left</div>
              <div className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${canOpenTrade ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${freeMargin.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">{canOpenTrade ? 'Trade Executable' : 'Order Rejected'}</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[11px] text-slate-400">Risk at Stop Loss</div>
              <div className="text-sm font-semibold font-mono text-amber-400 tabular-nums mt-0.5">
                ${lossAtSL.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 tabular-nums">{riskOfAccountPercent.toFixed(1)}% of balance</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[11px] text-slate-400">Pips to Stop-Out</div>
              <div className="text-sm font-semibold font-mono text-cyan-400 tabular-nums mt-0.5">
                {pipsToStopOut.toFixed(1)} pips
              </div>
              <div className="text-[10px] text-slate-500">at 50% margin call</div>
            </div>
          </div>

          {/* Critical Risk Verdict Box */}
          <div className={`p-3.5 rounded-md border text-xs leading-relaxed ${
            !canOpenTrade
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              : leverage < 500
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
          }`}>
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              {!canOpenTrade ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Trade Execution Blocked: Insufficient Capital for 1:{leverage}</span>
                </>
              ) : leverage < 500 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Sub-optimal Leverage: Free margin is tight (${freeMargin.toFixed(2)})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Optimal Micro-Scalping Configuration</span>
                </>
              )}
            </div>
            <div>
              {!canOpenTrade ? (
                <span>At 1:{leverage} leverage, a $5.00 account cannot open a 0.01 lot trade because the broker requires ${marginRequired.toFixed(2)} margin. Increase leverage to 1:500 or switch to a Cent account.</span>
              ) : leverage < 500 ? (
                <span>You have only ${freeMargin.toFixed(2)} free margin buffer. An adverse movement of {pipsToStopOut.toFixed(0)} pips will trigger a broker margin call. We strongly recommend setting broker leverage to 1:500 or 1:1000.</span>
              ) : (
                <span>At 1:{leverage} leverage, your margin requirement is only ${marginRequired.toFixed(2)}, leaving ${freeMargin.toFixed(2)} free cushion. With our 3.5-pip SL, you risk only ${lossAtSL.toFixed(2)} per scalp while targeting rapid 2.5-pip ($0.25) gains.</span>
              )}
            </div>
          </div>

          {/* Cent Account Callout */}
          <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/60 rounded-md text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>The Cent Account (USC) Advantage for $5 - $10 Capital</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If your broker offers a <strong>Cent Account (USC)</strong>, depositing $5.00 displays as <strong>500.00 USC</strong> in MT5.
              A 0.01 lot trade on EURUSD will only risk <strong>$0.001 per pip</strong> instead of $0.10.
              This allows you to scale from $5 to $50 with 100x greater mathematical safety.
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Brokers for $5-$10 Micro Scalping */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
          Recommended MT5 Brokers for $5 - $10 Accounts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs space-y-1.5">
            <div className="font-semibold text-white">Exness (Standard Cent / Micro)</div>
            <div className="text-[11px] text-slate-400">
              Min Deposit: <span className="text-emerald-400 font-mono">$1.00</span> · Leverage: <span className="text-cyan-400 font-mono">1:Unlimited</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Zero deposit fees, instant automatic withdrawals, and 0.6 pip EURUSD spreads. Top choice for $5 accounts.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs space-y-1.5">
            <div className="font-semibold text-white">RoboForex (Pro-Cent MT5)</div>
            <div className="text-[11px] text-slate-400">
              Min Deposit: <span className="text-emerald-400 font-mono">$10.00</span> · Leverage: <span className="text-cyan-400 font-mono">1:2000</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Native MetaTrader 5 Cent account with micro lots and free VPS for active algorithmic scalpers.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs space-y-1.5">
            <div className="font-semibold text-white">JustMarkets (Standard Cent)</div>
            <div className="text-[11px] text-slate-400">
              Min Deposit: <span className="text-emerald-400 font-mono">$1.00</span> · Leverage: <span className="text-cyan-400 font-mono">1:3000</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              High leverage up to 1:3000 reduces 0.01 lot margin to just pennies, ideal for rapid testing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
