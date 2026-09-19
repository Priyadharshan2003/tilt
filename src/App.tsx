import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification, requestPermission, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Delete, BrainCircuit, Layers, Home, BarChart2, Calendar, Award, Zap, Clock, Target, Flame, AlertTriangle, PlayCircle, Code, Terminal, Puzzle } from "lucide-react";
import "./App.css";

interface TelemetryEvent {
  id: string;
  timestamp: string;
  event_type: string;
  app_name: string;
  window_title: string;
  duration_ms: number;
}

export default function App() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showWrapped, setShowWrapped] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  
  const fetchEvents = async () => {
    try {
      const fetchedEvents: TelemetryEvent[] = await invoke("get_events");
      setEvents(fetchedEvents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  // Phase 8: Rage Analytics Notification
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  useEffect(() => {
    const checkRage = async () => {
      const now = new Date().getTime();
      if (now - lastNotificationTime < 120000) return; // 2 min cooldown

      const recentEvents = events.filter(e => {
         const evTime = new Date(e.timestamp).getTime();
         return now - evTime < 60000; // last 60 seconds
      });

      const recentBackspaceMs = recentEvents
         .filter(e => e.event_type === "destructive_keystroke")
         .reduce((acc, curr) => acc + curr.duration_ms, 0);

      if (recentBackspaceMs > 50) {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
        if (permissionGranted) {
          sendNotification({
            title: "tilt.os | Rage Analytics",
            body: "Rage typing detected. Take a breath, pilot."
          });
          setLastNotificationTime(now);
        }
      }
    };
    
    if (events.length > 0) checkRage();
  }, [events, lastNotificationTime]);

  // -- Data Processing (Phases 1-7 Logic) --
  const backspaces = events.filter(e => e.event_type === "destructive_keystroke").reduce((acc, curr) => acc + curr.duration_ms, 0);
  const actionKeys = events.filter(e => e.event_type === "action_keystroke").reduce((acc, curr) => acc + curr.duration_ms, 0);
  
  const windowSwitchEvents = events.filter(e => e.event_type === "window_switch").sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const windowSwitches = windowSwitchEvents.length;
  
  const ideApps = ["Code.exe", "idea64.exe", "rider64.exe", "devenv.exe", "WindowsTerminal.exe"];
  const terminalApps = ["WindowsTerminal.exe", "cmd.exe", "powershell.exe"];
  const distractionApps = ["Slack.exe", "Discord.exe", "Teams.exe"];
  const allIdeAndTerminalApps = [...ideApps, ...terminalApps];
  
  let ideTimeMs = 0;
  let distractionTimeMs = 0;
  let currentStreakMs = 0;
  let longestStreakMs = 0;
  let maxSwitchesInMinute = 0;
  
  if (windowSwitchEvents.length > 0) {
    for (let i = 0; i < windowSwitchEvents.length; i++) {
      let switchesInThisWindow = 1;
      const startTime = new Date(windowSwitchEvents[i].timestamp).getTime();
      
      for (let j = i + 1; j < windowSwitchEvents.length; j++) {
        const nextTime = new Date(windowSwitchEvents[j].timestamp).getTime();
        if (nextTime - startTime <= 60000) {
          switchesInThisWindow++;
        } else {
          break; // Array is sorted, break early
        }
      }
      if (switchesInThisWindow > maxSwitchesInMinute) {
        maxSwitchesInMinute = switchesInThisWindow;
      }
    }
  }

  // Calculate Most Used App (Phase 7)
  const appDurations: Record<string, number> = {};

  windowSwitchEvents.forEach(e => {
    appDurations[e.app_name] = (appDurations[e.app_name] || 0) + e.duration_ms;

    if (ideApps.includes(e.app_name)) {
      ideTimeMs += e.duration_ms;
      currentStreakMs += e.duration_ms;
      if (currentStreakMs > longestStreakMs) {
        longestStreakMs = currentStreakMs;
      }
    } else if (distractionApps.includes(e.app_name)) {
      distractionTimeMs += e.duration_ms;
      currentStreakMs = 0; 
    } else {
      if (e.duration_ms < 60000) {
        currentStreakMs += e.duration_ms;
        if (currentStreakMs > longestStreakMs) longestStreakMs = currentStreakMs;
      } else {
        currentStreakMs = 0;
      }
    }
  });

  let mostUsedApp = "None";
  let mostUsedDuration = 0;
  Object.entries(appDurations).forEach(([app, duration]) => {
    if (duration > mostUsedDuration && app !== "Unknown") {
      mostUsedDuration = duration;
      mostUsedApp = app;
    }
  });

  const ideTimeMins = Math.floor(ideTimeMs / 60000);
  const ideTimeHours = Math.floor(ideTimeMins / 60);
  const remainingMins = ideTimeMins % 60;
  const longestStreakMins = Math.floor(longestStreakMs / 60000);

  const velocityPenalty = maxSwitchesInMinute > 6 ? maxSwitchesInMinute * 10 : 0;
  const rawChaos = (windowSwitches * 2) + velocityPenalty + (backspaces * 0.1) + ((distractionTimeMs / 60000) * 5);
  const chaosScore = Math.min(100, Math.round(rawChaos));
  
  const rawFocus = 100 - chaosScore + (ideTimeMins * 2) + (longestStreakMins * 0.5);
  const focusScore = Math.max(0, Math.min(100, Math.round(rawFocus)));

  // Phase 4: Pet State Logic
  const currentHour = new Date().getHours();
  const isLateHours = currentHour >= 22 || currentHour <= 5;
  const latestApp = windowSwitchEvents.length > 0 ? windowSwitchEvents[windowSwitchEvents.length - 1].app_name : "";
  const isTerminalOrIde = allIdeAndTerminalApps.includes(latestApp);

  let blobClass = "blob-zen";
  let status = "Focused Builder";
  let insight = "Unbroken flow. You are operating at peak efficiency.";
  let statusColor = "text-[#2DD4BF]";
  let greeting = "All systems nominal. Ready to build.";
  let glowColor = "bg-[#2DD4BF]";
  
  if (chaosScore > 85 && isTerminalOrIde) {
    blobClass = "blob-fire";
    status = "Production Fire";
    insight = "High chaos in terminal/IDE detected. Stay calm and read the logs.";
    statusColor = "text-[#F97316]"; // Orange
    greeting = "Critical situation detected. Take a breath and focus on the root cause.";
    glowColor = "bg-[#F97316]";
  } else if (chaosScore > 85) {
    blobClass = "blob-chaos";
    status = "Nuclear Meltdown";
    insight = "Critical context switching velocity detected. Step away from the keyboard.";
    statusColor = "text-[#EF4444]";
    greeting = "Cognitive overload. Please take a 5 minute break from the screen.";
    glowColor = "bg-[#EF4444]";
  } else if (isLateHours && actionKeys > 10) { 
    blobClass = "blob-deadline";
    status = "Deadline Mode";
    insight = "Late night hyper-focus. Don't forget to hydrate.";
    statusColor = "text-[#A855F7]"; // Purple
    greeting = "Burning the midnight oil. I'm right here with you.";
    glowColor = "bg-[#A855F7]";
  } else if (chaosScore > 50) {
    blobClass = "blob-busy";
    status = "Chaos Coordinator";
    insight = "High fragmentation. You are bouncing between tasks rapidly.";
    statusColor = "text-[#FB923C]";
    greeting = "Try to close some tabs and focus on one task at a time.";
    glowColor = "bg-[#FB923C]";
  }

  // Phase 5: Digital Twin Archetype Logic
  let archetype = "The Execution Machine";
  let archetypeDesc = "High output, high focus. You ship code fast and rarely backtrack.";
  let archetypeColor = "from-[#2DD4BF] to-[#047857]"; // Teal/Green
  
  if (backspaces > actionKeys * 0.4) {
    archetype = "The Refactorer";
    archetypeDesc = "You measure twice and cut once. High volume of rewrites and deletes.";
    archetypeColor = "from-[#A855F7] to-[#4C1D95]"; // Purple
  } else if (windowSwitches > 100) {
    archetype = "The Explorer";
    archetypeDesc = "High context switching. You spend most of your time reading docs or debugging.";
    archetypeColor = "from-[#FB923C] to-[#9A3412]"; // Orange
  }

  // Phase 6: Timeline Logic
  const timelineBlocks: any[] = [];
  let currentBlock: any = null;

  windowSwitchEvents.forEach((e) => {
    if (!currentBlock) {
      currentBlock = {
        app_name: e.app_name,
        window_title: e.window_title,
        start_time: e.timestamp,
        end_time: e.timestamp,
        duration_ms: e.duration_ms,
        milestone: null
      };
    } else {
      const timeDiff = new Date(e.timestamp).getTime() - new Date(currentBlock.end_time).getTime();
      // Group if same app and within 5 mins
      if (e.app_name === currentBlock.app_name && timeDiff < 5 * 60 * 1000) {
        currentBlock.end_time = e.timestamp;
        currentBlock.duration_ms += e.duration_ms;
        currentBlock.window_title = e.window_title; // Keep the latest title
      } else {
        timelineBlocks.push({...currentBlock});
        currentBlock = {
          app_name: e.app_name,
          window_title: e.window_title,
          start_time: e.timestamp,
          end_time: e.timestamp,
          duration_ms: e.duration_ms,
          milestone: null
        };
      }
    }
  });
  if (currentBlock) timelineBlocks.push(currentBlock);

  if (timelineBlocks.length > 0) {
     const longestIdeBlock = [...timelineBlocks].sort((a, b) => b.duration_ms - a.duration_ms).find(b => ideApps.includes(b.app_name));
     if (longestIdeBlock && longestIdeBlock.duration_ms > 60000) {
       longestIdeBlock.milestone = "🔥 Longest Focus Streak";
     }
     
     const longestDistraction = [...timelineBlocks].sort((a, b) => b.duration_ms - a.duration_ms).find(b => distractionApps.includes(b.app_name));
     if (longestDistraction && longestDistraction.duration_ms > 60000) {
       longestDistraction.milestone = "⚠️ Chaos Meltdown";
     }
  }

  const getAppIcon = (appName: string) => {
    if (ideApps.includes(appName)) return <BrainCircuit size={14} className="text-[#2DD4BF]"/>;
    if (terminalApps.includes(appName)) return <Zap size={14} className="text-[#F97316]"/>;
    if (distractionApps.includes(appName)) return <AlertTriangle size={14} className="text-[#EF4444]"/>;
    return <Layers size={14} className="text-white/40"/>;
  };
  
  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const chartData = useMemo(() => {
     return Array.from({ length: 20 }).map((_, i) => ({
       time: i,
       focus: i === 19 ? focusScore : Math.max(10, Math.min(90, focusScore + (Math.random() * 30 - 15)))
     }));
  }, [focusScore]);

  // Phase 9: Heatmap Data
  const focusHeatmapData = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      if (i === 29) return { day: i, score: focusScore }; // Today
      return { day: i, score: Math.floor(Math.random() * 100) }; // Mock history
    });
  }, [focusScore]);

  return (
    <div className={`w-full min-h-screen p-4 md:p-8 flex items-center justify-center relative pb-24 overflow-hidden transition-all duration-1000 ${isProMode ? 'bg-black' : chaosScore > 85 && !isTerminalOrIde ? 'nuclear-border' : ''}`}>
      {/* Dynamic Background Glow based on Pet State */}
      {!isProMode && <div className={`fixed inset-0 opacity-10 blur-[150px] pointer-events-none transition-colors duration-1000 ${glowColor}`}></div>}

      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min z-10"
          >
            {/* HERO MASCOT CARD / PRO MODE (col-span-8) */}
            <motion.div layoutId="hero" className={`col-span-1 md:col-span-8 rounded-[2rem] overflow-hidden relative group ${isProMode ? 'bg-black border border-[#2DD4BF]/30 font-mono text-[#2DD4BF] p-6 shadow-[0_0_30px_rgba(45,212,191,0.1)]' : 'glass-panel p-10 flex flex-col justify-between'}`}>
              
              {isProMode ? (
                // PRO MODE UI
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center border-b border-[#2DD4BF]/30 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Terminal size={18} />
                      <span className="font-bold tracking-widest uppercase">tilt.os // terminal mode</span>
                    </div>
                    <div className="text-[10px] animate-pulse uppercase">LIVE DATA FEED</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#2DD4BF]/5 p-4 rounded border border-[#2DD4BF]/20">
                      <div className="text-[10px] opacity-70 mb-1">SYSTEM STATE</div>
                      <div className="text-xl font-bold">{status.toUpperCase()}</div>
                    </div>
                    <div className="bg-[#2DD4BF]/5 p-4 rounded border border-[#2DD4BF]/20">
                      <div className="text-[10px] opacity-70 mb-1">METRICS</div>
                      <div className="text-sm">FOCUS: {focusScore} | CHAOS: {chaosScore}</div>
                      <div className="text-sm">SWITCHES: {windowSwitches} | APM (Destructive): {backspaces}</div>
                    </div>
                  </div>

                  <div className="text-[10px] opacity-70 mb-2">RAW TELEMETRY EVENT LOG (LAST 8)</div>
                  <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar opacity-90">
                    {events.slice(0, 8).map((e, i) => (
                      <div key={i} className="text-[10px] truncate hover:bg-[#2DD4BF]/20 px-2 py-1 rounded transition-colors cursor-crosshair">
                        <span className="opacity-50">[{new Date(e.timestamp).toISOString().split('T')[1].replace('Z', '')}]</span> 
                        {' '} <span className="font-bold">{e.event_type}</span> 
                        {' '} <span className="opacity-70">pid:{e.app_name}</span> 
                        {' '} duration:{e.duration_ms}ms
                      </div>
                    ))}
                    {events.length === 0 && <div className="text-[10px] opacity-50 italic">Awaiting telemetry packets...</div>}
                  </div>
                </div>
              ) : (
                // NORMAL BLOB UI
                <>
                  <div className="z-10 flex justify-between items-start">
                    <div className="max-w-[60%]">
                      <h2 className="text-white/40 font-semibold tracking-[0.2em] text-xs uppercase mb-3 flex items-center gap-2">
                        Developer Status 
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${glowColor}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${glowColor}`}></span>
                        </span>
                      </h2>
                      <h1 className={`text-4xl font-bold tracking-tight mb-2 ${statusColor}`}>
                        {status}
                      </h1>
                      <p className="text-white/70 font-medium leading-relaxed mt-4">
                        {insight}
                      </p>
                    </div>
                    
                    <div className="relative w-40 h-40 flex items-center justify-center mr-4 cursor-pointer">
                      <div className="absolute -top-12 -left-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-2xl">
                        <p className="text-xs text-white/90 font-medium leading-snug">{greeting}</p>
                        <div className="absolute -bottom-2 right-12 w-4 h-4 bg-black/60 border-b border-r border-white/10 transform rotate-45"></div>
                      </div>

                      <div className={`absolute w-32 h-32 opacity-80 transition-all duration-700 ${blobClass}`}></div>
                      <div className="z-10 text-white/90 text-2xl font-bold font-mono mix-blend-overlay flex flex-col items-center">
                        DNA
                      </div>
                    </div>
                  </div>

                  <div className="z-10 mt-12 flex gap-12 border-t border-white/5 pt-8">
                    <div>
                      <div className="text-6xl font-black text-white tracking-tighter">
                        {focusScore}
                      </div>
                      <div className="text-[#2DD4BF] font-semibold text-xs mt-2 tracking-[0.15em] uppercase">Focus Score</div>
                    </div>
                    <div>
                      <div className="text-6xl font-black text-white/80 tracking-tighter">
                        {chaosScore}
                      </div>
                      <div className="text-[#EF4444] font-semibold text-xs mt-2 tracking-[0.15em] uppercase">Chaos Score</div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* TREND CHART (col-span-4) */}
            <motion.div className={`${isProMode ? 'hidden' : 'glass-panel'} col-span-1 md:col-span-4 rounded-[2rem] p-6 flex flex-col h-full min-h-[320px]`}>
               <div className="flex items-center gap-3 text-white/60 mb-6">
                 <Activity size={18} />
                 <span className="font-semibold text-xs uppercase tracking-[0.15em]">Focus Pulse</span>
               </div>
               <div className="flex-1 w-full -ml-4 mt-2 relative">
                 <svg width="0" height="0">
                   <defs>
                     <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#2DD4BF" stopOpacity={1}/>
                       <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0.2}/>
                     </linearGradient>
                   </defs>
                 </svg>
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData}>
                     <Tooltip 
                       contentStyle={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                       itemStyle={{ color: '#fff' }}
                       labelStyle={{ display: 'none' }}
                     />
                     <Line type="monotone" dataKey="focus" stroke="url(#focusGradient)" strokeWidth={4} dot={false} animationDuration={800} animationEasing="ease-in-out" />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </motion.div>

            {/* METRICS BENTO (col-span-12) */}
            <div className={`col-span-1 md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6 ${isProMode ? 'hidden' : ''}`}>
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between gap-4 group hover:bg-white/[0.02] transition-colors">
                <div className="flex justify-between items-center text-white/40">
                  <span className="text-xs uppercase tracking-widest font-semibold">IDE Time</span>
                  <BrainCircuit size={20} className="text-[#2DD4BF]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{ideTimeHours}<span className="text-xl text-white/50">h</span> {remainingMins}<span className="text-xl text-white/50">m</span></div>
                  <div className="text-xs text-[#10B981] mt-1">Focused Building</div>
                </div>
              </div>
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between gap-4 group hover:bg-white/[0.02] transition-colors">
                <div className="flex justify-between items-center text-white/40">
                  <span className="text-xs uppercase tracking-widest font-semibold">Context Switches</span>
                  <Layers size={20} className="text-[#FB923C]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{windowSwitches}</div>
                  <div className="text-xs text-white/40 mt-1">App transitions recorded</div>
                </div>
              </div>
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between gap-4 group hover:bg-white/[0.02] transition-colors">
                <div className="flex justify-between items-center text-white/40">
                  <span className="text-xs uppercase tracking-widest font-semibold">Action Keys</span>
                  <Zap size={20} className="text-[#2DD4BF]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{actionKeys}</div>
                  <div className="text-xs text-white/40 mt-1">Productive keystrokes</div>
                </div>
              </div>
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between gap-4 group hover:bg-white/[0.02] transition-colors">
                <div className="flex justify-between items-center text-white/40">
                  <span className="text-xs uppercase tracking-widest font-semibold">Destructive Keys</span>
                  <Delete size={20} className="text-[#EF4444]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{backspaces}</div>
                  <div className="text-xs text-white/40 mt-1">Backspaces & Deletes</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div 
            key="insights"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="w-full max-w-4xl flex flex-col gap-6 z-10"
          >
            <div className="glass-panel rounded-[2rem] p-10 flex flex-col gap-8">
              <div className="flex items-center gap-4 text-[#2DD4BF]">
                <Target size={32} />
                <h1 className="text-3xl font-bold text-white tracking-tight">Focus & Chaos Insights</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-3 text-white/50 mb-4">
                    <Flame size={20} className="text-[#FB923C]"/>
                    <span className="text-sm font-semibold uppercase tracking-widest">Longest Streak</span>
                  </div>
                  <div className="text-4xl font-black text-white">{longestStreakMins} <span className="text-xl text-white/50">min</span></div>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed">
                    Uninterrupted time spent in your IDE without distraction apps.
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-3 text-white/50 mb-4">
                    <Clock size={20} className="text-[#EF4444]"/>
                    <span className="text-sm font-semibold uppercase tracking-widest">Distraction Cost</span>
                  </div>
                  <div className="text-4xl font-black text-white">{Math.floor(distractionTimeMs / 60000)} <span className="text-xl text-white/50">min</span></div>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed">
                    Total time lost to Slack, Discord, or Teams today. 
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                  {maxSwitchesInMinute > 6 && (
                     <div className="absolute inset-0 bg-[#EF4444]/10 animate-pulse pointer-events-none"></div>
                  )}
                  <div className="flex items-center gap-3 text-white/50 mb-4 relative z-10">
                    <AlertTriangle size={20} className={maxSwitchesInMinute > 6 ? "text-[#EF4444]" : "text-white/40"}/>
                    <span className="text-sm font-semibold uppercase tracking-widest">Peak Velocity</span>
                  </div>
                  <div className="text-4xl font-black text-white relative z-10">{maxSwitchesInMinute} <span className="text-xl text-white/50">switches</span></div>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed relative z-10">
                    Your highest rate of app switching in a single 60-second window. {maxSwitchesInMinute > 6 ? "Critical meltdown." : "Healthy flow."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white/40 text-xs uppercase font-bold tracking-wider mb-2">AI Analysis</h3>
                    <p className="text-sm text-white/90 font-medium leading-relaxed italic mb-4">
                      "Your chaos score spiked to {chaosScore}. The data shows you switched windows {maxSwitchesInMinute} times in a single minute. This usually indicates unclear task boundaries or searching frantically for a solution. Step away and formulate a plan."
                    </p>
                  </div>
                  
                  {/* Wrapped Button */}
                  <button 
                    onClick={() => setShowWrapped(true)}
                    className="self-start bg-gradient-to-r from-[#FF0055] via-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                  >
                    <PlayCircle size={16} /> Generate Wrapped
                  </button>
                </div>

                {/* Phase 9: Heatmap */}
                <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col">
                  <h3 className="text-white/40 text-xs uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={14} /> 30-Day Focus Heatmap
                  </h3>
                  <div className="flex gap-2 flex-wrap items-end h-full">
                    {focusHeatmapData.map((d, i) => (
                      <div 
                        key={i} 
                        className={`w-5 h-5 rounded-[4px] border border-white/5 transition-all ${
                          d.score > 80 ? 'bg-[#2DD4BF] shadow-[0_0_10px_rgba(45,212,191,0.5)]' :
                          d.score > 50 ? 'bg-[#2DD4BF]/60' :
                          d.score > 20 ? 'bg-[#2DD4BF]/30' :
                          'bg-white/5'
                        } ${i === 29 ? 'border-[#2DD4BF] animate-pulse' : ''}`}
                        title={`Day ${30 - i} days ago: Score ${d.score}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white/40 mt-4 font-bold uppercase tracking-widest">
                    <span>Low Focus</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-white/5 rounded-sm"></div>
                      <div className="w-3 h-3 bg-[#2DD4BF]/30 rounded-sm"></div>
                      <div className="w-3 h-3 bg-[#2DD4BF]/60 rounded-sm"></div>
                      <div className="w-3 h-3 bg-[#2DD4BF] rounded-sm"></div>
                    </div>
                    <span>High Focus</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 5: Digital Twin / Achievements Tab */}
        {activeTab === 'achievements' && (
          <motion.div 
            key="achievements"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="w-full flex items-center justify-center flex-col gap-8 z-10 perspective-1000"
          >
            <div className="flex flex-col items-center mb-4 text-center">
               <h1 className="text-3xl font-bold text-white tracking-tight">Your Digital Twin</h1>
               <p className="text-white/50 mt-2 max-w-md">Your work personality synthesized from telemetry data.</p>
            </div>

            <motion.div 
              className="holo-card w-[400px] h-[550px] p-8 flex flex-col justify-between"
              whileHover={{ rotateX: 10, rotateY: -10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="holo-overlay"></div>
              
              {/* Header */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2 text-white/50 font-bold uppercase tracking-widest text-xs">
                  <Award size={16} /> Archetype
                </div>
                <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg">
                  Level {Math.max(1, Math.floor(actionKeys / 100))}
                </div>
              </div>

              {/* Character Blob inside card */}
              <div className="flex-1 flex flex-col items-center justify-center z-10 relative mt-8">
                <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${archetypeColor} blur-3xl absolute opacity-60`}></div>
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${archetypeColor} animate-pulse relative z-10 shadow-2xl flex items-center justify-center border-2 border-white/40`}>
                   <span className="text-3xl font-black text-white mix-blend-overlay">DNA</span>
                </div>
                
                <h2 className="text-3xl font-black text-white mt-12 text-center leading-none tracking-tight">
                  {archetype}
                </h2>
                <p className="text-white/70 text-center mt-4 text-sm px-4 leading-relaxed font-medium">
                  {archetypeDesc}
                </p>
              </div>

              {/* Stats footer */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 z-10">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-white">{Math.round((backspaces / Math.max(1, actionKeys)) * 100) || 0}%</div>
                   <div className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Refactor Rate</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-white">{windowSwitches}</div>
                   <div className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Context Vol.</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-white">{focusScore}</div>
                   <div className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Peak Focus</div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Phase 6: Timeline Tab */}
        {activeTab === 'timeline' && (
          <motion.div 
            key="timeline"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="w-full max-w-3xl flex flex-col gap-6 z-10"
          >
            <div className="glass-panel rounded-[2rem] p-10 flex flex-col h-[75vh]">
              <div className="flex items-center gap-4 text-white mb-8">
                <Calendar size={32} />
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Timeline Replay</h1>
                  <p className="text-white/40 text-sm mt-1">Git history for your life.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
                <div className="relative border-l border-white/10 ml-4 space-y-6 pb-12">
                  {timelineBlocks.map((block, i) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute -left-[13px] top-1 bg-[#09090B] p-[6px] rounded-full border border-white/10 z-10">
                        {getAppIcon(block.app_name)}
                      </div>
                      
                      <div className="flex justify-between items-start mb-1 pt-1">
                        <div className="text-sm font-semibold text-white/90">{block.app_name}</div>
                        <div className="text-xs text-white/40 font-mono">{formatTime(block.start_time)}</div>
                      </div>
                      
                      <div className="text-xs text-white/50 truncate max-w-[90%] mb-2">
                        {block.window_title || "Unknown Window"}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-white/60 bg-white/5 px-2 py-1 rounded-md tracking-wider">
                          {Math.max(1, Math.round(block.duration_ms / 60000))} MIN
                        </span>
                        
                        {block.milestone && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${
                            block.milestone.includes('Chaos') ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                          }`}>
                            {block.milestone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {timelineBlocks.length === 0 && (
                    <div className="pl-8 text-white/40 text-sm italic">
                      No activity recorded yet. Start working to see your timeline.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 10: Plugins Tab */}
        {activeTab === 'plugins' && (
          <motion.div 
            key="plugins"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="w-full max-w-4xl flex flex-col gap-6 z-10"
          >
            <div className="glass-panel rounded-[2rem] p-10 flex flex-col h-[75vh]">
              <div className="flex items-center gap-4 text-[#2DD4BF] mb-8">
                <Puzzle size={32} />
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Plugin Ecosystem</h1>
                  <p className="text-white/40 text-sm mt-1">Connect your digital DNA to the real world.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-4 no-scrollbar">
                
                {/* Slack Plugin */}
                <div className="bg-black/40 rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-[#2DD4BF]/50 transition-colors">
                  {focusScore > 80 && <div className="absolute inset-0 bg-[#2DD4BF]/10 animate-pulse pointer-events-none"></div>}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl font-black text-white">S</div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${focusScore > 80 ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border-[#2DD4BF]/50' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      {focusScore > 80 ? 'ACTIVE' : 'STANDBY'}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Slack Auto-DND</h3>
                  <p className="text-white/50 text-sm mb-4">Automatically pauses notifications when your Focus Score exceeds 80.</p>
                  <div className="w-full bg-white/5 rounded-lg p-1 flex">
                     <div className="w-1/2 bg-white/10 text-white text-xs font-bold py-2 rounded-md text-center">Connected</div>
                  </div>
                </div>

                {/* Spotify Plugin */}
                <div className="bg-black/40 rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-[#A855F7]/50 transition-colors">
                  {status === 'Deadline Mode' && <div className="absolute inset-0 bg-[#A855F7]/10 animate-pulse pointer-events-none"></div>}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.69 14.44a.62.62 0 01-.86.2c-2.35-1.44-5.32-1.77-8.81-.97a.62.62 0 11-.29-1.21c3.81-.88 7.12-.51 9.76 1.12.31.2.4.61.2 .86zm1.25-2.79a.78.78 0 01-1.08.26c-2.69-1.65-6.8-2.15-9.84-1.18a.78.78 0 11-.47-1.49c3.5-1.12 8.04-.55 11.13 1.34.37.23.49.73.26 1.07zm.1-2.92c-3.23-1.91-8.54-2.09-11.63-1.16a.94.94 0 01-1.18-.58.94.94 0 01.58-1.18c3.56-1.07 9.42-.86 13.16 1.35a.94.94 0 01-1 1.62l.07-.05z"></path></svg>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${status === 'Deadline Mode' ? 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      {status === 'Deadline Mode' ? 'ACTIVE' : 'STANDBY'}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Spotify Flow State</h3>
                  <p className="text-white/50 text-sm mb-4">Plays your "Deep Focus" playlist when Deadline Mode is triggered.</p>
                  <div className="w-full bg-white/5 rounded-lg p-1 flex">
                     <div className="w-1/2 bg-white/10 text-white text-xs font-bold py-2 rounded-md text-center">Connected</div>
                  </div>
                </div>

                {/* Hue Plugin */}
                <div className="bg-black/40 rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-[#EF4444]/50 transition-colors">
                  {chaosScore > 85 && <div className="absolute inset-0 bg-[#EF4444]/10 animate-pulse pointer-events-none"></div>}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl font-black text-white">💡</div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${chaosScore > 85 ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      {chaosScore > 85 ? 'ACTIVE' : 'STANDBY'}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Philips Hue Sync</h3>
                  <p className="text-white/50 text-sm mb-4">Turns your room lights Crimson Red during a Chaos Meltdown.</p>
                  <div className="w-full bg-white/5 rounded-lg p-1 flex">
                     <div className="w-1/2 bg-white/10 text-white text-xs font-bold py-2 rounded-md text-center">Connected</div>
                  </div>
                </div>

                {/* GitHub Plugin */}
                <div className="bg-black/40 rounded-2xl p-6 border border-white/10 relative overflow-hidden opacity-50 cursor-not-allowed">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl font-black text-white">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-white/5 text-white/40 border-white/10">
                      COMING SOON
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">GitHub Sync</h3>
                  <p className="text-white/50 text-sm mb-4">Syncs your Archetype and Focus heatmaps directly to your GitHub readme.</p>
                  <div className="w-full bg-white/5 rounded-lg p-1 flex">
                     <div className="w-full text-white/40 text-xs font-bold py-2 rounded-md text-center border border-dashed border-white/20">Connect Account</div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 7: WRAPPED OVERLAY MODAL */}
      <AnimatePresence>
        {showWrapped && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
          >
            <div className="relative w-full max-w-[400px] h-[750px] bg-vibrant-coder rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
              <button 
                onClick={() => setShowWrapped(false)}
                className="absolute top-6 right-6 bg-black/20 hover:bg-black/40 text-white w-8 h-8 rounded-full backdrop-blur-md transition-colors z-20 flex items-center justify-center font-bold"
              >
                ✕
              </button>
              
              {/* Overlay Pattern */}
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none"></div>
              
              <div className="z-10 mt-8">
                <h3 className="text-white/80 font-bold uppercase tracking-[0.3em] text-[10px] mb-2 drop-shadow-md">tilt.os • {new Date().getFullYear()}</h3>
                <h2 className="text-[3rem] font-black text-white leading-[1.1] tracking-tighter drop-shadow-2xl">
                  Session<br/>Wrapped
                </h2>
              </div>
              
              <div className="z-10 flex flex-col gap-4 mt-8">
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg"
                >
                  <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Top Application</div>
                  <div className="text-3xl font-black text-white truncate drop-shadow-lg">{mostUsedApp.replace('.exe', '')}</div>
                  <div className="text-white/90 text-xs mt-2 font-medium bg-white/10 inline-block px-2 py-1 rounded-md">{Math.floor(mostUsedDuration / 60000)} minutes</div>
                </motion.div>
                
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg flex justify-between items-center"
                >
                  <div>
                    <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Longest Streak</div>
                    <div className="text-white/80 text-xs font-medium">Unbroken deep focus</div>
                  </div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">{longestStreakMins}m</div>
                </motion.div>

                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg"
                >
                  <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Archetype Assigned</div>
                  <div className="text-2xl font-black text-white leading-none mt-2 drop-shadow-lg">{archetype}</div>
                </motion.div>
              </div>

              <div className="z-10 mt-12 flex justify-between items-end">
                <div className="text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="font-bold text-sm tracking-tight">tilt.os</div>
                </div>
                <button className="bg-white hover:bg-white/90 text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl">
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING COMMAND DOCK */}
      <motion.div 
        className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel px-4 py-3 rounded-full flex items-center gap-2 z-50 shadow-2xl shadow-black/50 border border-white/10"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <DockButton icon={<Home size={20} />} label="Home" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsProMode(false); }} />
        <DockButton icon={<BarChart2 size={20} />} label="Insights" active={activeTab === 'insights'} onClick={() => { setActiveTab('insights'); setIsProMode(false); }} />
        <DockButton icon={<Calendar size={20} />} label="Timeline" active={activeTab === 'timeline'} onClick={() => { setActiveTab('timeline'); setIsProMode(false); }} />
        <DockButton icon={<Award size={20} />} label="Achievements" active={activeTab === 'achievements'} onClick={() => { setActiveTab('achievements'); setIsProMode(false); }} />
        <DockButton icon={<Puzzle size={20} />} label="Plugins" active={activeTab === 'plugins'} onClick={() => { setActiveTab('plugins'); setIsProMode(false); }} />
        
        {/* Phase 9: Pro Mode Toggle */}
        <div className="w-[1px] h-6 bg-white/20 mx-2"></div>
        <button 
          onClick={() => { setActiveTab('home'); setIsProMode(!isProMode); }}
          className={`relative p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
            isProMode ? 'text-[#2DD4BF] bg-[#2DD4BF]/20 shadow-[0_0_15px_rgba(45,212,191,0.5)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
          title="Toggle Terminal Pro Mode"
        >
          <Code size={20} />
        </button>
      </motion.div>
    </div>
  );
}

function DockButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
        active ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
      }`}
      title={label}
    >
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute inset-0 bg-white/10 rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
    </button>
  );
}
