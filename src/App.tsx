import React, { useState } from 'react';
import { EAConfig } from './types/ea';
import { DEFAULT_EA_CONFIG, STRATEGY_PRESETS } from './utils/presets';
import { generateMQL5Code } from './utils/mql5Generator';
import { TopNav } from './components/TopNav';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveSimulator } from './components/LiveSimulator';
import { AdvancedAdditions } from './components/AdvancedAdditions';
import { AppController } from './components/AppController';
import { IOSInstallModal } from './components/IOSInstallModal';
import { CodeViewer } from './components/CodeViewer';
import { RiskCalculator } from './components/RiskCalculator';
import { InstallGuide } from './components/InstallGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('workstation');
  const [config, setConfig] = useState<EAConfig>(DEFAULT_EA_CONFIG);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_5dollar_m1');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isIosModalOpen, setIsIosModalOpen] = useState<boolean>(false);

  const handleUpdateConfig = (updated: Partial<EAConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
    // If customized, clear preset selection
    setSelectedPresetId('custom');
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setConfig((prev) => ({
      ...prev,
      accountBalance: preset.targetAccount,
      timeframe: preset.timeframe,
      strategy: preset.strategy,
      takeProfitPoints: Math.round(preset.tpPips * 10),
      stopLossPoints: Math.round(preset.slPips * 10),
      breakEvenTriggerPoints: Math.round(preset.bePips * 10),
      maxHoldTimeSeconds: preset.maxHoldSeconds,
      leverage: preset.leverage,
      accountType: preset.id.includes('cent') ? 'cent' : 'standard',
    }));
  };

  const handleDownloadMQ5 = () => {
    const code = generateMQL5Code(config);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.eaName}.mq5`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async () => {
    try {
      const code = generateMQL5Code(config);
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar following the Top Bar Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownload={handleDownloadMQ5}
        onCopy={handleCopyCode}
        isCopied={isCopied}
        onOpenIosModal={() => setIsIosModalOpen(true)}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Kicker & Mode Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">MT5 PC Scalper</span>
            <span aria-hidden="true">·</span>
            <span>Target Balance: <strong className="text-cyan-400 font-mono">${config.accountBalance.toFixed(2)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Timeframe: <strong className="text-white font-mono">{config.timeframe}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Leverage: <strong className="text-white font-mono">1:{config.leverage}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Micro Lot: <strong className="text-emerald-400 font-mono">{config.lotSize}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('workstation')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'workstation'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EA Configurator
            </button>
            <button
              onClick={() => setActiveTab('remote')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'remote'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/50 shadow-sm'
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>App Controller</span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Simulator
            </button>
            <button
              onClick={() => setActiveTab('additions')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'additions'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Additions & Modules
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'code'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Source .mq5
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'risk'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              $5-$10 Risk Math
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MT5 PC Guide
            </button>
          </div>
        </div>

        {/* Tab Viewport */}
        {activeTab === 'workstation' && (
          <ConfigPanel
            config={config}
            onChange={handleUpdateConfig}
            onApplyPreset={handleApplyPreset}
            selectedPresetId={selectedPresetId}
          />
        )}

        {activeTab === 'remote' && (
          <AppController
            config={config}
            onChange={handleUpdateConfig}
            onOpenIosModal={() => setIsIosModalOpen(true)}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulator
            config={config}
          />
        )}

        {activeTab === 'additions' && (
          <AdvancedAdditions
            config={config}
            onChange={handleUpdateConfig}
          />
        )}

        {activeTab === 'code' && (
          <CodeViewer
            config={config}
            onDownload={handleDownloadMQ5}
            onCopy={handleCopyCode}
            isCopied={isCopied}
          />
        )}

        {activeTab === 'risk' && (
          <RiskCalculator />
        )}

        {activeTab === 'guide' && (
          <InstallGuide
            onDownload={handleDownloadMQ5}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MicroScalper MT5 Algorithm Systems · Engineered for MetaTrader 5 (Windows PC)</span>
          <span className="font-mono text-[11px] text-slate-500">MQL5 Build 3800+ · Standard 0.01 Micro-Lot Engine</span>
        </div>
      </footer>
      {/* iOS iPhone / .IPA Installation Modal */}
      <IOSInstallModal
        config={config}
        isOpen={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
      />
    </div>
  );
}
