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
    <div className={`flex w-full h-screen overflow-hidden bg-[#09090B] transition-colors duration-1000 ${isProMode ? 'bg-black' : chaosScore > 85 && !isTerminalOrIde ? 'nuclear-border' : ''}`}>
      {/* Dynamic Background Glow */}
      {!isProMode && <div className={`fixed inset-0 opacity-[0.03] blur-[150px] pointer-events-none transition-colors duration-1000 ${glowColor}`}></div>}

      {/* DESKTOP SIDEBAR NAVIGATION (Replacing Mobile Dock) */}
      <aside data-tauri-drag-region className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col pt-12 pb-6 px-4 z-50">
        <div className="mb-10 px-4 flex items-center gap-3">
          <img src="/src-tauri/icons/128x128.png" className="w-8 h-8 opacity-80" alt="Logo" />
          <h1 className="text-white/90 font-bold tracking-tight text-lg">tilt.os</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarButton icon={<Home size={18} />} label="Dashboard" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsProMode(false); }} />
          <SidebarButton icon={<BarChart2 size={18} />} label="Analytics" active={activeTab === 'insights'} onClick={() => { setActiveTab('insights'); setIsProMode(false); }} />
          <SidebarButton icon={<Calendar size={18} />} label="Timeline" active={activeTab === 'timeline'} onClick={() => { setActiveTab('timeline'); setIsProMode(false); }} />
          <SidebarButton icon={<Award size={18} />} label="Archetype" active={activeTab === 'achievements'} onClick={() => { setActiveTab('achievements'); setIsProMode(false); }} />
          <SidebarButton icon={<Puzzle size={18} />} label="Plugins" active={activeTab === 'plugins'} onClick={() => { setActiveTab('plugins'); setIsProMode(false); }} />
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('home'); setIsProMode(!isProMode); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isProMode ? 'bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <Code size={18} />
            Terminal Pro
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar">
        <div className="w-full max-w-[1400px] mx-auto p-8 lg:p-12 pb-24">
          
          <AnimatePresence mode="wait">
            
            {/* --- DASHBOARD PAGE --- */}
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-6"
              >
                {/* TOP ROW: Hero & Pet + Pulse Chart */}
                <div className="grid grid-cols-12 gap-6 max-h-[340px]">
                  
                  {/* Hero Status Card */}
                  <motion.div className={`col-span-8 rounded-[24px] overflow-hidden relative group ${isProMode ? 'bg-black border border-[#2DD4BF]/30 p-6' : 'glass-panel p-8 flex flex-col justify-between'}`}>
                    {isProMode ? (
                      // PRO MODE UI
                      <div className="h-full flex flex-col text-[#2DD4BF] font-mono">
                        <div className="flex justify-between items-center border-b border-[#2DD4BF]/30 pb-4 mb-4">
                          <div className="flex items-center gap-2 text-caption">
                            <Terminal size={16} /> tilt.os // terminal mode
                          </div>
                          <div className="text-[10px] animate-pulse">LIVE DATA FEED</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-[#2DD4BF]/5 p-4 rounded border border-[#2DD4BF]/20">
                            <div className="text-[10px] opacity-70 mb-1">SYSTEM STATE</div>
                            <div className="text-h3">{status.toUpperCase()}</div>
                          </div>
                          <div className="bg-[#2DD4BF]/5 p-4 rounded border border-[#2DD4BF]/20">
                            <div className="text-[10px] opacity-70 mb-1">METRICS</div>
                            <div className="text-body">FOCUS: {focusScore} | CHAOS: {chaosScore}</div>
                          </div>
                        </div>
                        <div className="text-[10px] opacity-70 mb-2">RAW TELEMETRY EVENT LOG (LAST 6)</div>
                        <div className="flex-1 overflow-hidden space-y-1 opacity-90 text-[10px]">
                          {events.slice(0, 6).map((e, i) => (
                            <div key={i} className="truncate hover:bg-[#2DD4BF]/20 px-2 py-1 rounded">
                              <span className="opacity-50">[{new Date(e.timestamp).toISOString().split('T')[1].replace('Z', '')}]</span> 
                              {' '} <span className="font-bold">{e.event_type}</span> 
                              {' '} <span className="opacity-70">pid:{e.app_name}</span> 
                              {' '} duration:{e.duration_ms}ms
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // NORMAL BLOB UI (Desktop Layout)
                      <div className="flex justify-between h-full relative">
                        {/* Left: Text & Scores */}
                        <div className="flex flex-col justify-between w-2/3">
                          <div>
                            <h2 className="text-caption text-white/40 mb-3 flex items-center gap-2">
                              Developer Status 
                              <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${glowColor}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${glowColor}`}></span>
                              </span>
                            </h2>
                            <h1 className={`text-h1 ${statusColor}`}>{status}</h1>
                            <p className="text-body text-white/60 mt-3 max-w-[80%]">{insight}</p>
                          </div>
                          
                          <div className="flex gap-12 border-t border-white/5 pt-6 mt-4">
                            <div>
                              <div className="text-display text-white">{focusScore}</div>
                              <div className="text-caption text-[#2DD4BF] mt-1">Focus Score</div>
                            </div>
                            <div>
                              <div className="text-display text-white/80">{chaosScore}</div>
                              <div className="text-caption text-[#EF4444] mt-1">Chaos Score</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: The Pet isolated in its own visual quadrant */}
                        <div className="w-1/3 flex items-center justify-center relative cursor-help">
                          <div className="absolute -top-6 -left-16 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-2xl pointer-events-none">
                            <p className="text-xs text-white/90">{greeting}</p>
                          </div>
                          <div className={`absolute w-40 h-40 opacity-90 transition-all duration-700 ${blobClass}`}></div>
                          <div className="z-10 text-white/90 text-h2 font-mono mix-blend-overlay">DNA</div>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Focus Pulse Chart */}
                  <motion.div className={`${isProMode ? 'hidden' : 'glass-panel'} col-span-4 rounded-[24px] p-6 flex flex-col max-h-[340px]`}>
                    <div className="flex justify-between items-center mb-6">
                       <div className="text-caption text-white/60 flex items-center gap-2">
                         <Activity size={16} /> Focus Pulse
                       </div>
                    </div>
                    <div className="flex-1 w-full -ml-4 relative">
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
                            contentStyle={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', backdropFilter: 'blur(10px)', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ display: 'none' }}
                          />
                          <Line type="monotone" dataKey="focus" stroke="url(#focusGradient)" strokeWidth={3} dot={false} animationDuration={800} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* BOTTOM ROW: Metrics Array (Strict 140px height max) */}
                <div className={`grid grid-cols-12 gap-6 ${isProMode ? 'hidden' : ''}`}>
                  <MetricCard icon={<BrainCircuit size={18} className="text-[#2DD4BF]"/>} title="IDE Time" value={`${ideTimeHours}h ${remainingMins}m`} subtitle="Focused Building" />
                  <MetricCard icon={<Layers size={18} className="text-[#FB923C]"/>} title="Context Switches" value={windowSwitches} subtitle="App transitions" />
                  <MetricCard icon={<Zap size={18} className="text-[#2DD4BF]"/>} title="Action Keys" value={actionKeys} subtitle="Productive keystrokes" />
                  <MetricCard icon={<Delete size={18} className="text-[#EF4444]"/>} title="Destructive Keys" value={backspaces} subtitle="Backspaces & Deletes" />
                </div>
              </motion.div>
            )}

            {/* --- ANALYTICS PAGE --- */}
            {activeTab === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <Target size={24} className="text-[#2DD4BF]" />
                  <h1 className="text-h2 text-white">Focus Analytics</h1>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-4 bg-white/5 rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 text-white/50 mb-4 text-caption"><Flame size={16} className="text-[#FB923C]"/> Longest Streak</div>
                    <div className="text-h1 text-white">{longestStreakMins} <span className="text-body text-white/50">min</span></div>
                  </div>
                  
                  <div className="col-span-4 bg-white/5 rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 text-white/50 mb-4 text-caption"><Clock size={16} className="text-[#EF4444]"/> Distraction Cost</div>
                    <div className="text-h1 text-white">{Math.floor(distractionTimeMs / 60000)} <span className="text-body text-white/50">min</span></div>
                  </div>

                  <div className="col-span-4 bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                    {maxSwitchesInMinute > 6 && <div className="absolute inset-0 bg-[#EF4444]/10 animate-pulse pointer-events-none"></div>}
                    <div className="flex items-center gap-3 text-white/50 mb-4 text-caption relative z-10"><AlertTriangle size={16} className={maxSwitchesInMinute > 6 ? "text-[#EF4444]" : "text-white/40"}/> Peak Velocity</div>
                    <div className="text-h1 text-white relative z-10">{maxSwitchesInMinute} <span className="text-body text-white/50">switches/min</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* GitHub Style Heatmap */}
                  <div className="col-span-8 glass-panel rounded-2xl p-6 h-[260px] flex flex-col">
                    <div className="text-caption text-white/40 mb-4 flex items-center gap-2">
                      <Calendar size={14} /> 30-Day Contribution Graph
                    </div>
                    {/* Fixed grid for heatmap */}
                    <div className="flex-1 overflow-hidden flex flex-col justify-center pb-4">
                      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[6px]">
                        {focusHeatmapData.slice(0, 30).map((d, i) => (
                          <div 
                            key={i} 
                            className={`w-full aspect-square rounded-[3px] border border-white/5 transition-colors ${
                              d.score > 80 ? 'bg-[#2DD4BF]' :
                              d.score > 50 ? 'bg-[#2DD4BF]/60' :
                              d.score > 20 ? 'bg-[#2DD4BF]/30' :
                              'bg-white/5'
                            }`}
                            title={`Score: ${d.score}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Insight Box */}
                  <div className="col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between h-[260px]">
                    <div>
                      <div className="text-caption text-white/40 mb-3">AI Context Analysis</div>
                      <p className="text-body text-white/80 italic leading-relaxed">
                        "Your chaos score spiked to {chaosScore}. The data shows you switched windows {maxSwitchesInMinute} times in a single minute. Step away and formulate a plan."
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowWrapped(true)}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                      <PlayCircle size={16} /> View Session Wrapped
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- ARCHETYPE PAGE --- */}
            {activeTab === 'achievements' && (
              <motion.div 
                key="achievements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="grid grid-cols-12 gap-6">
                  {/* Digital Twin Card (Refactored to be horizontal and less intrusive) */}
                  <div className="col-span-12 glass-panel rounded-3xl p-8 border border-white/10 flex flex-row items-center justify-between overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none"></div>
                    
                    <div className="flex items-center gap-10 z-10 w-2/3">
                      <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${archetypeColor} relative shadow-2xl flex items-center justify-center border border-white/20`}>
                         <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                         <span className="text-h3 font-black text-white mix-blend-overlay">DNA</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-caption text-white/50"><Award size={14} className="inline mr-1" /> Archetype Profile</div>
                          <div className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-[10px] font-bold">LVL {Math.max(1, Math.floor(actionKeys / 100))}</div>
                        </div>
                        <h2 className="text-h1 text-white mb-2">{archetype}</h2>
                        <p className="text-body text-white/60 max-w-md">{archetypeDesc}</p>
                      </div>
                    </div>

                    <div className="w-1/3 grid grid-cols-2 gap-4 border-l border-white/10 pl-8 z-10">
                       <div>
                         <div className="text-h2 text-white">{Math.round((backspaces / Math.max(1, actionKeys)) * 100) || 0}%</div>
                         <div className="text-caption text-white/40 mt-1">Refactor Rate</div>
                       </div>
                       <div>
                         <div className="text-h2 text-white">{windowSwitches}</div>
                         <div className="text-caption text-white/40 mt-1">Context Vol.</div>
                       </div>
                       <div>
                         <div className="text-h2 text-white">{focusScore}</div>
                         <div className="text-caption text-white/40 mt-1">Peak Focus</div>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TIMELINE PAGE --- */}
            {activeTab === 'timeline' && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <Calendar size={24} className="text-white/70" />
                  <h1 className="text-h2 text-white">Timeline Replay</h1>
                </div>
                
                <div className="glass-panel rounded-[24px] p-8 min-h-[500px]">
                  <div className="relative border-l border-white/10 ml-2 space-y-6">
                    {timelineBlocks.map((block, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[13px] top-1 bg-[#09090B] p-[4px] rounded-full border border-white/10 z-10">
                          {getAppIcon(block.app_name)}
                        </div>
                        
                        <div className="flex items-center gap-3 mb-1">
                          <div className="text-body font-semibold text-white">{block.app_name}</div>
                          <div className="text-caption text-white/40 font-mono">{formatTime(block.start_time)}</div>
                        </div>
                        
                        <div className="text-sm text-white/50 truncate max-w-[80%] mb-2">
                          {block.window_title || "Unknown Window"}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded tracking-wider">
                            {Math.max(1, Math.round(block.duration_ms / 60000))} MIN
                          </span>
                          {block.milestone && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
                              block.milestone.includes('Chaos') ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                            }`}>
                              {block.milestone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {timelineBlocks.length === 0 && <div className="pl-6 text-white/40 text-sm">No activity recorded yet.</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- PLUGINS PAGE --- */}
            {activeTab === 'plugins' && (
              <motion.div 
                key="plugins"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <Puzzle size={24} className="text-white/70" />
                  <h1 className="text-h2 text-white">Plugin Architecture</h1>
                </div>
                
                <div className="grid grid-cols-12 gap-6">
                  {/* Plugin Cards constrained to desktop grid */}
                  <PluginCard 
                    name="Slack Auto-DND" 
                    desc="Pauses notifications when Focus > 80." 
                    icon="S" 
                    isActive={focusScore > 80} 
                    color="text-white" 
                    bg="bg-white/5" 
                    activeColor="border-[#2DD4BF]/50" 
                    activeBg="bg-[#2DD4BF]/20 text-[#2DD4BF]"
                  />
                  
                  <PluginCard 
                    name="Spotify Flow State" 
                    desc="Plays Deep Focus playlist on Deadline Mode." 
                    icon={<PlayCircle size={20} />} 
                    isActive={status === 'Deadline Mode'} 
                    color="text-[#1DB954]" 
                    bg="bg-[#1DB954]/20" 
                    activeColor="border-[#A855F7]/50" 
                    activeBg="bg-[#A855F7]/20 text-[#A855F7]"
                  />
                  
                  <PluginCard 
                    name="Philips Hue Sync" 
                    desc="Room lights turn Red during Chaos Meltdown." 
                    icon="💡" 
                    isActive={chaosScore > 85} 
                    color="text-white" 
                    bg="bg-white/5" 
                    activeColor="border-[#EF4444]/50" 
                    activeBg="bg-[#EF4444]/20 text-[#EF4444]"
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* --- WRAPPED DESKTOP MODAL (Refactored to horizontal layout) --- */}
      <AnimatePresence>
        {showWrapped && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[900px] h-[500px] bg-vibrant-coder rounded-[2rem] shadow-2xl flex overflow-hidden relative"
            >
              <button onClick={() => setShowWrapped(false)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white w-8 h-8 rounded-full z-20 flex items-center justify-center text-sm font-bold">✕</button>
              
              <div className="w-1/2 p-10 flex flex-col justify-between z-10 bg-black/10 border-r border-white/10 backdrop-blur-sm">
                <div>
                  <h3 className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-2">tilt.os • {new Date().getFullYear()}</h3>
                  <h2 className="text-display text-white">Session<br/>Wrapped</h2>
                </div>
                <button className="bg-white text-black px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest self-start shadow-xl">Share Export</button>
              </div>

              <div className="w-1/2 p-10 flex flex-col justify-center gap-4 z-10 bg-black/20 backdrop-blur-md">
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Top Application</div>
                  <div className="text-h2 text-white">{mostUsedApp.replace('.exe', '')}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Longest Streak</div>
                    <div className="text-white/80 text-xs">Unbroken focus</div>
                  </div>
                  <div className="text-h2 text-white">{longestStreakMins}m</div>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Archetype Assigned</div>
                  <div className="text-h3 text-white">{archetype}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sidebar Button Component
function SidebarButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
      }`}
    >
      {icon} {label}
    </button>
  );
}

// Mini Metric Card Component
function MetricCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="col-span-3 glass-panel rounded-2xl p-5 flex flex-col justify-between max-h-[140px] group hover:bg-white/[0.02]">
      <div className="flex justify-between items-center text-white/40">
        <span className="text-caption font-semibold">{title}</span>
        {icon}
      </div>
      <div>
        <div className="text-h2 text-white">{value}</div>
        <div className="text-xs text-white/50 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

// Plugin Card Component
function PluginCard({ name, desc, icon, isActive, color, bg, activeColor, activeBg }: any) {
  return (
    <div className={`col-span-4 glass-panel rounded-2xl p-6 border relative overflow-hidden transition-colors ${isActive ? activeColor : 'border-white/5'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center text-lg font-black`}>{icon}</div>
        <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${isActive ? activeBg : 'bg-white/5 text-white/40'}`}>
          {isActive ? 'ACTIVE' : 'STANDBY'}
        </div>
      </div>
      <h3 className="text-body font-bold text-white mb-1">{name}</h3>
      <p className="text-xs text-white/50 mb-4">{desc}</p>
    </div>
  );
}
