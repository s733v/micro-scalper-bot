import React from 'react';
import { Download, Monitor, CheckCircle, ArrowRight, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

interface InstallGuideProps {
  onDownload: () => void;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({ onDownload }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white mb-1">
            MetaTrader 5 (PC) Step-by-Step Installation Manual
          </h2>
          <p className="text-xs text-slate-400">
            How to compile and deploy the MicroScalper EA on MetaTrader 5 PC for $5 to $10 accounts.
          </p>
        </div>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download .mq5 Source</span>
        </button>
      </div>

      {/* 5-Step Process Cards */}
      <div className="space-y-3.5">
        {/* Step 1 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0">
            01
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-semibold text-white">Download & Locate MT5 Data Folder</div>
            <p className="text-slate-400 leading-relaxed">
              Download <code>MicroScalper_MT5_SmallAcc.mq5</code>. Then launch MetaTrader 5 on your Windows PC.
              In the top menu, click <strong className="text-slate-200">File</strong> &rarr; <strong className="text-slate-200">Open Data Folder</strong>.
            </p>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] text-cyan-300">
              C:\Users\&lt;YourUser&gt;\AppData\Roaming\MetaQuotes\Terminal\&lt;InstanceID&gt;\MQL5\
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0">
            02
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-semibold text-white">Copy File to the Experts Directory</div>
            <p className="text-slate-400 leading-relaxed">
              Inside the Data Folder, double-click the <strong className="text-slate-200">MQL5</strong> folder, then open the <strong className="text-slate-200">Experts</strong> folder.
              Paste the downloaded <code>MicroScalper_MT5_SmallAcc.mq5</code> file directly into this folder.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0">
            03
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-semibold text-white">Compile in MetaEditor (Zero Errors)</div>
            <p className="text-slate-400 leading-relaxed">
              In MT5 PC, press <strong className="text-slate-200">F4</strong> (or click Tools &rarr; MetaQuotes Language Editor).
              In the left Navigator panel, expand <strong className="text-slate-200">Experts</strong> and double-click <code>MicroScalper_MT5_SmallAcc.mq5</code>.
              Press <strong className="text-cyan-400 font-mono">F7</strong> (Compile).
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Compilation result: 0 errors, 0 warnings &rarr; creates MicroScalper_MT5_SmallAcc.ex5</span>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0">
            04
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-semibold text-white">Enable Automated Trading Permissions</div>
            <p className="text-slate-400 leading-relaxed">
              In MT5 PC, open <strong className="text-slate-200">Tools</strong> &rarr; <strong className="text-slate-200">Options</strong> (Ctrl+O) &rarr; click the <strong className="text-slate-200">Expert Advisors</strong> tab:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1.5 pl-1">
              <li>Check <strong className="text-emerald-400">"Allow Algo Trading"</strong></li>
              <li>Check <strong className="text-cyan-400">"Allow WebRequest for listed URL"</strong> and add: <code className="text-cyan-300 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">https://ais-dev-isuwyocwptisbpji4w6xdf-881671125978.europe-west2.run.app</code> (or your custom domain) to enable live mobile/web app control.</li>
              <li>Ensure the main MT5 toolbar button <strong className="text-emerald-400 font-semibold">[Algo Trading]</strong> is toggled GREEN</li>
            </ul>
          </div>
        </div>

        {/* Step 5 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0">
            05
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-semibold text-white">Attach to M1 or M5 Chart</div>
            <p className="text-slate-400 leading-relaxed">
              Open a <strong className="text-slate-200">EURUSD M1</strong> or <strong className="text-slate-200">EURUSD M5</strong> chart.
              From MT5's Navigator window (Ctrl+N), drag <strong className="text-cyan-400">MicroScalper_MT5_SmallAcc</strong> onto the chart.
              In the Inputs tab, verify <code>InpLotSize = 0.01</code> and <code>InpTakeProfitPoints = 25</code>.
              Click <strong className="text-slate-200">OK</strong>.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
              The on-chart HUD will immediately display your account balance, free margin, spread, and active scanning state in the top-left corner.
            </div>
          </div>
        </div>
      </div>

      {/* Small Account Golden Rules */}
      <div className="p-4 bg-slate-900/70 border border-amber-800/60 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>Crucial Golden Rules for $5 to $10 Accounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-white">1. Trade Only Liquid Hours</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Run the EA during London (08:00–16:00 GMT) or New York (13:00–21:00 GMT) sessions when EURUSD spread is below 1.0 pip. Avoid rollover hours (21:00–23:00 GMT).
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-white">2. Never Exceed 0.01 Lot</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              On a $5.00 account, 0.01 lot is the absolute maximum safe size. Trading 0.02 or 0.05 will double margin requirements and cause rapid margin calls.
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-white">3. Avoid News Spikes</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Turn off Algo Trading 15 minutes before US CPI, NFP, or FOMC announcements, as slippage can bypass stop loss orders on micro accounts.
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-white">4. Compound Steadily</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Aim for $1.50 to $2.50 daily profit (+30% to +50%). Once your balance grows to $25.00, your margin buffer becomes 5x safer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
