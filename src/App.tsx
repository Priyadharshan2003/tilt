import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, MousePointer2, Delete, Zap, BrainCircuit, Layers } from "lucide-react";
import "./App.css";

interface FrictionEvent {
  id: number;
  timestamp: string;
  event_type: string;
  intensity: number;
}

export default function App() {
  const [events, setEvents] = useState<FrictionEvent[]>([]);
  
  const fetchEvents = async () => {
    try {
      const fetchedEvents: FrictionEvent[] = await invoke("get_events");
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

  // -- Data Processing --
  const backspaces = events.filter(e => e.event_type === "backspace").reduce((acc, curr) => acc + curr.intensity, 0);
  const mouseMoves = events.filter(e => e.event_type === "mouse_movement").reduce((acc, curr) => acc + curr.intensity, 0);
  const windowSwitches = events.filter(e => e.event_type === "window_switch").reduce((acc, curr) => acc + curr.intensity, 0);
  
  // Real calculation based on everything we got
  const rawStress = backspaces * 3 + (mouseMoves * 0.05) + windowSwitches * 10;
  const stressScore = Math.min(100, Math.round(rawStress % 100));
  
  const chaosScore = Math.min(100, windowSwitches * 4);
  const focusScore = Math.max(0, 100 - chaosScore);

  // Status mapping
  let pet = "😐";
  let status = "Chilling";
  let roast = "You're actually doing work? Impossible.";
  
  if (stressScore > 80) {
    pet = "🤬";
    status = "Deadline Survivor";
    roast = "Alt-tabbing harder than a DJ on a Friday night.";
  } else if (stressScore > 50) {
    pet = "😬";
    status = "Sweating";
    roast = "I see those aggressive backspaces. Relax.";
  } else if (focusScore > 80) {
    pet = "🧘";
    status = "Zen Master";
    roast = "Okay, 10x developer, we get it.";
  }

  const chartData = useMemo(() => {
     // Generate dummy historical trend but end with our real stressScore
     return Array.from({ length: 20 }).map((_, i) => ({
       time: i,
       stress: i === 19 ? stressScore : Math.max(10, Math.min(90, stressScore + (Math.random() * 40 - 20)))
     }));
  }, [stressScore]);

  return (
    <div className="w-full min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">
        
        {/* 1. HERO MASCOT CARD (col-span-8) */}
        <motion.div 
          layoutId="hero"
          className="glass-panel col-span-1 md:col-span-8 rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="z-10 flex justify-between items-start">
            <div>
              <h2 className="text-white/50 font-semibold tracking-widest text-sm uppercase mb-2">Developer Status</h2>
              <h1 className="text-5xl font-bold tracking-tight text-white flex items-center gap-4">
                {status} <span className="text-6xl">{pet}</span>
              </h1>
            </div>
            <div className="text-right">
               <div className="text-6xl font-black" style={{ color: stressScore > 75 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                 {stressScore}%
               </div>
               <div className="text-white/40 font-medium text-sm mt-1 tracking-widest">STRESS LEVEL</div>
            </div>
          </div>

          <div className="z-10 mt-16 bg-black/40 rounded-2xl p-6 border border-white/5 backdrop-blur-md">
            <div className="text-white/40 text-xs uppercase font-bold tracking-wider mb-2">AI Insight</div>
            <p className="text-xl text-white/90 font-medium italic">"{roast}"</p>
          </div>
        </motion.div>

        {/* 2. CHAOS SCORE (col-span-4) */}
        <motion.div className="glass-panel col-span-1 md:col-span-4 rounded-[2rem] p-6 flex flex-col justify-between">
           <div className="flex items-center gap-3 text-accent mb-4">
             <Zap size={24} />
             <span className="font-semibold text-lg tracking-wide">Chaos Score</span>
           </div>
           <div className="flex-1 flex items-end">
             <div>
               <div className="text-7xl font-bold text-white">{chaosScore}</div>
               <div className="text-white/40 text-sm mt-2 tracking-wide">Window Switches: {windowSwitches}</div>
             </div>
           </div>
           <div className="mt-6 w-full bg-white/10 h-3 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-accent"
               initial={{ width: 0 }}
               animate={{ width: `${chaosScore}%` }}
               transition={{ type: "spring", bounce: 0.2 }}
             />
           </div>
        </motion.div>

        {/* 3. TREND CHART (col-span-8) */}
        <motion.div className="glass-panel col-span-1 md:col-span-8 rounded-[2rem] p-6 h-72 flex flex-col">
           <div className="flex items-center gap-3 text-primary mb-4">
             <Activity size={20} />
             <span className="font-semibold text-sm uppercase tracking-widest">Stress Pulse</span>
           </div>
           <div className="flex-1 w-full -ml-4 mt-2">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <Tooltip 
                   contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                   itemStyle={{ color: '#fff' }}
                   labelStyle={{ display: 'none' }}
                 />
                 <Line 
                   type="monotone" 
                   dataKey="stress" 
                   stroke="var(--color-primary)" 
                   strokeWidth={4} 
                   dot={false}
                   animationDuration={300}
                 />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </motion.div>

        {/* 4. METRICS BENTO (col-span-4) */}
        <div className="col-span-1 md:col-span-4 grid grid-cols-2 gap-6">
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-center items-center text-center gap-3">
            <BrainCircuit size={28} className="text-success" />
            <div className="text-4xl font-bold">{focusScore}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">Focus</div>
          </div>
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-center items-center text-center gap-3">
            <Delete size={28} className="text-danger" />
            <div className="text-4xl font-bold">{backspaces}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">Backspace</div>
          </div>
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-center items-center text-center gap-3">
            <MousePointer2 size={28} className="text-blue-400" />
            <div className="text-4xl font-bold">{mouseMoves > 999 ? (mouseMoves/1000).toFixed(1) + 'k' : mouseMoves}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">Mouse</div>
          </div>
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-center items-center text-center gap-3">
            <Layers size={28} className="text-purple-400" />
            <div className="text-4xl font-bold">{windowSwitches}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">Alt-Tabs</div>
          </div>
        </div>

      </div>
    </div>
  );
}
