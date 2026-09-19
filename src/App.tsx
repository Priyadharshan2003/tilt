import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification, requestPermission, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
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

  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  useEffect(() => {
    const checkRage = async () => {
      const now = new Date().getTime();
      if (now - lastNotificationTime < 120000) return;

      const recentEvents = events.filter(e => {
         const evTime = new Date(e.timestamp).getTime();
         return now - evTime < 60000;
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
          break;
        }
      }
      if (switchesInThisWindow > maxSwitchesInMinute) {
        maxSwitchesInMinute = switchesInThisWindow;
      }
    }
  }

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

  const ideTimeMins = Math.floor(ideTimeMs / 60000);
  const ideTimeHours = Math.floor(ideTimeMins / 60);
  const remainingMins = ideTimeMins % 60;
  const longestStreakMins = Math.floor(longestStreakMs / 60000);

  const velocityPenalty = maxSwitchesInMinute > 6 ? maxSwitchesInMinute * 10 : 0;
  const rawChaos = (windowSwitches * 2) + velocityPenalty + (backspaces * 0.1) + ((distractionTimeMs / 60000) * 5);
  const chaosScore = Math.min(100, Math.round(rawChaos));
  
  const rawFocus = 100 - chaosScore + (ideTimeMins * 2) + (longestStreakMins * 0.5);
  const focusScore = Math.max(0, Math.min(100, Math.round(rawFocus)));

  const currentHour = new Date().getHours();
  const isLateHours = currentHour >= 22 || currentHour <= 5;
  const latestApp = windowSwitchEvents.length > 0 ? windowSwitchEvents[windowSwitchEvents.length - 1].app_name : "";
  const isTerminalOrIde = allIdeAndTerminalApps.includes(latestApp);

  let blobClass = "blob-zen animate-bio-blob";
  let status = "Focused Builder";
  let insight = "Unbroken flow. You are operating at peak efficiency.";
  let statusColor = "text-primary";
  let greeting = "All systems nominal. Ready to build.";
  let glowColor = "bg-primary";
  let blobBg = "bg-primary-container";
  
  if (chaosScore > 85 && isTerminalOrIde) {
    blobClass = "animate-bio-blob";
    status = "Production Fire";
    insight = "High chaos in terminal/IDE detected. Stay calm and read the logs.";
    statusColor = "text-error"; 
    greeting = "Critical situation detected. Take a breath and focus on the root cause.";
    glowColor = "bg-error";
    blobBg = "bg-error-container";
  } else if (chaosScore > 85) {
    blobClass = "animate-bio-blob";
    status = "Nuclear Meltdown";
    insight = "Critical context switching velocity detected. Step away from the keyboard.";
    statusColor = "text-error";
    greeting = "Cognitive overload. Please take a 5 minute break from the screen.";
    glowColor = "bg-error";
    blobBg = "bg-error-container";
  } else if (isLateHours && actionKeys > 10) { 
    blobClass = "animate-bio-blob";
    status = "Deadline Mode";
    insight = "Late night hyper-focus. Don't forget to hydrate.";
    statusColor = "text-secondary"; 
    greeting = "Burning the midnight oil. I'm right here with you.";
    glowColor = "bg-secondary";
    blobBg = "bg-secondary-container";
  } else if (chaosScore > 50) {
    blobClass = "animate-bio-blob";
    status = "Chaos Coordinator";
    insight = "High fragmentation. You are bouncing between tasks rapidly.";
    statusColor = "text-[#FB923C]";
    greeting = "Try to close some tabs and focus on one task at a time.";
    glowColor = "bg-[#FB923C]";
    blobBg = "bg-[#FB923C]/40";
  }

  let archetype = "THE EXECUTION MACHINE";
  let archetypeDesc = "Sustained biological high-throughput engine. Suppresses contextual latency and micro-distractions during complex multi-threaded architectural compilation.";
  
  if (backspaces > actionKeys * 0.4) {
    archetype = "THE REFACTORER";
    archetypeDesc = "You measure twice and cut once. High volume of rewrites and deletes.";
  } else if (windowSwitches > 100) {
    archetype = "THE EXPLORER";
    archetypeDesc = "High context switching. You spend most of your time reading docs or debugging.";
  }

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
      if (e.app_name === currentBlock.app_name && timeDiff < 5 * 60 * 1000) {
        currentBlock.end_time = e.timestamp;
        currentBlock.duration_ms += e.duration_ms;
        currentBlock.window_title = e.window_title;
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
       longestIdeBlock.milestone = "50m Focus Streak";
     }
     
     const longestDistraction = [...timelineBlocks].sort((a, b) => b.duration_ms - a.duration_ms).find(b => distractionApps.includes(b.app_name));
     if (longestDistraction && longestDistraction.duration_ms > 60000) {
       longestDistraction.milestone = "Chaos Meltdown";
     }
  }

  const getAppIcon = (appName: string) => {
    if (ideApps.includes(appName)) return <span className="material-symbols-outlined text-[14px] text-primary">code_blocks</span>;
    if (terminalApps.includes(appName)) return <span className="material-symbols-outlined text-[14px] text-secondary">terminal</span>;
    if (distractionApps.includes(appName)) return <span className="material-symbols-outlined text-[14px] text-error">travel_explore</span>;
    return <span className="material-symbols-outlined text-[14px] text-outline">layers</span>;
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

  const focusHeatmapData = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      if (i === 29) return { day: i, score: focusScore };
      return { day: i, score: Math.floor(Math.random() * 100) };
    });
  }, [focusScore]);

  return (
    <div className={`flex w-full h-screen overflow-hidden bg-background text-on-surface transition-colors duration-1000 ${isProMode ? 'bg-black' : chaosScore > 85 && !isTerminalOrIde ? 'border-2 border-error' : ''}`}>
      {!isProMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className={`absolute -top-24 -left-20 w-96 h-96 rounded-full blur-3xl opacity-20 ${blobBg}`}></div>
          <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-secondary-container blur-3xl opacity-15"></div>
          <div className={`absolute bottom-10 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 ${glowColor}`}></div>
        </div>
      )}

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside data-tauri-drag-region className="w-64 border-r border-white/5 bg-surface-container-lowest/80 backdrop-blur-3xl flex flex-col pt-12 pb-6 px-4 z-50">
        <div className="mb-10 px-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high/60 border border-outline-variant/40 text-primary">
             <span className="material-symbols-outlined text-[18px]">terminal</span>
          </div>
          <h1 className="text-primary font-headline-sm tracking-tight text-lg font-bold">tilt.os</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarButton icon="grid_view" label="Dashboard" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsProMode(false); }} />
          <SidebarButton icon="insights" label="Analytics" active={activeTab === 'insights'} onClick={() => { setActiveTab('insights'); setIsProMode(false); }} />
          <SidebarButton icon="history" label="Timeline" active={activeTab === 'timeline'} onClick={() => { setActiveTab('timeline'); setIsProMode(false); }} />
          <SidebarButton icon="military_tech" label="Archetype" active={activeTab === 'achievements'} onClick={() => { setActiveTab('achievements'); setIsProMode(false); }} />
          <SidebarButton icon="extension" label="Plugins" active={activeTab === 'plugins'} onClick={() => { setActiveTab('plugins'); setIsProMode(false); }} />
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          {/* Pro Mode toggle moved to Dashboard Hero Card */}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar">
        <div className="w-full max-w-[1400px] mx-auto p-8 lg:p-12 pb-24 z-10 relative">
          
          <AnimatePresence mode="wait">
            
            {/* --- DASHBOARD PAGE --- */}
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-3.5"
              >
                {/* Interactive Rage Tilt Alert Banner */}
                <section className="glass-card rounded-xl p-2.5 flex items-center justify-between border-primary/20 bg-primary/5 shadow-[0_0_20px_rgba(45,212,191,0.06)]">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg ${chaosScore > 85 ? 'bg-error/10 border-error/30 text-error' : 'bg-primary/10 border-primary/30 text-primary'} border flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-[16px]">{chaosScore > 85 ? 'warning' : 'verified_user'}</span>
                    </div>
                    <p className="font-telemetry-sm text-telemetry-sm text-on-surface truncate">
                      {chaosScore > 85 ? 
                        <><span className="text-error font-medium">Rage tilt detected</span> • High context switching</> : 
                        <><span className="text-primary font-medium">No rage tilt detected</span> in last 90 mins • Flow maintained</>}
                    </p>
                  </div>
                  <span className={`font-telemetry-sm text-telemetry-sm ${chaosScore > 85 ? 'text-error/70' : 'text-primary/70'} shrink-0 ml-1`}>{(chaosScore/100).toFixed(2)}λ</span>
                </section>

                {/* TOP ROW: Hero & Pulse Chart */}
                <div className="grid grid-cols-12 gap-4">
                  
                  {/* Hero Status Card: Developer Focus & Chaos Engine */}
                  <motion.div className="col-span-8 glass-card rounded-xl p-4 relative overflow-hidden flex flex-col">
                    {/* Card Sub-header & Mode Switcher */}
                    <div className="flex items-center justify-between mb-3.5 z-20">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#57f1db]"></span>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">NEURAL COGNITIVE ANCHOR</span>
                      </div>
                      {/* Telemetry View Switcher */}
                      <div className="flex bg-surface-container-lowest/80 p-0.5 rounded-lg border border-outline-variant/30 text-telemetry-sm font-telemetry-sm">
                        <button 
                          className={`px-2 py-0.5 rounded font-medium transition-all duration-150 ${!isProMode ? 'bg-primary/15 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface opacity-80 border border-transparent'}`}
                          onClick={() => setIsProMode(false)}
                        >GUI</button>
                        <button 
                          className={`px-2 py-0.5 rounded transition-all duration-150 ${isProMode ? 'bg-primary/15 text-primary border border-primary/30 font-medium' : 'text-on-surface-variant hover:text-on-surface opacity-80 border border-transparent'}`}
                          onClick={() => setIsProMode(true)}
                        >TTY</button>
                      </div>
                    </div>

                    {!isProMode ? (
                      <div className="block space-y-4 flex-1 z-10 relative">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-telemetry-sm text-telemetry-sm text-outline block mb-1">DEVELOPER STATE</span>
                            <h1 className="font-headline-md text-headline-md tracking-tight text-white font-bold flex items-center gap-1.5">
                               {status.toUpperCase()}
                               <span className={`material-symbols-outlined ${statusColor} text-[18px]`}>bolt</span>
                            </h1>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 max-w-sm">{insight}</p>
                          </div>
                          
                          {/* Pulsating Reactive Dynamic Cognitive DNA Pet / Bio-Blob */}
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0 mr-4 cursor-help group">
                            <div className="absolute -top-6 -left-24 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-2xl pointer-events-none">
                              <p className="text-xs text-white/90">{greeting}</p>
                            </div>
                            <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin" style={{ animationDuration: '18s' }}></div>
                            <div className="absolute inset-1 rounded-full border border-dashed border-secondary/30 animate-[spin_24s_linear_infinite_reverse]"></div>
                            <div className={`w-10 h-10 bg-gradient-to-tr ${blobBg} ${blobClass} shadow-[0_0_16px_rgba(45,212,191,0.55)] flex items-center justify-center`}>
                              <span className="material-symbols-outlined text-on-primary-fixed text-[20px] select-none">psychology</span>
                            </div>
                          </div>
                        </div>

                        {/* Gauge Matrix: Focus Score vs Chaos Score */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1 mt-auto">
                          {/* Focus Score Gauge */}
                          <div className="bg-surface-container-lowest/60 border border-primary/30 rounded-xl p-3 relative overflow-hidden shadow-[0_0_16px_rgba(87,241,219,0.08)]">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">FOCUS SCORE</span>
                              <span className="font-telemetry-sm text-telemetry-sm text-primary font-semibold">{focusScore > 70 ? 'OPTIMAL' : 'LOW'}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-telemetry-lg text-telemetry-lg text-primary font-bold">{focusScore}</span>
                              <span className="font-telemetry-sm text-telemetry-sm text-outline">/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-2">
                              <div className="h-full bg-gradient-to-r from-primary-container to-primary shadow-[0_0_10px_#57f1db] transition-all duration-1000" style={{ width: `${focusScore}%` }}></div>
                            </div>
                          </div>
                          
                          {/* Chaos Score Gauge */}
                          <div className="bg-surface-container-lowest/60 border border-tertiary-container/30 rounded-xl p-3 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">CHAOS SCORE</span>
                              <span className="font-telemetry-sm text-telemetry-sm text-tertiary font-semibold">{chaosScore > 50 ? 'HIGH' : 'LOW'}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-telemetry-lg text-telemetry-lg text-tertiary font-bold">{chaosScore}</span>
                              <span className="font-telemetry-sm text-telemetry-sm text-outline">/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-2">
                              <div className="h-full bg-gradient-to-r from-tertiary-container to-error shadow-[0_0_8px_rgba(255,180,171,0.6)] transition-all duration-1000" style={{ width: `${chaosScore}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-lowest/90 rounded-lg p-3 border border-outline-variant/30 space-y-1.5 h-full flex flex-col z-10 relative">
                        <div className="flex justify-between text-outline text-[10px] pb-1 border-b border-outline-variant/20 mb-2">
                          <span>STREAM://TTY.COGNITIVE.V2</span>
                          <span>PID: 8092 [ATTACHED]</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-xs">
                           <p className="text-primary"><span className="text-outline">{new Date().toLocaleTimeString()}</span> [STATE] BIO_CORE: {status.toUpperCase().replace(' ', '_')}</p>
                           <p><span className="text-outline">{new Date(Date.now()-1000).toLocaleTimeString()}</span> [NEURAL] FOCUS_INDEX: {(focusScore/100).toFixed(4)} | CHAOS: {(chaosScore/100).toFixed(4)}</p>
                           <p><span className="text-outline">{new Date(Date.now()-2000).toLocaleTimeString()}</span> [SENSORS] JITTER: {(chaosScore*0.1).toFixed(1)}ms | HEART_VAR: {72 + Math.floor(Math.random()*10)}ms</p>
                           {chaosScore > 80 && <p className="text-secondary"><span className="text-outline">{new Date(Date.now()-3000).toLocaleTimeString()}</span> [TILTRISK] WARNING: HIGH CONTEXT SWITCHING</p>}
                           
                           {events.slice(0, 5).map((e, i) => (
                              <p key={i} className="truncate"><span className="text-outline">{new Date(e.timestamp).toLocaleTimeString()}</span> [{e.event_type.toUpperCase()}] {e.app_name}</p>
                           ))}
                        </div>
                        <div className="pt-1 flex items-center text-primary text-[10px] mt-2 border-t border-outline-variant/20">
                          <span className="inline-block w-2 h-3 bg-primary animate-pulse mr-1.5"></span>
                          <span>AWAITING NEXT KEYBOARD EVENT BURST...</span>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Focus Pulse Chart */}
                  <motion.div className="glass-card col-span-4 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <span className="font-label-caps text-label-caps text-outline flex items-center gap-2 uppercase tracking-wider">
                           TELEMETRY STREAM
                         </span>
                         <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">Focus Pulse <span className="font-telemetry-sm text-telemetry-sm text-primary font-normal">(60 MIN)</span></h2>
                       </div>
                       <div className="text-right flex flex-col items-end">
                         <span className="font-telemetry-sm text-telemetry-sm text-primary font-medium flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> LIVE 1.2Hz
                         </span>
                         <span className="font-label-caps text-label-caps text-outline mt-1">MEAN: {(chartData.reduce((acc, cur) => acc + cur.focus, 0) / chartData.length).toFixed(1)}%</span>
                       </div>
                    </div>
                    
                    <div className="flex-1 w-full -ml-4 relative min-h-[100px] mt-2">
                      <svg width="0" height="0">
                        <defs>
                          <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#57f1db" stopOpacity={0.4}/>
                            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0}/>
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
                          <Line type="monotone" dataKey="focus" stroke="url(#focusGradient)" strokeWidth={2.5} dot={false} animationDuration={800} strokeLinecap="round" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between font-telemetry-sm text-telemetry-sm text-outline pt-1 px-4">
                      <span>-60m</span>
                      <span>-30m</span>
                      <span className="text-primary font-medium">Now</span>
                    </div>
                  </motion.div>
                </div>

                {/* BOTTOM ROW: Metrics Array */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <MetricCard icon="schedule" title="IDE Time" value={`${ideTimeHours}h ${remainingMins}m`} subtitle="Focused building" color="text-primary" />
                  <MetricCard icon="alt_route" title="Switches" value={`${windowSwitches}`} subtitle="App transitions" color="text-[#FB923C]" />
                  <MetricCard icon="keyboard" title="Action Keys" value={actionKeys} subtitle="Productive keystrokes" color="text-primary" />
                  <MetricCard icon="backspace" title="Destructive" value={backspaces} subtitle="Backspaces & deletes" color="text-error" />
                </div>

                {/* Live Event Bus Log */}
                <section className="glass-card rounded-xl p-3 space-y-2 border-outline-variant/30 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-outline uppercase">LIVE EVENT BUS LOG</span>
                    <span className="font-telemetry-sm text-telemetry-sm text-primary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>SYNCED</span>
                  </div>
                  <div className="space-y-1 font-telemetry-sm text-telemetry-sm">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className={`flex items-center justify-between py-1 ${i !== 2 ? 'border-b border-white/[0.03]' : ''}`}>
                        <span className="text-outline">{new Date(e.timestamp).toLocaleTimeString()}</span>
                        <span className="text-on-surface truncate max-w-[200px] flex-1 px-4">{e.app_name}: {e.window_title || e.event_type}</span>
                        <span className={e.event_type === 'destructive_keystroke' ? 'text-error' : 'text-primary'}>{e.event_type === 'destructive_keystroke' ? 'RAGE' : 'PASS'}</span>
                      </div>
                    ))}
                    {events.length === 0 && <div className="py-2 text-outline text-center">No recent events</div>}
                  </div>
                </section>

              </motion.div>
            )}

            {/* --- ANALYTICS PAGE --- */}
            {activeTab === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 text-on-surface mb-2">
                  <span className="material-symbols-outlined text-[24px] text-primary">insights</span>
                  <h1 className="text-headline-md font-headline-md font-bold tracking-tight">INSIGHTS & TELEMETRY</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Longest Streak */}
                  <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                      <span className="material-symbols-outlined text-4xl text-primary">bolt</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-label-caps font-label-caps text-outline tracking-wider">TELEMETRY_RECORD_01</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-label-caps font-label-caps">FLOW STATE</span>
                    </div>
                    <div className="text-body-sm text-on-surface-variant mb-1">Longest Streak</div>
                    <div className="text-headline-xl font-headline-xl text-primary font-bold tracking-tight">{longestStreakMins} min</div>
                  </div>
                  
                  {/* Card 2: Distraction Cost */}
                  <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-secondary/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                      <span className="material-symbols-outlined text-4xl text-secondary">hourglass_bottom</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-label-caps font-label-caps text-outline tracking-wider">COGNITIVE_LEAK</span>
                    </div>
                    <div className="text-body-sm text-on-surface-variant mb-1">Distraction Cost</div>
                    <div className="text-headline-xl font-headline-xl text-secondary font-bold tracking-tight">{Math.floor(distractionTimeMs / 60000)} min</div>
                  </div>

                  {/* Card 3: Peak Velocity */}
                  <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-error/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                      <span className="material-symbols-outlined text-4xl text-error">speed</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-label-caps font-label-caps text-outline tracking-wider">CONTEXT_SWITCHING</span>
                    </div>
                    <div className="text-body-sm text-on-surface-variant mb-1">Peak Velocity</div>
                    <div className="text-headline-xl font-headline-xl text-error font-bold tracking-tight flex items-baseline gap-2">
                      {maxSwitchesInMinute} <span className="text-headline-sm font-headline-sm text-outline font-normal">switches/min</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  {/* Heatmap Section */}
                  <div className="col-span-8 glass-card rounded-xl p-6 md:p-8 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-label-caps font-label-caps text-primary tracking-widest font-semibold">NEURAL COMMIT MATRIX</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        </div>
                        <h2 className="text-headline-md font-headline-md text-on-surface font-semibold mt-1">Focus Architecture</h2>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col justify-center">
                      <div className="grid grid-flow-col grid-rows-7 gap-[6px]">
                        {focusHeatmapData.slice(0, 28).map((d, i) => (
                          <div 
                            key={i} 
                            className={`w-full aspect-square rounded-[3px] border transition-colors ${
                              d.score > 80 ? 'bg-primary/90 border-primary/40 shadow-[0_0_8px_rgba(45,212,191,0.3)]' :
                              d.score > 50 ? 'bg-primary/60 border-primary/20' :
                              d.score > 20 ? 'bg-primary/30 border-white/5' :
                              'bg-white/5 border-white/5'
                            }`}
                            title={`Score: ${d.score}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis / Wrapped */}
                  <div className="col-span-4 glass-card rounded-xl p-6 md:p-8 flex flex-col justify-between border-t-2 border-t-secondary/50">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-[18px]">neurology</span>
                      </div>
                      <span className="text-label-caps font-label-caps text-secondary font-semibold tracking-wider">SYNAPSE OBSERVER</span>
                    </div>
                    <p className="text-body-md text-on-surface leading-relaxed mb-6">
                      Your chaos score spiked to <span className="text-error font-bold">{chaosScore}</span>. The data shows you switched windows <span className="text-primary font-bold">{maxSwitchesInMinute}</span> times in a single minute.
                    </p>
                    <button 
                      onClick={() => setShowWrapped(true)}
                      className="w-full relative group overflow-hidden rounded-xl px-4 py-3.5 bg-primary/15 hover:bg-primary border border-primary/40 hover:border-primary text-primary hover:text-surface-container-lowest font-headline-sm text-[16px] font-bold flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12">auto_awesome</span>
                      <span>LAUNCH SESSION WRAPPED</span>
                    </button>
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
                className="w-full flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 text-on-surface mb-4">
                  <span className="material-symbols-outlined text-[24px] text-primary">history</span>
                  <h1 className="text-headline-md font-headline-md font-bold tracking-tight">TIMELINE REPLAY</h1>
                </div>
                
                <div className="glass-card rounded-xl p-8 min-h-[500px]">
                  <div className="relative border-l-2 border-primary/30 ml-4 space-y-6 pt-4 pb-4">
                    {timelineBlocks.map((block, i) => (
                      <div key={i} className="relative pl-8 group">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        </div>
                        
                        <div className="p-4 md:p-5 rounded-xl bg-surface-container-lowest/70 backdrop-blur-xl border border-white/[0.08] hover:border-primary/50 transition-all duration-200 shadow-md">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-telemetry-sm font-telemetry-sm text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                                {formatTime(block.start_time)}
                              </span>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high/70 border border-white/[0.08] text-on-surface">
                                {getAppIcon(block.app_name)}
                                <span className="text-label-caps font-label-caps font-semibold">{block.app_name}</span>
                              </div>
                              <span className="font-telemetry-md text-telemetry-md text-on-surface font-medium truncate max-w-[200px]">{block.window_title || "Unknown Window"}</span>
                              <span className="text-label-caps font-label-caps text-outline">({Math.max(1, Math.round(block.duration_ms / 60000))}m)</span>
                            </div>
                            {block.milestone && (
                              <div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-caps font-label-caps border shadow-sm ${
                                  block.milestone.includes('Chaos') ? 'bg-error/10 border-error/50 text-error' : 'bg-primary/10 border-primary/50 text-primary'
                                }`}>
                                  <span className="font-bold">{block.milestone}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {timelineBlocks.length === 0 && <div className="pl-8 text-outline text-sm">No activity recorded yet.</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- PROFILE / ARCHETYPE PAGE --- */}
            {activeTab === 'achievements' && (
              <motion.div 
                key="achievements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 text-on-surface mb-2">
                  <span className="material-symbols-outlined text-[24px] text-primary">military_tech</span>
                  <h1 className="text-headline-md font-headline-md font-bold tracking-tight">DIGITAL TWIN</h1>
                </div>

                <div className="glass-card rounded-xl p-8 flex flex-col md:flex-row items-center justify-between overflow-hidden relative border-t-[3px] border-t-primary">
                   <div className="flex items-center gap-8 z-10 w-full md:w-2/3">
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-primary/20 border-dashed animate-[spin_10s_linear_infinite]"></div>
                        <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-primary via-secondary to-primary-container relative flex items-center justify-center border border-white/20 animate-pulse`}>
                           <span className="material-symbols-outlined text-4xl text-on-surface">dna</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded border border-secondary/40 bg-secondary-container/20 text-secondary font-label-caps text-label-caps tracking-widest uppercase">
                            Rare Tier Archetype
                          </span>
                        </div>
                        <div className="font-label-caps text-label-caps text-primary/80 tracking-widest uppercase block mb-1">ARCHETYPE CLASSIFICATION</div>
                        <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight uppercase mb-2">{archetype}</h2>
                        <p className="font-body-md text-on-surface-variant max-w-xl">{archetypeDesc}</p>
                      </div>
                   </div>

                   <div className="w-full md:w-1/3 grid grid-cols-2 gap-4 md:border-l border-white/10 md:pl-8 z-10 mt-6 md:mt-0">
                      <div>
                        <div className="font-telemetry-lg text-3xl font-bold text-on-surface">{Math.round((backspaces / Math.max(1, actionKeys)) * 100) || 0}%</div>
                        <div className="font-label-caps text-label-caps text-outline mt-1">Refactor Rate</div>
                      </div>
                      <div>
                        <div className="font-telemetry-lg text-3xl font-bold text-on-surface">{windowSwitches}</div>
                        <div className="font-label-caps text-label-caps text-outline mt-1">Context Volatility</div>
                      </div>
                      <div>
                        <div className="font-telemetry-lg text-3xl font-bold text-primary">{focusScore}</div>
                        <div className="font-label-caps text-label-caps text-outline mt-1">Peak Focus</div>
                      </div>
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
                className="w-full flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 text-on-surface mb-2">
                  <span className="material-symbols-outlined text-[24px] text-primary">extension</span>
                  <h1 className="text-headline-md font-headline-md font-bold tracking-tight">PLUGIN ARCHITECTURE</h1>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PluginCard 
                    name="Slack Auto-DND" 
                    desc="Pauses notifications when Focus > 80." 
                    icon="do_not_disturb_on" 
                    isActive={focusScore > 80} 
                  />
                  
                  <PluginCard 
                    name="Spotify Flow State" 
                    desc="Plays Deep Focus playlist on Deadline Mode." 
                    icon="play_circle" 
                    isActive={status === 'Deadline Mode'} 
                  />
                  
                  <PluginCard 
                    name="Philips Hue Sync" 
                    desc="Room lights turn Red during Chaos Meltdown." 
                    icon="lightbulb" 
                    isActive={chaosScore > 85} 
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* --- WRAPPED MODAL --- */}
      <AnimatePresence>
        {showWrapped && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card max-w-md w-full rounded-2xl p-6 border border-primary/50 shadow-[0_0_40px_rgba(45,212,191,0.3)] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2 text-primary font-headline-sm font-bold">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span>SESSION WRAPPED</span>
                </div>
                <button onClick={() => setShowWrapped(false)} className="text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="space-y-3 text-body-md text-on-surface mb-6">
                <div className="p-3 rounded-lg bg-surface-container-highest/40 border border-white/5 flex justify-between items-center">
                  <span className="text-outline text-label-caps uppercase">Total Deep Work:</span>
                  <span className="text-primary font-bold text-headline-sm">{longestStreakMins}m</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-highest/40 border border-white/5 flex justify-between items-center">
                  <span className="text-outline text-label-caps uppercase">Distraction Switches:</span>
                  <span className="text-secondary font-bold text-headline-sm">{windowSwitches}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-highest/40 border border-white/5 flex flex-col">
                  <span className="text-outline text-label-caps uppercase mb-1">Archetype Unlocked:</span>
                  <span className="text-primary font-bold text-headline-sm">{archetype}</span>
                </div>
              </div>
              
              <button onClick={() => setShowWrapped(false)} className="w-full py-3 rounded-lg bg-primary text-surface-container-lowest font-headline-sm font-bold hover:bg-primary-fixed transition-colors">
                COMPLETE REVIEW
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-medium transition-all uppercase tracking-wider ${
        active ? 'bg-primary/10 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </button>
  );
}

function MetricCard({ icon, title, value, subtitle, color }: any) {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col justify-between h-[130px] group hover:border-white/20 transition-colors">
      <div className="flex justify-between items-center text-outline">
        <span className="text-label-caps font-semibold uppercase">{title}</span>
        <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
      </div>
      <div>
        <div className={`text-headline-lg font-bold ${color}`}>{value}</div>
        <div className="text-telemetry-sm text-outline mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function PluginCard({ name, desc, icon, isActive }: any) {
  return (
    <div className={`glass-card rounded-xl p-6 border relative overflow-hidden transition-colors ${isActive ? 'border-primary/50' : 'border-white/5'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[24px] ${isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container text-outline'}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className={`px-2 py-1 rounded font-label-caps text-[9px] font-bold uppercase tracking-widest ${isActive ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-outline'}`}>
          {isActive ? 'ACTIVE' : 'STANDBY'}
        </div>
      </div>
      <h3 className="text-headline-sm font-bold text-on-surface mb-1">{name}</h3>
      <p className="text-body-sm text-on-surface-variant mb-4">{desc}</p>
    </div>
  );
}
