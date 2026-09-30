//+------------------------------------------------------------------+
//|                                        MicroScalper_MT5_SmallAcc.mq5 |
//|                             High-Frequency Micro Account Scalper |
//|          Engineered for $5.00 - $10.00 Micro Accounts (M1 / M5)   |
//|               WITH LIVE MOBILE & WEB APP REMOTE CONTROLLER       |
//+------------------------------------------------------------------+
#property copyright   "MicroScalper Algo Systems"
#property link        "https://mql5.com"
#property version     "4.00"
#property description "Rapid micro-scalping EA (Fast EMA Crossover (Fast: 5, Slow: 13, Trend: 34)) with live mobile/web app remote control, session filters, and zero-delay breakeven."
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>
#include <Trade\SymbolInfo.mqh>

//--- Trade Objects
CTrade         m_trade;
CPositionInfo  m_position;
CAccountInfo   m_account;
CSymbolInfo    m_symbol;

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+
input group "=== GENERAL ==="
input ulong    InpMagicNumber          = 778901;     // EA Unique Magic Number
input string   InpTradeComment         = "MicroScalp_M1"; // Broker Order Comment
input ENUM_TIMEFRAMES InpTimeframe     = PERIOD_M1;      // Signal Evaluation Timeframe

input group "=== REMOTE APP CONTROLLER & CLOUD BRIDGE ==="
input bool     InpUseCloudSync         = true;        // Connect to Remote App Controller
input string   InpCloudBridgeUrl       = "https://ais-dev-isuwyocwptisbpji4w6xdf-881671125978.europe-west2.run.app"; // App Cloud URL (Add to MT5 WebRequest whitelist)
input string   InpPairingKey           = "SCALP-778901";   // Secret Pairing Token
input int      InpSyncIntervalSeconds  = 2;                // Cloud Sync Rate (Seconds)

input group "=== MICRO ACCOUNT RISK & LOT SIZING ==="
input double   InpLotSize              = 0.01;     // Base Lot Size (0.01 Recommended for $5-$10)
input bool     InpUseAutoCompounding   = true;        // Auto-Scale Lots as Capital Grows
input double   InpCompoundStepUSD      = 15.0;      // Balance per 0.01 lot step ($USD)
input int      InpMaxOpenTrades        = 1;          // Maximum Concurrent Open Positions
input double   InpMinAccountBalance    = 3.50;      // Min Free Balance to Trade ($USD)
input double   InpDailyProfitTargetUSD = 2.50;      // Daily Profit Target USD (0 = Disabled)
input double   InpDailyLossLimitUSD    = 1.50;      // Daily Max Loss Limit USD (0 = Disabled)

input group "=== RAPID SCALPING EXECUTION (POINTS) ==="
input int      InpTakeProfitPoints     = 25;         // Take Profit (Points: 10 pts = 1 pip)
input int      InpStopLossPoints       = 35;         // Stop Loss (Points: 10 pts = 1 pip)
input bool     InpUseBreakEven         = true;        // Enable Rapid Breakeven Lock
input int      InpBreakEvenTrigger     = 14;         // BE Trigger (Points in Profit)
input int      InpBreakEvenLock        = 2;          // BE Locked Profit (Points)
input bool     InpUseTrailingStop      = true;        // Enable Stepped Trailing Stop
input int      InpTrailingStop         = 15;         // Trailing Stop Distance (Points)
input int      InpTrailingStep         = 5;          // Trailing Step Interval (Points)
input int      InpMaxHoldTimeSeconds   = 120;        // Stale Trade Timeout (Seconds, 0 = Off)

input group "=== SPREAD & LIQUIDITY FILTERS ==="
input int      InpMaxSpreadPoints      = 12;         // Max Allowed Spread (Points: e.g. 12 = 1.2 pips)
input int      InpSlippagePoints       = 5;         // Max Slippage Deviation (Points)
input bool     InpOneTradePerBar       = true;           // Evaluate Entries Only Once Per Closed Bar
input bool     InpUseTickVelocity      = true;        // Require fast tick burst before entry

input group "=== TIME, SESSION & COOLDOWN GUARDS ==="
input bool     InpUseSessionFilter     = true;        // Restrict to Liquid Trading Hours
input int      InpStartHour            = 8;           // Session Start Hour (Server Time: e.g. 8)
input int      InpEndHour              = 20;          // Session End Hour (Server Time: e.g. 20)
input bool     InpUseFridayClose       = true;        // Close All Trades Before Weekend
input int      InpFridayCloseHour      = 20;          // Friday Close Hour (Server Time: e.g. 20)
input bool     InpUseLossCooldown      = true;        // Anti-Revenge Loss Cooldown
input int      InpMaxLosses            = 2;           // Consecutive Losses to Trigger Pause
input int      InpCooldownMinutes      = 30;          // Cooldown Duration (Minutes)
input bool     InpUseMobileAlerts      = true;        // Push Notification to MT5 Phone App

input group "=== VOLATILITY ADAPTATION (ATR SCALER) ==="
input bool     InpUseAtrDynamic        = true;        // ATR Dynamic Volatility TP/SL Scaler
input int      InpAtrPeriod            = 14;          // ATR Calculation Period
input double   InpAtrMultiplierTP      = 1.2;        // ATR Multiplier for Take Profit
input double   InpAtrMultiplierSL      = 1.5;        // ATR Multiplier for Stop Loss

input group "=== STRATEGY PARAMETERS (FAST_EMA) ==="
input int      InpEmaFastPeriod        = 5;          // Fast EMA Period
input int      InpEmaSlowPeriod        = 13;         // Slow EMA Period
input int      InpEmaTrendPeriod       = 34;         // Baseline Trend Filter EMA
input int      InpRsiPeriod            = 7;          // RSI Momentum Period
input double   InpRsiOverbought        = 75.0;       // RSI Overbought Level
input double   InpRsiOversold          = 25.0;       // RSI Oversold Level
input int      InpBbPeriod             = 20;         // Bollinger Bands Period
input double   InpBbDeviation          = 2.0;        // Bollinger Bands StdDev

//--- Indicator Handles
int h_emaFast   = INVALID_HANDLE;
int h_emaSlow   = INVALID_HANDLE;
int h_emaTrend  = INVALID_HANDLE;
int h_rsi       = INVALID_HANDLE;
int h_bb        = INVALID_HANDLE;
int h_atr       = INVALID_HANDLE;

//--- State tracking for tick velocity, cooldown & daily guards
datetime g_lastNewBarTime   = 0;
datetime g_recentTicks[5];
int      g_tickIndex        = 0;
datetime g_cooldownUntil    = 0;
datetime g_lastHistoryDay   = 0;
double   g_dailyPnlUSD      = 0.0;
bool     g_dailyTargetHit   = false;
bool     g_dailyLossHit     = false;

//--- Remote Cloud Controller Dynamic State (Overridden in real-time by App)
bool     g_cloudConnected      = false;
bool     g_remotePaused        = false;
int      g_activeTP            = 25;
int      g_activeSL            = 35;
int      g_activeBE            = 14;
int      g_activeTrail         = 15;
int      g_activeHoldTime      = 120;
int      g_activeMaxSpread     = 12;
double   g_activeLot           = 0.01;
string   g_activeStrategy      = "fast_ema";
int      g_lastConfigVersion   = 0;
datetime g_lastSyncTime        = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(!m_symbol.Name(_Symbol))
   {
      Print("Failed to initialize symbol: ", _Symbol);
      return(INIT_FAILED);
   }
   m_symbol.Refresh();

   m_trade.SetExpertMagicNumber(InpMagicNumber);
   m_trade.SetDeviationInPoints(InpSlippagePoints);
   m_trade.SetTypeFillingBySymbol(_Symbol);

   h_emaFast  = iMA(_Symbol, InpTimeframe, InpEmaFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_emaSlow  = iMA(_Symbol, InpTimeframe, InpEmaSlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_emaTrend = iMA(_Symbol, InpTimeframe, InpEmaTrendPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_rsi      = iRSI(_Symbol, InpTimeframe, InpRsiPeriod, PRICE_CLOSE);
   h_bb       = iBands(_Symbol, InpTimeframe, InpBbPeriod, 0, InpBbDeviation, PRICE_CLOSE);
   h_atr      = iATR(_Symbol, InpTimeframe, InpAtrPeriod);

   if(h_emaFast == INVALID_HANDLE || h_emaSlow == INVALID_HANDLE ||
      h_emaTrend == INVALID_HANDLE || h_rsi == INVALID_HANDLE ||
      h_bb == INVALID_HANDLE || h_atr == INVALID_HANDLE)
   {
      Print("Error creating indicator handles. Error code: ", GetLastError());
      return(INIT_FAILED);
   }

   ArrayInitialize(g_recentTicks, 0);
   g_tickIndex = 0;

   // Recompute the day's realized P/L from history so limits survive restarts
   RecalculateDailyPnl();

   // 1-Second Timer for fast execution, breakeven, and remote app sync
   EventSetTimer(1);

   Print("MicroScalper_MT5_SmallAcc v4.00 loaded. Strategy: fast_ema. Pairing Key: ", InpPairingKey);
   if(InpUseMobileAlerts)
      SendNotification("MicroScalper EA active on " + _Symbol + ". App remote bridge enabled.");

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();

   if(h_emaFast != INVALID_HANDLE)  IndicatorRelease(h_emaFast);
   if(h_emaSlow != INVALID_HANDLE)  IndicatorRelease(h_emaSlow);
   if(h_emaTrend != INVALID_HANDLE) IndicatorRelease(h_emaTrend);
   if(h_rsi != INVALID_HANDLE)      IndicatorRelease(h_rsi);
   if(h_bb != INVALID_HANDLE)       IndicatorRelease(h_bb);
   if(h_atr != INVALID_HANDLE)      IndicatorRelease(h_atr);

   Comment("");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   m_symbol.RefreshRates();
   RecordTickVelocity();

   UpdateChartHud();

   // 1. Position Management (Breakeven, Trailing Stop, Stale Timeout)
   ManageActiveTrades();

   // 2. Check Remote App Pause Switch
   if(g_remotePaused)
      return;

   // 3. Friday Close Protection (Avoid weekend gaps)
   if(InpUseFridayClose && IsFridayCloseTime())
   {
      CloseAllPositions("Friday Weekend Protection");
      return;
   }

   // 4. Trading Session Hours Filter
   if(InpUseSessionFilter && !IsInsideTradingHours())
      return;

   // 5. Consecutive Loss Cooldown Guard
   if(InpUseLossCooldown && IsLossCooldownActive())
      return;

   // 6. Account Safety Floor & Daily Profit/Loss Guards
   if(!IsAccountSafeToTrade())
      return;

   // 7. Spread Filter Check
   int currentSpread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(currentSpread > g_activeMaxSpread)
      return;

   // 8. Tick Velocity Momentum Check
   if(InpUseTickVelocity && !HasSufficientTickVelocity())
      return;

   // 9. Max Concurrent Trades Limit
   if(CountOpenPositions() >= InpMaxOpenTrades)
      return;

   // 10. One evaluation per closed bar (prevents same-bar re-entry spam)
   if(InpOneTradePerBar && !IsNewBar())
      return;

   // 11. Evaluate Scalping Signal
   CheckAndExecuteSignal();
}

//+------------------------------------------------------------------+
//| High-resolution 1-second timer: App Sync & Fast Trade Management|
//+------------------------------------------------------------------+
void OnTimer()
{
   // 1. Sync with Remote Web/Mobile App via WebRequest
   SyncWithRemoteApp();

   // 2. Manage trades even during quiet market periods
   ManageActiveTrades();
}

//+------------------------------------------------------------------+
//| Sync with Remote App: Fetches live settings and emergency command|
//+------------------------------------------------------------------+
void SyncWithRemoteApp()
{
   if(!InpUseCloudSync)
      return;

   datetime now = TimeCurrent();
   if((now - g_lastSyncTime) < InpSyncIntervalSeconds)
      return;

   g_lastSyncTime = now;

   char postData[];
   char resultData[];
   string resultHeaders;
   int timeout = 2500;

   int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   string url = InpCloudBridgeUrl + "/api/ea/sync?key=" + InpPairingKey +
                "&balance=" + DoubleToString(m_account.Balance(), 2) +
                "&equity=" + DoubleToString(m_account.Equity(), 2) +
                "&margin=" + DoubleToString(m_account.FreeMargin(), 2) +
                "&spread=" + IntegerToString(spread) +
                "&trades=" + IntegerToString(CountOpenPositions()) +
                "&symbol=" + _Symbol +
                "&acc=" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));

   ResetLastError();
   int res = WebRequest("GET", url, "", timeout, postData, resultData, resultHeaders);

   if(res == 200)
   {
      g_cloudConnected = true;
      string responseJson = CharArrayToString(resultData);
      ParseAndUpdateCloudSettings(responseJson);
   }
   else
   {
      g_cloudConnected = false;
      int err = GetLastError();
      if(err == 4014)
      {
         Print("WebRequest URL not allowed! Add '", InpCloudBridgeUrl, "' in MT5 Tools->Options->Expert Advisors");
      }
   }
}

//+------------------------------------------------------------------+
//| Parse JSON received from Remote App and apply live settings      |
//+------------------------------------------------------------------+
void ParseAndUpdateCloudSettings(string json)
{
   // 1. Emergency Kill Switch (server dispatches each command exactly once)
   string cmd = ExtractJsonString(json, "cmd");
   if(cmd == "CLOSE_ALL")
   {
      Print("EMERGENCY KILL SWITCH TRIGGERED FROM REMOTE APP!");
      CloseAllPositions("Remote App Kill Switch");
      if(InpUseMobileAlerts)
         SendNotification("MicroScalper: CLOSE ALL executed from remote app.");
   }

   // 2. Pause / Resume Toggle
   g_remotePaused = ExtractJsonBool(json, "paused");

   // 3. Dynamic Setting Overrides (only when server reports a new config version)
   int v = ExtractJsonInt(json, "v");
   if(v > 0 && v != g_lastConfigVersion)
   {
      g_lastConfigVersion = v;

      int tp = ExtractJsonInt(json, "tp");
      if(tp >= 10 && tp <= 100) g_activeTP = tp;

      int sl = ExtractJsonInt(json, "sl");
      if(sl >= 10 && sl <= 150) g_activeSL = sl;

      int be = ExtractJsonInt(json, "be");
      if(be >= 5 && be <= 50) g_activeBE = be;

      int trail = ExtractJsonInt(json, "trail");
      if(trail >= 5 && trail <= 100) g_activeTrail = trail;

      int hold = ExtractJsonInt(json, "hold");
      if(hold >= 20 && hold <= 600) g_activeHoldTime = hold;

      int maxSpread = ExtractJsonInt(json, "spread");
      if(maxSpread >= 5 && maxSpread <= 50) g_activeMaxSpread = maxSpread;

      double lot = ExtractJsonDouble(json, "lot");
      if(lot >= 0.01 && lot <= 0.05) g_activeLot = lot;

      string strat = ExtractJsonString(json, "strat");
      if(StringLen(strat) > 0) g_activeStrategy = strat;

      Print("Cloud config v", v, " applied: TP=", g_activeTP, " SL=", g_activeSL,
            " BE=", g_activeBE, " TRAIL=", g_activeTrail, " HOLD=", g_activeHoldTime,
            " SPREAD=", g_activeMaxSpread, " LOT=", DoubleToString(g_activeLot, 2),
            " STRAT=", g_activeStrategy);
   }
}

//+------------------------------------------------------------------+
//| Minimal JSON helpers (server emits flat single-line key:value)   |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key)
{
   string search = "\"" + key + "\":\"";
   int pos = StringFind(json, search);
   if(pos < 0) return "";
   pos += StringLen(search);
   int endPos = StringFind(json, "\"", pos);
   if(endPos < 0) return "";
   return StringSubstr(json, pos, endPos - pos);
}

int ExtractJsonInt(string json, string key)
{
   string search = "\"" + key + "":";
   int pos = StringFind(json, search);
   if(pos < 0) return 0;
   pos += StringLen(search);
   int endPos = StringFind(json, ",", pos);
   if(endPos < 0) endPos = StringFind(json, "}", pos);
   if(endPos < 0) return 0;
   string val = StringSubstr(json, pos, endPos - pos);
   StringTrimLeft(val); StringTrimRight(val);
   return (int)StringToInteger(val);
}

double ExtractJsonDouble(string json, string key)
{
   string search = "\"" + key + "":";
   int pos = StringFind(json, search);
   if(pos < 0) return 0.0;
   pos += StringLen(search);
   int endPos = StringFind(json, ",", pos);
   if(endPos < 0) endPos = StringFind(json, "}", pos);
   if(endPos < 0) return 0.0;
   string val = StringSubstr(json, pos, endPos - pos);
   StringTrimLeft(val); StringTrimRight(val);
   return StringToDouble(val);
}

bool ExtractJsonBool(string json, string key)
{
   string search = "\"" + key + "":";
   int pos = StringFind(json, search);
   if(pos < 0) return false;
   pos += StringLen(search);
   int endPos = StringFind(json, ",", pos);
   if(endPos < 0) endPos = StringFind(json, "}", pos);
   if(endPos < 0) return false;
   string val = StringSubstr(json, pos, endPos - pos);
   StringTrimLeft(val); StringTrimRight(val);
   if(val == "true" || val == "1") return true;
   return false;
}

//+------------------------------------------------------------------+
//| Manage Active Positions: Breakeven, Trailing Stop, Stale Timeout |
//+------------------------------------------------------------------+
void ManageActiveTrades()
{
   m_symbol.RefreshRates();
   double point = m_symbol.Point();
   double bid   = m_symbol.Bid();
   double ask   = m_symbol.Ask();
   datetime now = TimeCurrent();

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!m_position.SelectByIndex(i))
         continue;

      if(m_position.Symbol() != _Symbol || m_position.Magic() != InpMagicNumber)
         continue;

      ulong ticket      = m_position.Ticket();
      double openPrice  = m_position.PriceOpen();
      double currentSL  = m_position.StopLoss();
      double currentTP  = m_position.TakeProfit();
      datetime openTime = (datetime)m_position.Time();
      ENUM_POSITION_TYPE type = m_position.PositionType();

      //--- A. Fast Stale Trade Timeout Check (Close if trade is stagnant)
      if(g_activeHoldTime > 0 && (now - openTime) >= g_activeHoldTime)
      {
         m_trade.PositionClose(ticket);
         Print("Fast timeout reached (", g_activeHoldTime, "s). Trade closed: #", ticket);
         continue;
      }

      //--- B. Rapid Breakeven Lock
      if(InpUseBreakEven)
      {
         if(type == POSITION_TYPE_BUY)
         {
            double profitPoints = (bid - openPrice) / point;
            if(profitPoints >= g_activeBE)
            {
               double newSL = NormalizeDouble(openPrice + (InpBreakEvenLock * point), _Digits);
               if(currentSL < newSL || currentSL == 0.0)
               {
                  if(m_trade.PositionModify(ticket, newSL, currentTP))
                  {
                     Print("Rapid Breakeven Activated for Buy #", ticket, " SL -> ", newSL);
                     if(InpUseMobileAlerts)
                        SendNotification("MicroScalper: Breakeven Locked on #" + IntegerToString(ticket));
                  }
               }
            }
         }
         else if(type == POSITION_TYPE_SELL)
         {
            double profitPoints = (openPrice - ask) / point;
            if(profitPoints >= g_activeBE)
            {
               double newSL = NormalizeDouble(openPrice - (InpBreakEvenLock * point), _Digits);
               if(currentSL > newSL || currentSL == 0.0)
               {
                  if(m_trade.PositionModify(ticket, newSL, currentTP))
                  {
                     Print("Rapid Breakeven Activated for Sell #", ticket, " SL -> ", newSL);
                     if(InpUseMobileAlerts)
                        SendNotification("MicroScalper: Breakeven Locked on #" + IntegerToString(ticket));
                  }
               }
            }
         }
      }

      //--- C. Stepped Trailing Stop (respects broker stops/freeze level)
      if(InpUseTrailingStop)
      {
         double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;

         if(type == POSITION_TYPE_BUY)
         {
            double profitPoints = (bid - openPrice) / point;
            if(profitPoints > g_activeTrail)
            {
               double desiredSL = NormalizeDouble(bid - (g_activeTrail * point), _Digits);
               if(desiredSL <= bid - stopsLevel &&
                  (desiredSL > currentSL + (InpTrailingStep * point) || currentSL == 0.0))
               {
                  m_trade.PositionModify(ticket, desiredSL, currentTP);
               }
            }
         }
         else if(type == POSITION_TYPE_SELL)
         {
            double profitPoints = (openPrice - ask) / point;
            if(profitPoints > g_activeTrail)
            {
               double desiredSL = NormalizeDouble(ask + (g_activeTrail * point), _Digits);
               if(desiredSL >= ask + stopsLevel &&
                  (desiredSL < currentSL - (InpTrailingStep * point) || currentSL == 0.0))
               {
                  m_trade.PositionModify(ticket, desiredSL, currentTP);
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Check Strategy Signal and Place Rapid Trade                      |
//+------------------------------------------------------------------+
void CheckAndExecuteSignal()
{
   double point = m_symbol.Point();
   double bid   = m_symbol.Bid();
   double ask   = m_symbol.Ask();
   double lots  = GetCalculatedLotSize();

   bool buySignal  = false;
   bool sellSignal = false;

   //--- Strategy: Fast EMA Momentum Crossover + Micro Trend Filter
   double fastEMA[], slowEMA[], trendEMA[];
   ArraySetAsSeries(fastEMA, true);
   ArraySetAsSeries(slowEMA, true);
   ArraySetAsSeries(trendEMA, true);

   if(CopyBuffer(h_emaFast, 0, 0, 3, fastEMA) < 3 ||
      CopyBuffer(h_emaSlow, 0, 0, 3, slowEMA) < 3 ||
      CopyBuffer(h_emaTrend, 0, 0, 3, trendEMA) < 3)
      return;

   // Fresh Bullish Crossover above Trend Filter
   if(fastEMA[1] > slowEMA[1] && fastEMA[2] <= slowEMA[2] && fastEMA[1] > trendEMA[1])
   {
      buySignal = true;
   }
   // Fresh Bearish Crossover below Trend Filter
   else if(fastEMA[1] < slowEMA[1] && fastEMA[2] >= slowEMA[2] && fastEMA[1] < trendEMA[1])
   {
      sellSignal = true;
   }

   if(!buySignal && !sellSignal)
      return;

   // Determine Active Take Profit & Stop Loss (Dynamic ATR or Cloud Config)
   int activeTP = g_activeTP;
   int activeSL = g_activeSL;

   if(InpUseAtrDynamic && h_atr != INVALID_HANDLE)
   {
      double atrVal[];
      ArraySetAsSeries(atrVal, true);
      if(CopyBuffer(h_atr, 0, 0, 1, atrVal) > 0 && atrVal[0] > 0)
      {
         int dynamicTP = (int)MathRound((atrVal[0] * InpAtrMultiplierTP) / point);
         int dynamicSL = (int)MathRound((atrVal[0] * InpAtrMultiplierSL) / point);

         if(dynamicTP >= 15 && dynamicTP <= 55) activeTP = dynamicTP;
         if(dynamicSL >= 20 && dynamicSL <= 60) activeSL = dynamicSL;
      }
   }

   // Broker compliance: minimum stop distance checks
   double stopsLevel  = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   double freezeLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL) * point;
   double minDistance = MathMax(stopsLevel, freezeLevel) + point;

   // Place BUY Order
   if(buySignal)
   {
      double sl = 0, tp = 0;
      if(activeSL > 0) sl = NormalizeDouble(ask - (activeSL * point), _Digits);
      if(activeTP > 0) tp = NormalizeDouble(ask + (activeTP * point), _Digits);

      if(sl > 0 && ask - sl < minDistance) sl = NormalizeDouble(ask - minDistance, _Digits);
      if(tp > 0 && tp - ask < minDistance) tp = NormalizeDouble(ask + minDistance, _Digits);

      if(m_trade.Buy(lots, _Symbol, ask, sl, tp, InpTradeComment))
      {
         Print("Micro Scalp BUY Executed: ", lots, " lot @ ", ask, " SL: ", sl, " TP: ", tp);
         if(InpUseMobileAlerts)
            SendNotification("MicroScalper: BUY " + DoubleToString(lots, 2) + " " + _Symbol + " @ " + DoubleToString(ask, _Digits));
      }
      else
      {
         Print("Buy Order failed: ", m_trade.ResultRetcode(), " - ", m_trade.ResultRetcodeDescription());
      }
   }
   // Place SELL Order
   else if(sellSignal)
   {
      double sl = 0, tp = 0;
      if(activeSL > 0) sl = NormalizeDouble(bid + (activeSL * point), _Digits);
      if(activeTP > 0) tp = NormalizeDouble(bid - (activeTP * point), _Digits);

      if(sl > 0 && sl - bid < minDistance) sl = NormalizeDouble(bid + minDistance, _Digits);
      if(tp > 0 && bid - tp < minDistance) tp = NormalizeDouble(bid - minDistance, _Digits);

      if(m_trade.Sell(lots, _Symbol, bid, sl, tp, InpTradeComment))
      {
         Print("Micro Scalp SELL Executed: ", lots, " lot @ ", bid, " SL: ", sl, " TP: ", tp);
         if(InpUseMobileAlerts)
            SendNotification("MicroScalper: SELL " + DoubleToString(lots, 2) + " " + _Symbol + " @ " + DoubleToString(bid, _Digits));
      }
      else
      {
         Print("Sell Order failed: ", m_trade.ResultRetcode(), " - ", m_trade.ResultRetcodeDescription());
      }
   }
}

//+------------------------------------------------------------------+
//| Calculate dynamic lot size (Auto-compounding for growing capital)|
//+------------------------------------------------------------------+
double GetCalculatedLotSize()
{
   double lots = g_activeLot;

   if(InpUseAutoCompounding && InpCompoundStepUSD > 0)
   {
      double balance = m_account.Balance();
      int steps = (int)MathFloor(balance / InpCompoundStepUSD);
      lots = lots + (steps * 0.01);

      if(lots > 0.05)
         lots = 0.05;
   }

   // Clamp to broker symbol volume limits
   double volMin  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double volMax  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double volStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(volStep > 0)
      lots = MathFloor(lots / volStep) * volStep;
   if(volMin > 0 && lots < volMin) lots = volMin;
   if(volMax > 0 && lots > volMax) lots = volMax;

   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Count active open positions for this EA                          |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
            count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Detect a newly opened bar on the signal timeframe                |
//+------------------------------------------------------------------+
bool IsNewBar()
{
   datetime barTime = iTime(_Symbol, InpTimeframe, 0);
   if(barTime == 0)
      return false;

   if(barTime != g_lastNewBarTime)
   {
      g_lastNewBarTime = barTime;
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Recompute today's realized P/L from deal history                 |
//+------------------------------------------------------------------+
void RecalculateDailyPnl()
{
   datetime dayStart = iTime(_Symbol, PERIOD_D1, 0);
   if(dayStart == 0)
      dayStart = (datetime)((long)(TimeCurrent() / 86400) * 86400);

   g_dailyPnlUSD = 0.0;
   HistorySelect(dayStart, TimeCurrent() + 60);

   int dealsTotal = HistoryDealsTotal();
   for(int i = 0; i < dealsTotal; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket > 0)
      {
         if(HistoryDealGetString(dealTicket, DEAL_SYMBOL) == _Symbol &&
            HistoryDealGetInteger(dealTicket, DEAL_MAGIC) == (long)InpMagicNumber &&
            HistoryDealGetInteger(dealTicket, DEAL_ENTRY) != DEAL_ENTRY_IN)
         {
            g_dailyPnlUSD += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            g_dailyPnlUSD += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
            g_dailyPnlUSD += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Check Account Capital & Daily Loss / Profit Limits               |
//+------------------------------------------------------------------+
bool IsAccountSafeToTrade()
{
   double balance = m_account.Balance();
   double equity  = m_account.Equity();

   if(balance < InpMinAccountBalance || equity < InpMinAccountBalance)
      return false;

   datetime dayStart = iTime(_Symbol, PERIOD_D1, 0);
   if(dayStart == 0)
      dayStart = (datetime)((long)(TimeCurrent() / 86400) * 86400);

   // Roll daily counters at midnight (server time)
   if(dayStart != g_lastHistoryDay)
   {
      g_lastHistoryDay = dayStart;
      g_dailyTargetHit = false;
      g_dailyLossHit   = false;
   }

   RecalculateDailyPnl();

   if(InpDailyProfitTargetUSD > 0 && g_dailyPnlUSD >= InpDailyProfitTargetUSD)
   {
      if(!g_dailyTargetHit)
      {
         g_dailyTargetHit = true;
         if(InpUseMobileAlerts)
            SendNotification("MicroScalper: DAILY PROFIT TARGET HIT! (+$" + DoubleToString(g_dailyPnlUSD, 2) + ")");
         Print("Daily profit target reached: ", DoubleToString(g_dailyPnlUSD, 2));
      }
      return false;
   }

   if(InpDailyLossLimitUSD > 0 && g_dailyPnlUSD <= -InpDailyLossLimitUSD)
   {
      if(!g_dailyLossHit)
      {
         g_dailyLossHit = true;
         if(InpUseMobileAlerts)
            SendNotification("MicroScalper: DAILY LOSS LIMIT REACHED (-$" + DoubleToString(MathAbs(g_dailyPnlUSD), 2) + "). Paused until tomorrow.");
         Print("Daily loss limit reached: ", DoubleToString(g_dailyPnlUSD, 2));
      }
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Trading Hours Filter: Skip rollover spread spikes (21:00-23:00)  |
//+------------------------------------------------------------------+
bool IsInsideTradingHours()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(InpStartHour == InpEndHour)
      return true;

   // Normal window (start < end) vs overnight window wrapping past midnight
   if(InpStartHour < InpEndHour)
      return (dt.hour >= InpStartHour && dt.hour < InpEndHour);

   return (dt.hour >= InpStartHour || dt.hour < InpEndHour);
}

//+------------------------------------------------------------------+
//| Friday Close Filter: Avoid weekend price gap blowout             |
//+------------------------------------------------------------------+
bool IsFridayCloseTime()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   return (dt.day_of_week == 5 && dt.hour >= InpFridayCloseHour);
}

void CloseAllPositions(string reason)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
         {
            if(m_trade.PositionClose(m_position.Ticket()))
               Print("Closed position #", m_position.Ticket(), " reason: ", reason);
            else
               Print("Failed to close position #", m_position.Ticket(), " reason: ", reason,
                     " retcode: ", m_trade.ResultRetcodeDescription());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Anti-Revenge Consecutive Loss Cooldown Guard                     |
//+------------------------------------------------------------------+
bool IsLossCooldownActive()
{
   if(!InpUseLossCooldown)
      return false;

   if(g_cooldownUntil > TimeCurrent())
      return true;

   // Scan the most recent closed-out deals of this EA (newest first)
   datetime lookbackStart = TimeCurrent() - 3 * 86400;
   HistorySelect(lookbackStart, TimeCurrent() + 60);

   int consecutiveLosses = 0;
   datetime lastLossTime = 0;
   int total = HistoryDealsTotal();

   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)
         continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT)
         continue;
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != _Symbol)
         continue;
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != (long)InpMagicNumber)
         continue;

      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT) +
                      HistoryDealGetDouble(ticket, DEAL_SWAP) +
                      HistoryDealGetDouble(ticket, DEAL_COMMISSION);

      if(profit < 0)
      {
         consecutiveLosses++;
         if(lastLossTime == 0)
            lastLossTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

         if(consecutiveLosses >= InpMaxLosses)
            break;
      }
      else if(profit > 0)
      {
         break;
      }
   }

   if(consecutiveLosses >= InpMaxLosses && lastLossTime > 0)
   {
      datetime until = lastLossTime + (InpCooldownMinutes * 60);
      if(TimeCurrent() < until)
      {
         if(g_cooldownUntil != until)
         {
            g_cooldownUntil = until;
            if(InpUseMobileAlerts)
               SendNotification("MicroScalper: " + IntegerToString(consecutiveLosses) +
                                " consecutive losses. Cooling down " + IntegerToString(InpCooldownMinutes) + " minutes.");
         }
         return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
//| Tick Velocity Impulse Tracking                                   |
//+------------------------------------------------------------------+
void RecordTickVelocity()
{
   g_recentTicks[g_tickIndex] = TimeLocal();
   g_tickIndex = (g_tickIndex + 1) % 5;
}

bool HasSufficientTickVelocity()
{
   datetime oldestTick = 0;
   int observed = 0;

   for(int i = 0; i < 5; i++)
   {
      if(g_recentTicks[i] == 0)
         continue;
      if(oldestTick == 0 || g_recentTicks[i] < oldestTick)
         oldestTick = g_recentTicks[i];
      observed++;
   }

   // Not enough tick history yet - allow trading
   if(observed < 5 || oldestTick == 0)
      return true;

   return ((TimeLocal() - oldestTick) <= 4);
}

//+------------------------------------------------------------------+
//| On-Chart Heads Up Display (HUD)                                  |
//+------------------------------------------------------------------+
void UpdateChartHud()
{
   int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   string status = "ACTIVE - SCANNING";

   if(g_remotePaused)
      status = "PAUSED (REMOTE APP)";
   else if(InpUseFridayClose && IsFridayCloseTime())
      status = "PAUSED (WEEKEND CLOSE)";
   else if(InpUseSessionFilter && !IsInsideTradingHours())
      status = "PAUSED (SESSION HOURS)";
   else if(InpUseLossCooldown && IsLossCooldownActive())
      status = "PAUSED (LOSS COOLDOWN)";
   else if(g_dailyTargetHit)
      status = "DONE (PROFIT TARGET)";
   else if(g_dailyLossHit)
      status = "DONE (LOSS LIMIT)";
   else if(spread > g_activeMaxSpread)
      status = "SPREAD FILTERED (" + IntegerToString(spread) + " pts)";

   string syncStatus = g_cloudConnected ? "CONNECTED" : (InpUseCloudSync ? "SEARCHING..." : "DISABLED");

   string hud = "========================================\n" +
                "  MICRO SCALPER MT5 (REMOTE APP ENABLED)\n" +
                "========================================\n" +
                " Cloud Remote App: " + syncStatus + "\n" +
                " Pairing Token:    " + InpPairingKey + "\n" +
                " Active Strategy:  " + g_activeStrategy + "\n" +
                " Active Lot Size:  " + DoubleToString(GetCalculatedLotSize(), 2) + "\n" +
                " Scalping Targets: TP=" + IntegerToString(g_activeTP) + " SL=" + IntegerToString(g_activeSL) + " BE=" + IntegerToString(g_activeBE) + "\n" +
                " Account Balance:  $" + DoubleToString(m_account.Balance(), 2) + "\n" +
                " Account Equity:   $" + DoubleToString(m_account.Equity(), 2) + "\n" +
                " Today Realized:   $" + DoubleToString(g_dailyPnlUSD, 2) + "\n" +
                " Current Spread:   " + IntegerToString(spread) + " pts (Max: " + IntegerToString(g_activeMaxSpread) + ")\n" +
                " Open Trades:      " + IntegerToString(CountOpenPositions()) + " / " + IntegerToString(InpMaxOpenTrades) + "\n" +
                " EA Status:        " + status + "\n" +
                "========================================";
   Comment(hud);
}
//+------------------------------------------------------------------+
