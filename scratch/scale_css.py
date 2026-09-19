import re

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.css", "r", encoding="utf-8") as f:
    content = f.read()

# Replace font sizes in App.css to be smaller
replacements = [
    (r"--text-display-lg: 56px;", r"--text-display-lg: 40px;"),
    (r"--text-display-lg--line-height: 64px;", r"--text-display-lg--line-height: 48px;"),
    
    (r"--text-headline-xl: 40px;", r"--text-headline-xl: 28px;"),
    (r"--text-headline-xl--line-height: 48px;", r"--text-headline-xl--line-height: 36px;"),
    
    (r"--text-headline-lg: 32px;", r"--text-headline-lg: 24px;"),
    (r"--text-headline-lg--line-height: 40px;", r"--text-headline-lg--line-height: 32px;"),
    
    (r"--text-headline-md: 24px;", r"--text-headline-md: 20px;"),
    (r"--text-headline-md--line-height: 32px;", r"--text-headline-md--line-height: 28px;"),
    
    (r"--text-headline-sm: 20px;", r"--text-headline-sm: 16px;"),
    (r"--text-headline-sm--line-height: 28px;", r"--text-headline-sm--line-height: 24px;"),
    
    (r"--text-telemetry-lg: 18px;", r"--text-telemetry-lg: 15px;"),
    (r"--text-telemetry-lg--line-height: 24px;", r"--text-telemetry-lg--line-height: 20px;"),
    
    (r"--text-body-md: 14px;", r"--text-body-md: 13px;"),
    (r"--text-body-md--line-height: 22px;", r"--text-body-md--line-height: 20px;"),
    
    (r"--text-label-md: 12px;", r"--text-label-md: 11px;"),
    (r"--text-label-md--line-height: 16px;", r"--text-label-md--line-height: 14px;")
]

new_content = content
for old, new in replacements:
    new_content = new_content.replace(old, new)

with open(r"c:\Users\priychan\.gemini\antigravity-ide\scratch\tilt\src\App.css", "w", encoding="utf-8") as f:
    f.write(new_content)
    
print("Updated App.css fonts.")
