import React, { useState } from 'react';
import { EAConfig } from '../types/ea';
import { generateMQL5Code } from '../utils/mql5Generator';
import { Download, Copy, Check, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';

interface CodeViewerProps {
  config: EAConfig;
  onDownload: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  config,
  onDownload,
  onCopy,
  isCopied,
}) => {
  const mql5Code = generateMQL5Code(config);
  const lines = mql5Code.split('\n');

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2.5">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-sm font-semibold text-white">
              MicroScalper_MT5_SmallAcc.mq5
            </div>
            <div className="text-xs text-slate-400">
              Ready for MetaEditor 5 · Zero compilation errors · Native MQL5 syntax
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Code</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Full Source</span>
              </>
            )}
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .mq5 File</span>
          </button>
        </div>
      </div>

      {/* Code Architecture Validation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-md flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200">Standard MQL5 Libraries</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Uses official <code>Trade\Trade.mqh</code> and <code>PositionInfo.mqh</code> with zero external DLLs.
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-md flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200">1-Second Timer Architecture</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Uses <code>EventSetTimer(1)</code> for lightning-fast trailing stop & breakeven updates.
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-md flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200">Micro Account Capital Guard</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Enforces minimum balance floor (${config.minFreeEquityUSD.toFixed(2)}) & max {config.maxOpenTrades} open trade.
            </div>
          </div>
        </div>
      </div>

      {/* Code Box with Line Numbers */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/50 text-xs font-mono text-slate-400">
          <span>{lines.length} lines · UTF-8 MQL5 Script</span>
          <span>Target: MetaTrader 5 Build 3800+</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] p-4 text-xs font-mono leading-relaxed select-all">
          <pre className="text-slate-300">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-slate-900/60 py-0.5">
                <span className="w-12 shrink-0 select-none text-right pr-4 text-slate-600 font-mono">
                  {idx + 1}
                </span>
                <span className="whitespace-pre">
                  {line}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};
