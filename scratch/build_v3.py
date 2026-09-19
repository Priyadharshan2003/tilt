import re

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace the Sidebar button
content = re.sub(
    r'<button\s*onClick=\{\(\) => \{ setActiveTab\(\'home\'\); setIsProMode\(!isProMode\); \}\}.*?Terminal Pro\s*</button>',
    r'{/* Pro Mode toggle moved to Dashboard Hero Card */}',
    content,
    flags=re.DOTALL
)

dashboard_replacement = """
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
                <div className="grid grid-cols-12 gap-6">
                  
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
                          <div className="relative w-20 h-20 flex items-center justify-center shrink-0 mr-4 cursor-help group">
                            <div className="absolute -top-6 -left-24 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-2xl pointer-events-none">
                              <p className="text-xs text-white/90">{greeting}</p>
                            </div>
                            <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin" style={{ animationDuration: '18s' }}></div>
                            <div className="absolute inset-1 rounded-full border border-dashed border-secondary/30 animate-[spin_24s_linear_infinite_reverse]"></div>
                            <div className={`w-14 h-14 bg-gradient-to-tr ${blobBg} ${blobClass} shadow-[0_0_24px_rgba(45,212,191,0.55)] flex items-center justify-center`}>
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
"""

parts = content.split("{/* --- DASHBOARD PAGE --- */}")
before = parts[0]
after_dashboard = parts[1].split("{/* --- ANALYTICS PAGE --- */}")
analytics_and_rest = after_dashboard[1]

new_content = before + "{/* --- DASHBOARD PAGE --- */}\n            {activeTab === 'home' && (" + dashboard_replacement + "            )}\n\n            {/* --- ANALYTICS PAGE --- */}" + analytics_and_rest

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated App.tsx successfully.")
