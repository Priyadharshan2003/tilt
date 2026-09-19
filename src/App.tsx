import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { Activity, MousePointer2, Delete } from "lucide-react";
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
      const fetchedEvents: FrictionEvent[] = await invoke("get_dummy_events");
      setEvents(fetchedEvents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Poll for new events every 2 seconds
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stress score based on recent events (dummy logic for prototype)
  const backspaces = events.filter(e => e.event_type === "backspace").reduce((acc, curr) => acc + curr.intensity, 0);
  const mouseMoves = events.filter(e => e.event_type === "mouse_movement").reduce((acc, curr) => acc + curr.intensity, 0);
  
  // Stress score 0-100
  const stressScore = Math.min(100, Math.round((backspaces * 5 + mouseMoves * 0.1) % 100));
  
  // Determine color based on stress
  const strokeColor = stressScore > 75 ? "#ef4444" : stressScore > 40 ? "#f97316" : "#3b82f6";

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 select-none font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-panel w-full max-w-md rounded-3xl shadow-2xl p-8 border border-white/5 flex flex-col items-center gap-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-red-500" />
        
        <div className="flex items-center gap-2 self-start text-white/80">
          <Activity size={24} className="text-primary" />
          <h1 className="text-xl font-semibold tracking-wide">Tilt Dashboard</h1>
        </div>

        {/* Stress Score Ring */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="#2a2e37"
              strokeWidth="12"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 1000" }}
              animate={{ 
                strokeDasharray: `${(stressScore / 100) * 553} 1000` // 2 * pi * r = ~553
              }}
              transition={{ duration: 1, type: "spring", bounce: 0.2 }}
            />
          </svg>
          
          <div className="flex flex-col items-center">
            <motion.span 
              key={stressScore}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-bold tracking-tighter"
              style={{ color: strokeColor }}
            >
              {stressScore || 0}
            </motion.span>
            <span className="text-sm text-white/50 uppercase tracking-widest mt-1 font-medium">Stress</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-2 items-center hover:bg-white/10 transition-colors">
            <Delete size={20} className="text-white/40" />
            <div className="text-2xl font-semibold">{backspaces}</div>
            <div className="text-xs text-white/50 uppercase tracking-wider">Backspaces</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-2 items-center hover:bg-white/10 transition-colors">
            <MousePointer2 size={20} className="text-white/40" />
            <div className="text-2xl font-semibold">{mouseMoves}</div>
            <div className="text-xs text-white/50 uppercase tracking-wider">Mouse Moves</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
