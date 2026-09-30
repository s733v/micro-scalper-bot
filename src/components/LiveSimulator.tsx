import React, { useState, useEffect, useRef } from 'react';
import { Candle, EAConfig, SimulationStats, TradePosition } from '../types/ea';
import { MarketSimulator } from '../utils/marketSimulator';
import { Play, Pause, RotateCcw, FastForward, Activity, ShieldAlert, Clock, TrendingUp } from 'lucide-react';

interface LiveSimulatorProps {
  config: EAConfig;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ config }) => {
  const simulatorRef = useRef<MarketSimulator | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [candles, setCandles] = useState<Candle[]>([]);
  const [openPositions, setOpenPositions] = useState<TradePosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<TradePosition[]>([]);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(1.08500);
  const [currentSpread, setCurrentSpread] = useState<number>(10);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Responsive canvas size tracker
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = new MarketSimulator(config);
    updateState();
  }, [config.symbol, config.timeframe, config.strategy]);

  // Update config inside simulator when parameters change
  useEffect(() => {
    if (simulatorRef.current) {
      simulatorRef.current.updateConfig(config);
    }
  }, [config]);

  const updateState = () => {
    if (!simulatorRef.current) return;
    setCandles([...simulatorRef.current.getCandles()]);
    setOpenPositions([...simulatorRef.current.getOpenPositions()]);
    setClosedPositions([...simulatorRef.current.getClosedPositions()]);
    setStats({ ...simulatorRef.current.getStats() });
    setCurrentPrice(simulatorRef.current.getCurrentPrice());
    setCurrentSpread(simulatorRef.current.getCurrentSpread());
  };

  // Simulation tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.max(100, Math.floor(1000 / speed));
    const interval = setInterval(() => {
      if (simulatorRef.current) {
        simulatorRef.current.stepTick();
        updateState();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset(config.accountBalance);
      updateState();
    }
  };

  const handleStepOne = () => {
    if (simulatorRef.current) {
      simulatorRef.current.stepTick();
      updateState();
    }
  };

  const handleFastBatch = (ticks = 60) => {
    if (simulatorRef.current) {
      for (let i = 0; i < ticks; i++) {
        simulatorRef.current.stepTick();
      }
      updateState();
    }
  };

  // Render HTML5 Canvas Candlestick Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Calculate price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    // Add padding to bounds
    const padding = (maxPrice - minPrice) * 0.12 || 0.0003;
    minPrice -= padding;
    maxPrice += padding;
    const priceRange = maxPrice - minPrice;

    // Draw horizontal grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (height / gridLines) * i;
      const priceAtY = maxPrice - (i / gridLines) * priceRange;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 65, y);
      ctx.stroke();

      ctx.fillText(priceAtY.toFixed(5), width - 8, y + 3);
    }

    // Render Candlesticks
    const candleCount = candles.length;
    const candleWidth = Math.max(3, (width - 70) / candleCount - 2);
    const spacing = (width - 70) / candleCount;

    candles.forEach((c, index) => {
      const x = index * spacing + spacing / 2;
      const openY = height - ((c.open - minPrice) / priceRange) * height;
      const closeY = height - ((c.close - minPrice) / priceRange) * height;
      const highY = height - ((c.high - minPrice) / priceRange) * height;
      const lowY = height - ((c.low - minPrice) / priceRange) * height;

      const isBullish = c.close >= c.open;
      const color = isBullish ? '#10b981' : '#f43f5e';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw active positions lines (Entry, SL, TP, Breakeven)
    openPositions.forEach((pos) => {
      const entryY = height - ((pos.openPrice - minPrice) / priceRange) * height;

      // Entry line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = pos.type === 'BUY' ? '#38bdf8' : '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(width - 65, entryY);
      ctx.stroke();

      // Label
      ctx.fillStyle = pos.type === 'BUY' ? '#38bdf8' : '#f97316';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${pos.type} #${pos.ticket}`, width - 75, entryY - 4);

      // Stop Loss line
      if (pos.stopLoss > 0) {
        const slY = height - ((pos.stopLoss - minPrice) / priceRange) * height;
        ctx.strokeStyle = pos.breakEvenApplied ? '#3b82f6' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, slY);
        ctx.lineTo(width - 65, slY);
        ctx.stroke();
        ctx.fillText(pos.breakEvenApplied ? 'BE LOCK' : 'SL', width - 75, slY - 3);
      }

      // Take Profit line
      if (pos.takeProfit > 0) {
        const tpY = height - ((pos.takeProfit - minPrice) / priceRange) * height;
        ctx.strokeStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(0, tpY);
        ctx.lineTo(width - 65, tpY);
        ctx.stroke();
        ctx.fillText('TP', width - 75, tpY - 3);
      }
    });

    // Draw current price line
    ctx.setLineDash([]);
    const currentY = height - ((currentPrice - minPrice) / priceRange) * height;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width - 65, currentY);
    ctx.stroke();

    // Price tag pill on right axis
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(width - 62, currentY - 8, 60, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentPrice.toFixed(5), width - 32, currentY + 3);

  }, [candles, openPositions, currentPrice, canvasDimensions]);

  return (
    <div className="space-y-5">
      {/* Simulation Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Scalper</span>
              </>
            )}
          </button>

          <button
            onClick={handleStepOne}
            disabled={isPlaying}
            className="px-2.5 py-1.5 text-xs font-mono text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 disabled:opacity-40 transition-colors"
            title="Step 1 tick"
          >
            Step +1
          </button>

          <button
            onClick={() => handleFastBatch(60)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 rounded-md hover:bg-cyan-900/80 transition-colors"
            title="Fast forward 60 ticks"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>+60 Ticks</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-md hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset simulation to initial $5.00 capital"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 ml-2 p-0.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  speed === s ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Bid/Ask:</span>
            <span className="text-white font-semibold tabular-nums">{currentPrice.toFixed(5)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Spread:</span>
            <span className={`tabular-nums ${currentSpread <= config.maxSpreadPoints ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
              {(currentSpread / 10).toFixed(1)} pips ({currentSpread} pts)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Timeframe:</span>
            <span className="text-cyan-400 font-semibold">{config.timeframe}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Strictly Tabular Figures as per Design Constitution) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Balance</div>
            <div className="text-sm font-semibold font-mono text-white tabular-nums mt-0.5">
              ${stats.currentBalance.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Init: ${stats.startingBalance.toFixed(2)}</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Equity</div>
            <div className="text-sm font-semibold font-mono text-cyan-400 tabular-nums mt-0.5">
              ${stats.equity.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Free: ${stats.freeMargin.toFixed(2)}</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Net Profit</div>
            <div className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums">{stats.profitPercentage}%</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Win Rate</div>
            <div className="text-sm font-semibold font-mono text-emerald-400 tabular-nums mt-0.5">
              {stats.winRate}%
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums">{stats.winningTrades}W / {stats.losingTrades}L</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Closed Scalps</div>
            <div className="text-sm font-semibold font-mono text-white tabular-nums mt-0.5">
              {stats.totalTrades}
            </div>
            <div className="text-[10px] text-slate-500">PF: {stats.profitFactor}</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Avg Hold Time</div>
            <div className="text-sm font-semibold font-mono text-amber-400 tabular-nums mt-0.5">
              {stats.avgDurationSeconds}s
            </div>
            <div className="text-[10px] text-slate-500">Rapid micro exit</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Max Drawdown</div>
            <div className="text-sm font-semibold font-mono text-rose-400 tabular-nums mt-0.5">
              ${stats.maxDrawdownUSD.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums">{stats.maxDrawdownPercent}%</div>
          </div>

          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-400">Margin Used</div>
            <div className="text-sm font-semibold font-mono text-slate-300 tabular-nums mt-0.5">
              ${stats.marginUsed.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">1:{config.leverage} leverage</div>
          </div>
        </div>
      )}

      {/* Candlestick Canvas Chart */}
      <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <div className="absolute top-3 left-3 z-10 flex items-center gap-3 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="font-semibold text-white">{config.symbol}</span>
          <span className="text-slate-500">·</span>
          <span>{config.timeframe}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-400">{config.strategy.toUpperCase()}</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400">TP: {(config.takeProfitPoints / 10).toFixed(1)}p</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-400">BE: {(config.breakEvenTriggerPoints / 10).toFixed(1)}p</span>
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-80 block"
        />
      </div>

      {/* Active Position & Recent Closed Scalps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Open Positions */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Active Scalp Positions ({openPositions.length} / {config.maxOpenTrades})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              1-Second Breakeven Engine
            </span>
          </div>

          {openPositions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Scanning for rapid entry signal on {config.timeframe}...
            </div>
          ) : (
            <div className="space-y-2">
              {openPositions.map((pos) => (
                <div
                  key={pos.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${pos.type === 'BUY' ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {pos.type} {pos.lot} Lot
                      </span>
                      <span className="text-slate-400">#{pos.ticket}</span>
                    </div>
                    <div className={`font-bold tabular-nums ${pos.pnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.pnlUSD >= 0 ? '+' : ''}${pos.pnlUSD.toFixed(2)} ({pos.pnlPoints > 0 ? '+' : ''}{(pos.pnlPoints / 10).toFixed(1)} pips)
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <div>
                      <span className="text-slate-500">Entry: </span>
                      <span className="text-slate-200">{pos.openPrice.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">SL: </span>
                      <span className={pos.breakEvenApplied ? 'text-blue-400 font-semibold' : 'text-slate-200'}>
                        {pos.stopLoss > 0 ? pos.stopLoss.toFixed(5) : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">TP: </span>
                      <span className="text-emerald-400">{pos.takeProfit > 0 ? pos.takeProfit.toFixed(5) : 'None'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Duration: {pos.durationSeconds}s / {config.maxHoldTimeSeconds}s max</span>
                    {pos.breakEvenApplied ? (
                      <span className="text-blue-400 font-semibold">✓ Breakeven Locked</span>
                    ) : (
                      <span className="text-slate-400">Waiting for +{(config.breakEvenTriggerPoints / 10).toFixed(1)}p</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closed Scalps Ledger */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Recent Closed Scalps ({closedPositions.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Rapid Micro Gains
            </span>
          </div>

          {closedPositions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No closed trades yet. The EA will close positions rapidly via TP, BE, or Stale Timeout.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-64 space-y-1.5 pr-1">
              {closedPositions.slice(0, 15).map((pos) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-800/80 rounded text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${pos.type === 'BUY' ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {pos.type}
                    </span>
                    <span className="text-slate-400">#{pos.ticket}</span>
                    <span className="text-[10px] text-slate-500">({pos.durationSeconds}s)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">
                      {pos.closeReason === 'TAKE_PROFIT' && '🎯 Take Profit'}
                      {pos.closeReason === 'BREAK_EVEN' && '🛡️ Breakeven'}
                      {pos.closeReason === 'TIME_EXIT' && '⏱️ Fast Timeout'}
                      {pos.closeReason === 'STOP_LOSS' && '🛑 Stop Loss'}
                    </span>
                    <span className={`font-semibold tabular-nums ${pos.pnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.pnlUSD >= 0 ? '+' : ''}${pos.pnlUSD.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
