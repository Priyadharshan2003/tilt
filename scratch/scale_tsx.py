import re

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rename "Archetype" to "Profile" in Sidebar
content = content.replace(
    '<span className="material-symbols-outlined text-[18px]">military_tech</span>\n            Archetype',
    '<span className="material-symbols-outlined text-[18px]">person</span>\n            Profile'
)

# 2. Reduce global paddings in the main layout container
content = content.replace(
    'className="p-8 lg:p-12 pb-24 z-10 relative"',
    'className="p-6 lg:p-8 pb-16 z-10 relative"'
)

# 3. Scale down the grid gaps
content = content.replace(
    'className="w-full flex flex-col gap-6"',
    'className="w-full flex flex-col gap-4"'
)
content = content.replace(
    'className="grid grid-cols-12 gap-6"',
    'className="grid grid-cols-12 gap-4"'
)
content = content.replace(
    'className="grid grid-cols-12 gap-6 items-start"',
    'className="grid grid-cols-12 gap-4 items-start"'
)
content = content.replace(
    'className="grid grid-cols-1 md:grid-cols-4 gap-6"',
    'className="grid grid-cols-1 md:grid-cols-4 gap-3"'
)

# 4. Scale down the Hero blob in Dashboard
content = content.replace(
    'className="relative w-20 h-20 flex items-center justify-center shrink-0 mr-4 cursor-help group"',
    'className="relative w-16 h-16 flex items-center justify-center shrink-0 mr-4 cursor-help group"'
)
content = content.replace(
    'className={`w-14 h-14 bg-gradient-to-tr ${blobBg} ${blobClass} shadow-[0_0_24px_rgba(45,212,191,0.55)] flex items-center justify-center`}',
    'className={`w-10 h-10 bg-gradient-to-tr ${blobBg} ${blobClass} shadow-[0_0_16px_rgba(45,212,191,0.55)] flex items-center justify-center`}'
)

# 5. Overhaul the Profile page
profile_header = """
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                  <h1 className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight">DEVELOPER PROFILE</h1>
                </div>
                
                {/* User Details Header */}
                <div className="glass-card rounded-xl p-6 mb-2 flex items-center justify-between border-primary/10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                      <span className="material-symbols-outlined text-[32px] text-on-surface-variant">engineering</span>
                    </div>
                    <div>
                      <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">Alex Developer</h2>
                      <p className="text-body-sm font-telemetry-sm text-on-surface-variant">@alexdev • Senior Staff Engineer</p>
                      <div className="flex gap-2 mt-2">
                         <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] border border-primary/20">Lvl 42</span>
                         <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] border border-outline-variant/30">Joined 2024</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] text-outline mb-1 uppercase tracking-wider">Overall Focus Rating</div>
                    <div className="text-display-lg font-headline-xl text-primary leading-none">A+</div>
                  </div>
                </div>
"""

# Replace the start of the archetype page
content = content.replace(
    '<div className="flex items-center gap-3 mb-6">\n                  <span className="material-symbols-outlined text-primary text-[24px]">military_tech</span>\n                  <h1 className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight">DIGITAL TWIN</h1>\n                </div>',
    profile_header
)

# Rename the section comment
content = content.replace(
    '{/* --- ARCHETYPE PAGE --- */}',
    '{/* --- PROFILE / ARCHETYPE PAGE --- */}'
)

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
    
print("Updated App.tsx sizing and profile page.")
