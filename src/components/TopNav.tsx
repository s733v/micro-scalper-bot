import React from 'react';
import { Download, Copy, Check, Apple } from 'lucide-react';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDownload: () => void;
  onCopy: () => void;
  isCopied: boolean;
  onOpenIosModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onDownload,
  onCopy,
  isCopied,
  onOpenIosModal,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <a 
        href="#workstation" 
        onClick={(e) => { e.preventDefault(); setActiveTab('workstation'); }}
        className="text-base font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
      >
        MicroScalper MT5
      </a>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('workstation')}
          className={`transition-colors hover:text-slate-100 ${
            activeTab === 'workstation' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          EA Configurator
        </button>
        <button
          onClick={() => setActiveTab('remote')}
          className={`flex items-center gap-1.5 transition-colors hover:text-slate-100 ${
            activeTab === 'remote' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>App Controller</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`transition-colors hover:text-slate-100 ${
            activeTab === 'simulator' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Live Simulator
        </button>
        <button
          onClick={() => setActiveTab('additions')}
          className={`transition-colors hover:text-slate-100 ${
            activeTab === 'additions' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Additions & Modules
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`transition-colors hover:text-slate-100 ${
            activeTab === 'code' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Source .mq5
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`transition-colors hover:text-slate-100 ${
            activeTab === 'guide' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          MT5 PC Setup
        </button>
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenIosModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 border border-slate-700 hover:border-cyan-400 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
          title="Install on iPhone / Download .IPA"
        >
          <Apple className="w-3.5 h-3.5 text-cyan-400 fill-current" />
          <span className="hidden sm:inline">iPhone /</span>
          <span>.IPA</span>
        </button>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-md hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          title="Copy full MQL5 code to clipboard"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy .mq5</span>
            </>
          )}
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap shadow-sm shadow-cyan-950"
          title="Download ready-to-compile .mq5 file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download EA</span>
        </button>
      </div>
    </header>
  );
};
