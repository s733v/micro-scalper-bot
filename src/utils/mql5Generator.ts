import { EAConfig } from '../types/ea';

export function generateMQL5Code(config: EAConfig): string {
  const strategyComment = {
    fast_ema: `Fast EMA Crossover (Fast: ${config.emaFastPeriod}, Slow: ${config.emaSlowPeriod}, Trend: ${config.emaTrendPeriod})`,
    rsi_burst: `RSI Hyper-Burst Scalper (Period: ${config.rsiPeriod}, Levels: ${config.rsiOversold}/${config.rsiOverbought})`,
    bollinger_bounce: `Bollinger Band Micro-Squeeze Reversal (Period: ${config.bbPeriod}, Dev: ${config.bbDeviation})`,
    pinbar_scalp: `Price Action Candle Rejection / Micro-Impulse Scalper`,
  }[config.strategy];

  return `//+------------------------------------------------------------------+
//|                                     MicroScalper_MT5_SmallAcc.mq5 |
//|                             High-Frequency Micro Account Scalper |
//|          Engineered for $5.00 - $10.00 Micro Accounts (M1 / M5)   |
//|               WITH LIVE MOBILE & WEB APP REMOTE CONTROLLER       |
//+------------------------------------------------------------------+
#property copyright   "MicroScalper Algo Systems"
#property link        "https://mql5.com"
#property version     "3.20"
#property description "Rapid micro-scalping EA with live mobile app remote control, session filters, and zero-delay breakeven."
#property strict

#include <Trade\\Trade.mqh>
#include <Trade\\PositionInfo.mqh>
#include <Trade\\AccountInfo.mqh>
#include <Trade\\SymbolInfo.mqh>

//--- Trade Objects
CTrade         m_trade;
CPositionInfo  m_position;
CAccountInfo   m_account;
CSymbolInfo    m_symbol;

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+
input group "=== REMOTE APP CONTROLLER & CLOUD BRIDGE ==="
input bool     InpUseCloudSync         = ${config.useCloudSync ? 'true' : 'false'};        // Connect to Remote App Controller
input string   InpCloudBridgeUrl       = "${config.cloudBridgeUrl}"; // App Cloud URL (Add to MT5 WebRequest whitelist)
input string   InpPairingKey           = "${config.pairingKey}";   // Secret Pairing Token
input int      InpSyncIntervalSeconds  = ${config.syncIntervalSeconds};                // Cloud Sync Rate (Seconds)

input group "=== MICRO ACCOUNT RISK & LOT SIZING ==="
input double   InpLotSize              = ${config.lotSize.toFixed(2)};     // Base Lot Size (0.01 Recommended for $5-$10)
input bool     InpUseAutoCompounding   = ${config.useAutoCompounding ? 'true' : 'false'};        // Auto-Scale Lots as Capital Grows
input double   InpCompoundStepUSD      = ${config.compoundBalanceStepUSD.toFixed(1)};      // Balance per 0.01 lot step ($USD)
input int      InpMaxOpenTrades        = ${config.maxOpenTrades};          // Maximum Concurrent Open Positions
input double   InpMinAccountBalance    = ${config.minFreeEquityUSD.toFixed(2)};      // Min Free Balance to Trade ($USD)
input double   InpDailyProfitTargetUSD = ${config.dailyProfitTargetUSD.toFixed(2)};      // Daily Profit Target USD (0 = Disabled)
input double   InpDailyLossLimitUSD    = ${config.dailyLossLimitUSD.toFixed(2)};      // Daily Max Loss Limit USD (0 = Disabled)

input group "=== RAPID SCALPING EXECUTION (POINTS) ==="
input int      InpTakeProfitPoints     = ${config.takeProfitPoints};         // Take Profit (Points: 10 pts = 1 pip)
input int      InpStopLossPoints       = ${config.stopLossPoints};         // Stop Loss (Points: 10 pts = 1 pip)
input bool     InpUseBreakEven         = ${config.useBreakEven ? 'true' : 'false'};        // Enable Rapid Breakeven Lock
input int      InpBreakEvenTrigger     = ${config.breakEvenTriggerPoints};         // BE Trigger (Points in Profit)
input int      InpBreakEvenLock        = ${config.breakEvenLockPoints};          // BE Locked Profit (Points)
input bool     InpUseTrailingStop      = ${config.useTrailingStop ? 'true' : 'false'};        // Enable Stepped Trailing Stop
input int      InpTrailingStop         = ${config.trailingStopPoints};         // Trailing Stop Distance (Points)
input int      InpTrailingStep         = ${config.trailingStepPoints};          // Trailing Step Interval (Points)
input int      InpMaxHoldTimeSeconds   = ${config.maxHoldTimeSeconds};        // Stale Trade Timeout (Seconds, 0 = Off)

input group "=== SPREAD & LIQUIDITY FILTERS ==="
input int      InpMaxSpreadPoints      = ${config.maxSpreadPoints};         // Max Allowed Spread (Points: e.g. 12 = 1.2 pips)
input bool     InpUseTickVelocity      = ${config.useTickVelocityFilter ? 'true' : 'false'};        // Require fast tick burst before entry
input ulong    InpMagicNumber          = ${config.magicNumber};     // EA Unique Magic Number
input string   InpTradeComment         = "${config.tradeComment}"; // Broker Order Comment

input group "=== TIME, SESSION & COOLDOWN GUARDS ==="
input bool     InpUseSessionFilter     = ${config.useSessionFilter ? 'true' : 'false'};        // Restrict to Liquid Trading Hours
input int      InpStartHour            = ${config.startHour};           // Session Start Hour (Server Time: e.g. 8)
input int      InpEndHour              = ${config.endHour};          // Session End Hour (Server Time: e.g. 20)
input bool     InpUseFridayClose       = ${config.useFridayClose ? 'true' : 'false'};        // Close All Trades Before Weekend
input int      InpFridayCloseHour      = ${config.fridayCloseHour};          // Friday Close Hour (Server Time: e.g. 20)
input bool     InpUseLossCooldown      = ${config.useLossCooldown ? 'true' : 'false'};        // Anti-Revenge Loss Cooldown
input int      InpMaxLosses            = ${config.maxConsecutiveLosses};           // Consecutive Losses to Trigger Pause
input int      InpCooldownMinutes      = ${config.cooldownMinutes};          // Cooldown Duration (Minutes)
input bool     InpUseMobileAlerts      = ${config.useMobileAlerts ? 'true' : 'false'};        // Push Notification to MT5 Phone App

input group "=== VOLATILITY ADAPTATION (ATR SCALER) ==="
input bool     InpUseAtrDynamic        = ${config.useAtrDynamicScaling ? 'true' : 'false'};        // ATR Dynamic Volatility TP/SL Scaler
input int      InpAtrPeriod            = ${config.atrPeriod};          // ATR Calculation Period
input double   InpAtrMultiplierTP      = ${config.atrMultiplierTP.toFixed(1)};        // ATR Multiplier for Take Profit
input double   InpAtrMultiplierSL      = ${config.atrMultiplierSL.toFixed(1)};        // ATR Multiplier for Stop Loss

input group "=== STRATEGY PARAMETERS (${config.strategy.toUpperCase()}) ==="
input int      InpEmaFastPeriod        = ${config.emaFastPeriod};          // Fast EMA Period
input int      InpEmaSlowPeriod        = ${config.emaSlowPeriod};         // Slow EMA Period
input int      InpEmaTrendPeriod       = ${config.emaTrendPeriod};         // Baseline Trend Filter EMA
input int      InpRsiPeriod            = ${config.rsiPeriod};          // RSI Momentum Period
input double   InpRsiOverbought        = ${config.rsiOverbought.toFixed(1)};       // RSI Overbought Level
input double   InpRsiOversold          = ${config.rsiOversold.toFixed(1)};       // RSI Oversold Level
input int      InpBbPeriod             = ${config.bbPeriod};         // Bollinger Bands Period
input double   InpBbDeviation          = ${config.bbDeviation.toFixed(1)};        // Bollinger Bands StdDev

//--- Indicator Handles
int h_emaFast   = INVALID_HANDLE;
int h_emaSlow   = INVALID_HANDLE;
int h_emaTrend  = INVALID_HANDLE;
int h_rsi       = INVALID_HANDLE;
int h_bb        = INVALID_HANDLE;
int h_atr       = INVALID_HANDLE;

//--- State tracking for tick velocity & cooldown
datetime g_lastLossTime = 0;
datetime g_recentTicks[5];
int      g_tickIndex = 0;

//--- Remote Cloud Controller Dynamic State (Overridden in real-time by App)
bool     g_cloudConnected      = false;
bool     g_remotePaused        = false;
int      g_activeTP            = ${config.takeProfitPoints};
int      g_activeSL            = ${config.stopLossPoints};
int      g_activeBE            = ${config.breakEvenTriggerPoints};
int      g_activeHoldTime      = ${config.maxHoldTimeSeconds};
int      g_activeMaxSpread     = ${config.maxSpreadPoints};
double   g_activeLot           = ${config.lotSize.toFixed(2)};
string   g_activeStrategy      = "${config.strategy}";
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
   m_trade.SetDeviationInPoints(${config.slippagePoints});
   m_trade.SetTypeFillingBySymbol(_Symbol);

   h_emaFast  = iMA(_Symbol, _Period, InpEmaFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_emaSlow  = iMA(_Symbol, _Period, InpEmaSlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_emaTrend = iMA(_Symbol, _Period, InpEmaTrendPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_rsi      = iRSI(_Symbol, _Period, InpRsiPeriod, PRICE_CLOSE);
   h_bb       = iBands(_Symbol, _Period, InpBbPeriod, 0, InpBbDeviation, PRICE_CLOSE);
   h_atr      = iATR(_Symbol, _Period, InpAtrPeriod);

   if(h_emaFast == INVALID_HANDLE || h_emaSlow == INVALID_HANDLE || h_rsi == INVALID_HANDLE || h_bb == INVALID_HANDLE || h_atr == INVALID_HANDLE)
   {
      Print("Error creating indicator handles. Error code: ", GetLastError());
      return(INIT_FAILED);
   }

   ArrayInitialize(g_recentTicks, 0);

   // 1-Second Timer for fast execution, breakeven, and remote app sync
   EventSetTimer(1);

   Print("MicroScalper EA v3.20 loaded. Pairing Key: ", InpPairingKey);
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

   // 6. Account Safety Floor Check
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

   // 10. Evaluate Scalping Signal
   CheckAndExecuteSignal();
}

//+------------------------------------------------------------------+
//| High-resolution 1-second timer: App Sync & Fast Trade Management|
//+------------------------------------------------------------------+
void OnTimer()
{
   // 1. Sync with Remote Web/Mobile App via WebRequest
   SyncWithRemoteApp();

   // 2. Manage trades
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
   // 1. Check Emergency Kill Switch
   string cmd = ExtractJsonString(json, "cmd");
   if(cmd == "CLOSE_ALL")
   {
      Print("EMERGENCY KILL SWITCH TRIGGERED FROM REMOTE APP!");
      CloseAllPositions("Remote App Kill Switch");
   }

   // 2. Pause / Resume Toggle
   int paused = ExtractJsonInt(json, "paused");
   g_remotePaused = (paused == 1);

   // 3. Dynamic Setting Overrides
   int tp = ExtractJsonInt(json, "tp");
   if(tp >= 10 && tp <= 100) g_activeTP = tp;

   int sl = ExtractJsonInt(json, "sl");
   if(sl >= 10 && sl <= 150) g_activeSL = sl;

   int be = ExtractJsonInt(json, "be");
   if(be >= 5 && be <= 50) g_activeBE = be;

   int hold = ExtractJsonInt(json, "hold");
   if(hold >= 20 && hold <= 600) g_activeHoldTime = hold;

   int spread = ExtractJsonInt(json, "spread");
   if(spread >= 5 && spread <= 50) g_activeMaxSpread = spread;

   double lot = ExtractJsonDouble(json, "lot");
   if(lot >= 0.01 && lot <= 0.05) g_activeLot = lot;

   string strat = ExtractJsonString(json, "strat");
   if(StringLen(strat) > 0) g_activeStrategy = strat;
}

string ExtractJsonString(string json, string key)
{
   string search = "\\"" + key + "\\":\\"";
   int pos = StringFind(json, search);
   if(pos < 0) return "";
   pos += StringLen(search);
   int endPos = StringFind(json, "\\"", pos);
   if(endPos < 0) return "";
   return StringSubstr(json, pos, endPos - pos);
}

int ExtractJsonInt(string json, string key)
{
   string search = "\\"" + key + "\\":";
   int pos = StringFind(json, search);
   if(pos < 0) return 0;
   pos += StringLen(search);
   int endPos = StringFind(json, ",", pos);
   if(endPos < 0) endPos = StringFind(json, "}", pos);
   if(endPos < 0) return 0;
   string val = StringSubstr(json, pos, endPos - pos);
   StringTrimLeft(val); StringTrimRight(val);
   if(val == "true") return 1;
   if(val == "false") return 0;
   return (int)StringToInteger(val);
}

double ExtractJsonDouble(string json, string key)
{
   string search = "\\"" + key + "\\":";
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

      //--- C. Stepped Trailing Stop
      if(InpUseTrailingStop)
      {
         if(type == POSITION_TYPE_BUY)
         {
            double profitPoints = (bid - openPrice) / point;
            if(profitPoints > InpTrailingStop)
            {
               double desiredSL = NormalizeDouble(bid - (InpTrailingStop * point), _Digits);
               if(desiredSL > currentSL + (InpTrailingStep * point) || currentSL == 0.0)
               {
                  m_trade.PositionModify(ticket, desiredSL, currentTP);
               }
            }
         }
         else if(type == POSITION_TYPE_SELL)
         {
            double profitPoints = (openPrice - ask) / point;
            if(profitPoints > InpTrailingStop)
            {
               double desiredSL = NormalizeDouble(ask + (InpTrailingStop * point), _Digits);
               if(desiredSL < currentSL - (InpTrailingStep * point) || currentSL == 0.0)
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

${generateStrategySignalMQL5(config.strategy)}

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

   // Place BUY Order
   if(buySignal)
   {
      double sl = (activeSL > 0) ? NormalizeDouble(ask - (activeSL * point), _Digits) : 0;
      double tp = (activeTP > 0) ? NormalizeDouble(ask + (activeTP * point), _Digits) : 0;
      
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
      double sl = (activeSL > 0) ? NormalizeDouble(bid + (activeSL * point), _Digits) : 0;
      double tp = (activeTP > 0) ? NormalizeDouble(bid - (activeTP * point), _Digits) : 0;
      
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
   if(!InpUseAutoCompounding || InpCompoundStepUSD <= 0)
      return g_activeLot;

   double balance = m_account.Balance();
   int steps = (int)MathFloor(balance / InpCompoundStepUSD);
   double computedLots = g_activeLot + (steps * 0.01);
   
   if(computedLots > 0.05)
      computedLots = 0.05;

   return NormalizeDouble(computedLots, 2);
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
//| Check Account Capital & Daily Loss / Profit Limits               |
//+------------------------------------------------------------------+
bool IsAccountSafeToTrade()
{
   double balance = m_account.Balance();
   double equity  = m_account.Equity();

   if(balance < InpMinAccountBalance || equity < InpMinAccountBalance)
      return false;

   datetime startOfDay = StringToTime(TimeToString(TimeCurrent(), TIME_DATE) + " 00:00:00");
   HistorySelect(startOfDay, TimeCurrent());
   
   double dailyProfit = 0.0;
   int dealsTotal = HistoryDealsTotal();
   for(int i = 0; i < dealsTotal; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket > 0)
      {
         if(HistoryDealGetString(dealTicket, DEAL_SYMBOL) == _Symbol &&
            HistoryDealGetInteger(dealTicket, DEAL_MAGIC) == InpMagicNumber)
         {
            dailyProfit += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            dailyProfit += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
            dailyProfit += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
         }
      }
   }

   if(InpDailyProfitTargetUSD > 0 && dailyProfit >= InpDailyProfitTargetUSD)
   {
      static bool targetNotified = false;
      if(!targetNotified && InpUseMobileAlerts)
      {
         SendNotification("MicroScalper: DAILY PROFIT TARGET HIT! (+$" + DoubleToString(dailyProfit, 2) + ")");
         targetNotified = true;
      }
      return false;
   }

   if(InpDailyLossLimitUSD > 0 && dailyProfit <= -InpDailyLossLimitUSD)
      return false;

   return true;
}

//+------------------------------------------------------------------+
//| Trading Hours Filter: Skip rollover spread spikes (21:00-23:00)  |
//+------------------------------------------------------------------+
bool IsInsideTradingHours()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(dt.hour < InpStartHour || dt.hour >= InpEndHour)
      return false;

   return true;
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
            m_trade.PositionClose(m_position.Ticket());
            Print("Closed position #", m_position.Ticket(), " reason: ", reason);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Anti-Revenge Consecutive Loss Cooldown Guard                     |
//+------------------------------------------------------------------+
bool IsLossCooldownActive()
{
   HistorySelect(TimeCurrent() - 86400, TimeCurrent());
   int consecutiveLosses = 0;
   datetime lastLossTime = 0;

   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0 && HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
      {
         if(HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol &&
            HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagicNumber)
         {
            double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
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
      }
   }

   if(consecutiveLosses >= InpMaxLosses && lastLossTime > 0)
   {
      int secondsElapsed = (int)(TimeCurrent() - lastLossTime);
      int cooldownSeconds = InpCooldownMinutes * 60;
      if(secondsElapsed < cooldownSeconds)
      {
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
   g_recentTicks[g_tickIndex] = TimeCurrent();
   g_tickIndex = (g_tickIndex + 1) % 5;
}

bool HasSufficientTickVelocity()
{
   datetime oldestTick = g_recentTicks[0];
   for(int i = 1; i < 5; i++)
   {
      if(g_recentTicks[i] < oldestTick && g_recentTicks[i] > 0)
         oldestTick = g_recentTicks[i];
   }

   if(oldestTick == 0)
      return true;

   return ((TimeCurrent() - oldestTick) <= 4);
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
   else if(InpUseSessionFilter && !IsInsideTradingHours())
      status = "PAUSED (SESSION HOURS)";
   else if(InpUseFridayClose && IsFridayCloseTime())
      status = "PAUSED (WEEKEND CLOSE)";
   else if(InpUseLossCooldown && IsLossCooldownActive())
      status = "PAUSED (LOSS COOLDOWN)";
   else if(spread > g_activeMaxSpread)
      status = "SPREAD FILTERED (" + IntegerToString(spread) + " pts)";

   string syncStatus = g_cloudConnected ? "CONNECTED" : (InpUseCloudSync ? "SEARCHING..." : "DISABLED");

   string hud = "========================================\\n" +
                "  MICRO SCALPER MT5 (REMOTE APP ENABLED)\\n" +
                "========================================\\n" +
                " Cloud Remote App: " + syncStatus + "\\n" +
                " Pairing Token:    " + InpPairingKey + "\\n" +
                " Active Lot Size:  " + DoubleToString(GetCalculatedLotSize(), 2) + "\\n" +
                " Scalping Targets: TP=" + IntegerToString(g_activeTP) + " SL=" + IntegerToString(g_activeSL) + " BE=" + IntegerToString(g_activeBE) + "\\n" +
                " Account Balance:  $" + DoubleToString(m_account.Balance(), 2) + "\\n" +
                " Account Equity:   $" + DoubleToString(m_account.Equity(), 2) + "\\n" +
                " Current Spread:   " + IntegerToString(spread) + " pts (Max: " + IntegerToString(g_activeMaxSpread) + ")\\n" +
                " Open Trades:      " + IntegerToString(CountOpenPositions()) + " / " + IntegerToString(InpMaxOpenTrades) + "\\n" +
                " EA Status:        " + status + "\\n" +
                "========================================";
   Comment(hud);
}
//+------------------------------------------------------------------+
`;
}

function generateStrategySignalMQL5(strategy: EAConfig['strategy']): string {
  switch (strategy) {
    case 'fast_ema':
      return `   //--- Strategy: Fast EMA Momentum Crossover + Micro Trend Filter
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
   }`;

    case 'rsi_burst':
      return `   //--- Strategy: RSI Hyper-Burst Rapid Rebound
   double rsiVal[];
   ArraySetAsSeries(rsiVal, true);

   if(CopyBuffer(h_rsi, 0, 0, 3, rsiVal) < 3)
      return;

   // RSI bounces back out of oversold zone
   if(rsiVal[1] > InpRsiOversold && rsiVal[2] <= InpRsiOversold)
   {
      buySignal = true;
   }
   // RSI falls back out of overbought zone
   else if(rsiVal[1] < InpRsiOverbought && rsiVal[2] >= InpRsiOverbought)
   {
      sellSignal = true;
   }`;

    case 'bollinger_bounce':
      return `   //--- Strategy: Bollinger Band Micro-Squeeze Reversal
   double bbUpper[], bbLower[], bbMid[];
   ArraySetAsSeries(bbUpper, true);
   ArraySetAsSeries(bbLower, true);
   ArraySetAsSeries(bbMid, true);

   MqlRates rates[];
   ArraySetAsSeries(rates, true);

   if(CopyBuffer(h_bb, 1, 0, 3, bbUpper) < 3 ||
      CopyBuffer(h_bb, 2, 0, 3, bbLower) < 3 ||
      CopyRates(_Symbol, _Period, 0, 3, rates) < 3)
      return;

   // Candle low touched/pierced lower band and closed back inside
   if(rates[1].low <= bbLower[1] && rates[1].close > bbLower[1])
   {
      buySignal = true;
   }
   // Candle high touched/pierced upper band and closed back inside
   else if(rates[1].high >= bbUpper[1] && rates[1].close < bbUpper[1])
   {
      sellSignal = true;
   }`;

    case 'pinbar_scalp':
      return `   //--- Strategy: Price Action Candle Rejection / Micro-Impulse
   MqlRates rates[];
   ArraySetAsSeries(rates, true);

   if(CopyRates(_Symbol, _Period, 0, 4, rates) < 4)
      return;

   double bodySize1 = MathAbs(rates[1].close - rates[1].open);
   double candleRange1 = rates[1].high - rates[1].low;
   double lowerWick1 = MathMin(rates[1].open, rates[1].close) - rates[1].low;
   double upperWick1 = rates[1].high - MathMax(rates[1].open, rates[1].close);

   // Bullish Pinbar: long bottom tail rejecting lower prices
   if(candleRange1 > 0 && (lowerWick1 / candleRange1) >= 0.55 && rates[1].close >= rates[1].open)
   {
      buySignal = true;
   }
   // Bearish Pinbar: long top tail rejecting higher prices
   else if(candleRange1 > 0 && (upperWick1 / candleRange1) >= 0.55 && rates[1].close <= rates[1].open)
   {
      sellSignal = true;
   }`;
  }
}
