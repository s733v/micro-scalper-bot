import React, { useState } from 'react';
import { EAConfig } from '../types/ea';
import { generateIpaBlob, generateXcodeProjectBlob } from '../utils/iosPackageGenerator';
import { 
  Apple, 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  ExternalLink, 
  FileCode, 
  Layers, 
  X,
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface IOSInstallModalProps {
  config: EAConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ config, isOpen, onClose }) => {
  const [isGeneratingIpa, setIsGeneratingIpa] = useState<boolean>(false);
  const [isGeneratingXcode, setIsGeneratingXcode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ipa' | 'pwa' | 'xcode'>('ipa');

  if (!isOpen) return null;

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : config.cloudBridgeUrl;

  const handleDownloadIpa = async () => {
    setIsGeneratingIpa(true);
    try {
      const blob = await generateIpaBlob(config, appOrigin);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MicroScalperController.ipa`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate IPA:', err);
    } finally {
      setIsGeneratingIpa(false);
    }
  };

  const handleDownloadXcode = async () => {
    setIsGeneratingXcode(true);
    try {
      const blob = await generateXcodeProjectBlob(config, appOrigin);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MicroScalperController_iOS_Xcode.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Xcode project:', err);
    } finally {
      setIsGeneratingXcode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Apple className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>iOS iPhone Version & IPA Hub</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                  iOS 14.0+
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Install the MT5 Remote Controller directly on your iPhone.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ipa')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ipa'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>.IPA Sideload (Sideloadly / AltStore)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1-Tap Safari Home Screen (Official)</span>
          </button>

          <button
            onClick={() => setActiveTab('xcode')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'xcode'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Xcode Swift Project</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* TAB 1: IPA Sideload */}
          {activeTab === 'ipa' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-sm">Download MicroScalperController.ipa</div>
                  <p className="text-slate-400 text-[11px]">
                    Pre-packaged iOS Application Archive ready for signing & sideloading.
                  </p>
                </div>
                <button
                  onClick={handleDownloadIpa}
                  disabled={isGeneratingIpa}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg shadow-md transition-all shrink-0 font-mono"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingIpa ? 'Packaging IPA...' : 'Download .IPA File'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>How to Install this .IPA on iPhone in 2 Minutes (Free, No Paid Apple Dev Account):</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300 pl-1">
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <strong className="text-cyan-400 block mb-0.5">Method 1: Sideloadly (Recommended for Windows & Mac)</strong>
                    1. Download free <a href="https://sideloadly.io" target="_blank" rel="noreferrer" className="text-cyan-300 underline inline-flex items-center gap-0.5">Sideloadly <ExternalLink className="w-3 h-3" /></a> on PC or Mac.<br />
                    2. Connect your iPhone via USB cable.<br />
                    3. Drag <code>MicroScalperController.ipa</code> into Sideloadly.<br />
                    4. Enter your regular free Apple ID & click <strong>Start</strong>.<br />
                    5. On iPhone: open <strong>Settings &rarr; General &rarr; VPN & Device Management</strong> &rarr; tap <strong>Trust [Your Apple ID]</strong>. Done!
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <strong className="text-cyan-400 block mb-0.5">Method 2: AltStore / Scarlet / TrollStore</strong>
                    If you already have AltStore or Scarlet on your iPhone, open the app, tap the <strong>+</strong> button, select the downloaded <code>MicroScalperController.ipa</code>, and it will install wirelessly.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Safari 1-Tap Native Home Screen App */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-cyan-200 text-xs">
                💡 <strong>The Apple-Recommended Zero-Hassle Method:</strong> You do NOT need a PC, cables, or sideloading tools! iOS natively supports installing web applications directly onto your home screen with zero expiration.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                    1
                  </div>
                  <div className="font-semibold text-white">Open in Safari</div>
                  <p className="text-[11px] text-slate-400">
                    Open this app URL in <strong className="text-slate-200">Safari</strong> on your iPhone.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                    2
                  </div>
                  <div className="font-semibold text-white">Tap Share Button</div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    Tap the square <Share2 className="w-3.5 h-3.5 text-cyan-400 inline" /> icon at the bottom of Safari.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                    3
                  </div>
                  <div className="font-semibold text-white">Add to Home Screen</div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  The app will immediately install as an app icon on your iPhone home screen, running full-screen without Safari browser bars!
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Xcode Swift Project */}
          {activeTab === 'xcode' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-sm">Download Native Swift Xcode Project</div>
                  <p className="text-slate-400 text-[11px]">
                    Complete native iOS WebKit project containing <code>ViewController.swift</code>, <code>Info.plist</code>, and build scripts.
                  </p>
                </div>
                <button
                  onClick={handleDownloadXcode}
                  disabled={isGeneratingXcode}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg border border-slate-700 transition-all shrink-0 font-mono"
                >
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>{isGeneratingXcode ? 'Generating...' : 'Download .zip'}</span>
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-200">Included in the Xcode Archive:</div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><code>ViewController.swift</code>: Embedded WKWebView with background auto-reconnect and cookies enabled.</li>
                  <li><code>Info.plist</code>: Configured with <code>NSAppTransportSecurity</code> and Local Network entitlements.</li>
                  <li><code>README_BUILD_IPA.md</code>: Terminal instructions to compile with <code>xcodebuild</code> into an IPA.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connects directly to your MT5 PC EA via Cloud Bridge</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
