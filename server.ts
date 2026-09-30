import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Cloud Bridge State for MT5 EA Remote Control
interface EACloudBridge {
  pairingKey: string;
  isPaused: boolean;
  emergencyCommand: 'NONE' | 'CLOSE_ALL';
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
  config: {
    takeProfitPoints: number;
    stopLossPoints: number;
    breakEvenTriggerPoints: number;
    trailingStopPoints: number;
    maxHoldTimeSeconds: number;
    maxSpreadPoints: number;
    lotSize: number;
    strategy: string;
    useSessionFilter: boolean;
    startHour: number;
    endHour: number;
    useLossCooldown: boolean;
    maxConsecutiveLosses: number;
    cooldownMinutes: number;
    useAutoCompounding: boolean;
    compoundBalanceStepUSD: number;
    useFridayClose: boolean;
    fridayCloseHour: number;
    useAtrDynamicScaling: boolean;
  };
  configVersion: number;
  recentActivity: Array<{
    time: string;
    type: 'PING' | 'SETTING_UPDATE' | 'COMMAND' | 'TRADE_EVENT';
    message: string;
  }>;
}

const cloudBridge: EACloudBridge = {
  pairingKey: 'SCALP-778901',
  isPaused: false,
  emergencyCommand: 'NONE',
  lastPingTime: 0,
  mt5Online: false,
  mt5Data: {
    accountNumber: 'MT5-DEMO',
    balance: 5.0,
    equity: 5.0,
    freeMargin: 4.88,
    spread: 9,
    openTrades: 0,
    symbol: 'EURUSD',
    terminalVersion: 'Build 4150',
  },
  config: {
    takeProfitPoints: 25,
    stopLossPoints: 35,
    breakEvenTriggerPoints: 14,
    trailingStopPoints: 15,
    maxHoldTimeSeconds: 120,
    maxSpreadPoints: 12,
    lotSize: 0.01,
    strategy: 'fast_ema',
    useSessionFilter: true,
    startHour: 8,
    endHour: 20,
    useLossCooldown: true,
    maxConsecutiveLosses: 2,
    cooldownMinutes: 30,
    useAutoCompounding: true,
    compoundBalanceStepUSD: 15.0,
    useFridayClose: true,
    fridayCloseHour: 20,
    useAtrDynamicScaling: true,
  },
  configVersion: 1,
  recentActivity: [
    {
      time: new Date().toLocaleTimeString(),
      type: 'SETTING_UPDATE',
      message: 'Cloud bridge initialized with default micro-scalping profile',
    },
  ],
};

function addActivity(type: EACloudBridge['recentActivity'][0]['type'], message: string) {
  cloudBridge.recentActivity.unshift({
    time: new Date().toLocaleTimeString(),
    type,
    message,
  });
  if (cloudBridge.recentActivity.length > 30) {
    cloudBridge.recentActivity.pop();
  }
}

// -------------------------------------------------------------
// MT5 EA HTTP ENDPOINTS (Called by MetaTrader 5 via WebRequest)
// -------------------------------------------------------------

// Sync endpoint: MT5 polls this periodically (every 1-3 seconds)
app.get('/api/ea/sync', (req, res) => {
  const { key, balance, equity, margin, spread, trades, symbol, acc } = req.query;

  // Verify pairing key
  if (key && typeof key === 'string' && key !== cloudBridge.pairingKey) {
    // If not matching, notify
    res.status(403).json({ error: 'Invalid pairing key' });
    return;
  }

  // Update MT5 telemetry received in query params
  cloudBridge.lastPingTime = Date.now();
  cloudBridge.mt5Online = true;
  if (balance) cloudBridge.mt5Data.balance = parseFloat(balance as string) || cloudBridge.mt5Data.balance;
  if (equity) cloudBridge.mt5Data.equity = parseFloat(equity as string) || cloudBridge.mt5Data.equity;
  if (margin) cloudBridge.mt5Data.freeMargin = parseFloat(margin as string) || cloudBridge.mt5Data.freeMargin;
  if (spread) cloudBridge.mt5Data.spread = parseInt(spread as string, 10) || cloudBridge.mt5Data.spread;
  if (trades) cloudBridge.mt5Data.openTrades = parseInt(trades as string, 10) || 0;
  if (symbol) cloudBridge.mt5Data.symbol = (symbol as string).toUpperCase();
  if (acc) cloudBridge.mt5Data.accountNumber = acc as string;

  const currentCmd = cloudBridge.emergencyCommand;
  // If emergency command was CLOSE_ALL, reset it after dispatching to avoid loops
  if (cloudBridge.emergencyCommand === 'CLOSE_ALL') {
    cloudBridge.emergencyCommand = 'NONE';
  }

  res.json({
    status: 'ok',
    cmd: currentCmd,
    paused: cloudBridge.isPaused,
    v: cloudBridge.configVersion,
    tp: cloudBridge.config.takeProfitPoints,
    sl: cloudBridge.config.stopLossPoints,
    be: cloudBridge.config.breakEvenTriggerPoints,
    trail: cloudBridge.config.trailingStopPoints,
    hold: cloudBridge.config.maxHoldTimeSeconds,
    spread: cloudBridge.config.maxSpreadPoints,
    lot: cloudBridge.config.lotSize,
    strat: cloudBridge.config.strategy,
    sess: cloudBridge.config.useSessionFilter ? 1 : 0,
    sh: cloudBridge.config.startHour,
    eh: cloudBridge.config.endHour,
    cooldown: cloudBridge.config.useLossCooldown ? 1 : 0,
    compound: cloudBridge.config.useAutoCompounding ? 1 : 0,
    friday: cloudBridge.config.useFridayClose ? 1 : 0,
    atr: cloudBridge.config.useAtrDynamicScaling ? 1 : 0,
  });
});

// Telemetry heartbeat from MT5 with trade details
app.post('/api/ea/heartbeat', (req, res) => {
  const { key, telemetry, event } = req.body;
  if (key && key === cloudBridge.pairingKey) {
    cloudBridge.lastPingTime = Date.now();
    cloudBridge.mt5Online = true;
    if (telemetry) {
      cloudBridge.mt5Data = { ...cloudBridge.mt5Data, ...telemetry };
    }
    if (event) {
      addActivity('TRADE_EVENT', `MT5 Event: ${event}`);
    }
  }
  res.json({ ok: true });
});

// -------------------------------------------------------------
// APP CONTROLLER ENDPOINTS (Called by the Web/Mobile App Interface)
// -------------------------------------------------------------

// Get full bridge state for the App UI
app.get('/api/app/bridge-state', (req, res) => {
  const now = Date.now();
  // Mark offline if no ping in 12 seconds
  const isOnline = cloudBridge.lastPingTime > 0 && (now - cloudBridge.lastPingTime) < 12000;
  cloudBridge.mt5Online = isOnline;

  res.json({
    ...cloudBridge,
    mt5Online: isOnline,
    serverTime: new Date().toISOString(),
  });
});

// Push updated settings from the App to MT5
app.post('/api/app/update-config', (req, res) => {
  const { config } = req.body;
  if (config) {
    cloudBridge.config = { ...cloudBridge.config, ...config };
    cloudBridge.configVersion += 1;
    addActivity(
      'SETTING_UPDATE',
      `App modified settings (v${cloudBridge.configVersion}): TP=${config.takeProfitPoints || cloudBridge.config.takeProfitPoints}pts, SL=${config.stopLossPoints || cloudBridge.config.stopLossPoints}pts`
    );
  }
  res.json({ ok: true, version: cloudBridge.configVersion });
});

// Send emergency command (Close All or Pause/Resume)
app.post('/api/app/command', (req, res) => {
  const { command } = req.body;
  if (command === 'CLOSE_ALL') {
    cloudBridge.emergencyCommand = 'CLOSE_ALL';
    addActivity('COMMAND', 'EMERGENCY TRIGGER: Close all positions sent to MT5');
  } else if (command === 'PAUSE_TRADING') {
    cloudBridge.isPaused = true;
    addActivity('COMMAND', 'Trading PAUSED from mobile/web app');
  } else if (command === 'RESUME_TRADING') {
    cloudBridge.isPaused = false;
    addActivity('COMMAND', 'Trading RESUMED from mobile/web app');
  }
  res.json({ ok: true, currentCommand: cloudBridge.emergencyCommand, isPaused: cloudBridge.isPaused });
});

// Regenerate or update pairing key
app.post('/api/app/set-pairing-key', (req, res) => {
  const { key } = req.body;
  if (key && typeof key === 'string') {
    cloudBridge.pairingKey = key.trim().toUpperCase();
    addActivity('SETTING_UPDATE', `Pairing key updated to: ${cloudBridge.pairingKey}`);
  }
  res.json({ ok: true, key: cloudBridge.pairingKey });
});

// -------------------------------------------------------------
// VITE CLIENT INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MT5 Scalper Cloud Bridge] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
